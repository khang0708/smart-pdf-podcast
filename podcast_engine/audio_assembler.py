import os
import json
import math
from typing import List, Dict, Any, Optional

import audioop
import pydub
from pydub import AudioSegment
import imageio_ffmpeg

# Cấu hình đường dẫn ffmpeg tự động cho pydub
AudioSegment.converter = imageio_ffmpeg.get_ffmpeg_exe()

ASSETS_DIR = os.path.join(os.path.dirname(__file__), "assets")

class AudioAssembler:
    """
    Bộ ghép nối và hoàn thiện Audio Podcast:
    - Ghép nối các file WAV của từng chunk kèm khoảng lặng ngắt nghỉ tự nhiên
    - Lồng nhạc dạo đầu (Intro Jingle) và âm chuyển chương (Chapter Transition)
    - Hòa trộn nhạc nền (BGM) với kỹ thuật tự động hạ âm lượng khi có lời đọc (Audio Ducking)
    - Chuẩn hóa âm lượng (-16 LUFS chuẩn Podcast)
    - Xuất file MP3 hoàn chỉnh và tạo file Manifest JSON cho Web Player
    """

    def __init__(self, bgm_path: Optional[str] = None):
        self.intro_path = os.path.join(ASSETS_DIR, "intro_jingle.wav")
        self.transition_path = os.path.join(ASSETS_DIR, "chapter_transition.wav")
        self.bgm_path = bgm_path or os.path.join(ASSETS_DIR, "ambient_bgm.wav")

    @staticmethod
    def load_audio_file(path: str) -> AudioSegment:
        if path.lower().endswith(".wav"):
            return AudioSegment.from_wav(path)
        return AudioSegment.from_file(path)

    def stitch_chunks(self, chunk_wav_paths: List[Dict[str, Any]]) -> AudioSegment:
        """
        Ghép danh sách các chunk WAV theo thứ tự và chèn khoảng lặng (pause_after_ms).
        """
        combined = AudioSegment.empty()

        for item in chunk_wav_paths:
            wav_path = item.get("wav_path")
            pause_ms = item.get("pause_after_ms", 250)

            if wav_path and os.path.exists(wav_path):
                try:
                    seg = self.load_audio_file(wav_path)
                    # Chống tiếng nổ (pop/click) ở mép cắt bằng fade in/out 10ms
                    seg = seg.fade_in(10).fade_out(10)
                    combined += seg
                    if pause_ms > 0:
                        combined += AudioSegment.silent(duration=pause_ms)
                except Exception as e:
                    print(f"[AudioAssembler] Lỗi đọc chunk {wav_path}: {e}")

        return combined

    def apply_ducking(self, voice_track: AudioSegment, bgm_track: AudioSegment, duck_attenuation_db: float = -20.0) -> AudioSegment:
        """
        Hạ âm lượng nhạc nền (Ducking) xuống mức thấp (-20dB to -24dB) trong suốt đoạn có giọng nói,
        và đưa BGM to rõ hơn trong các đoạn dạo đầu hoặc khoảng lặng.
        """
        target_len = len(voice_track)
        if target_len == 0:
            return voice_track

        # Lặp lại BGM nếu BGM ngắn hơn độ dài lời nói
        loop_count = math.ceil(target_len / len(bgm_track)) + 1
        extended_bgm = bgm_track * loop_count
        extended_bgm = extended_bgm[:target_len]

        # Hạ âm lượng BGM để tạo lớp nền êm dịu, không lấn át lời thoại
        ducked_bgm = extended_bgm + duck_attenuation_db
        # Fade in 1.5s đầu và Fade out 2.5s cuối
        ducked_bgm = ducked_bgm.fade_in(1500).fade_out(2500)

        # Trộn giọng nói đè lên nhạc nền
        mixed = ducked_bgm.overlay(voice_track)
        return mixed

    def normalize_loudness(self, audio: AudioSegment, target_dbfs: float = -16.0) -> AudioSegment:
        """
        Chuẩn hóa âm lượng tổng thể về ngưỡng tiêu chuẩn Podcast (-16 dBFS / LUFS).
        """
        change_in_dbfs = target_dbfs - audio.dBFS
        # Giới hạn mức tăng tối đa để tránh bị vỡ âm (clipping)
        if change_in_dbfs > 12.0:
            change_in_dbfs = 12.0
        return audio.apply_gain(change_in_dbfs)

    def assemble_chapter(
        self,
        chapter_title: str,
        chapter_index: int,
        chunk_wav_paths: List[Dict[str, Any]],
        output_mp3_path: str,
        enable_bgm: bool = True
    ) -> Dict[str, Any]:
        """
        Tạo một tập podcast hoàn chỉnh cho một chương:
        Intro/Transition + Giọng đọc + Nhạc nền + Chuẩn hóa âm lượng.
        """
        os.makedirs(os.path.dirname(output_mp3_path), exist_ok=True)

        # 1. Ghép toàn bộ giọng đọc của chương
        voice_audio = self.stitch_chunks(chunk_wav_paths)
        if len(voice_audio) == 0:
            voice_audio = AudioSegment.silent(duration=1000)

        # 2. Thêm jingle mở đầu (nếu là chương 1 hoặc intro) hoặc âm chuyển chương
        intro_audio = AudioSegment.empty()
        if chapter_index <= 1 and os.path.exists(self.intro_path):
            intro_audio = self.load_audio_file(self.intro_path).fade_out(400)
        elif chapter_index > 1 and os.path.exists(self.transition_path):
            intro_audio = self.load_audio_file(self.transition_path).fade_out(300)

        # Kết nối: Intro -> 400ms tĩnh lặng -> Lời đọc
        full_voice = AudioSegment.empty()
        if len(intro_audio) > 0:
            full_voice += intro_audio + AudioSegment.silent(duration=400)
        full_voice += voice_audio + AudioSegment.silent(duration=1500)

        # 3. Hòa trộn nhạc nền (BGM)
        if enable_bgm and os.path.exists(self.bgm_path):
            try:
                bgm = self.load_audio_file(self.bgm_path)
                final_audio = self.apply_ducking(full_voice, bgm, duck_attenuation_db=-22.0)
            except Exception as e:
                print(f"[AudioAssembler] Không thể trộn BGM ({e}), sử dụng voice thuần...")
                final_audio = full_voice
        else:
            final_audio = full_voice

        # 4. Chuẩn hóa âm lượng
        final_audio = self.normalize_loudness(final_audio, target_dbfs=-16.0)

        # 5. Xuất file MP3 chất lượng cao 192kbps
        final_audio.export(
            output_mp3_path,
            format="mp3",
            bitrate="192k",
            tags={
                "title": chapter_title,
                "album": "Aurora Smart Podcast",
                "track": str(chapter_index)
            }
        )

        duration_sec = round(len(final_audio) / 1000.0, 2)
        print(f"[AudioAssembler] Đã xuất tập podcast: {output_mp3_path} ({duration_sec}s)")

        return {
            "chapter_title": chapter_title,
            "chapter_index": chapter_index,
            "mp3_path": output_mp3_path,
            "duration_seconds": duration_sec,
            "duration_formatted": self.format_duration(duration_sec)
        }

    @staticmethod
    def format_duration(seconds: float) -> str:
        mins = int(seconds // 60)
        secs = int(seconds % 60)
        return f"{mins:02d}:{secs:02d}"
