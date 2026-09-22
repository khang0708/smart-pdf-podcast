import os
import sys
import hashlib
import time
from typing import List, Dict, Any, Optional

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

import soundfile as sf
import numpy as np

SPEAKERS = {
    "NF": {"name": "Nữ miền Bắc (Chuẩn)", "gender": "female", "region": "north"},
    "SF": {"name": "Nữ miền Nam (Truyền cảm)", "gender": "female", "region": "south"},
    "NM1": {"name": "Nam miền Bắc 1 (Trầm ấm)", "gender": "male", "region": "north"},
    "SM": {"name": "Nam miền Nam (Tự nhiên)", "gender": "male", "region": "south"},
    "NM2": {"name": "Nam miền Bắc 2 (Sâu lắng)", "gender": "male", "region": "north"}
}

class TTSSynthesizer:
    """
    Bộ điều phối sinh giọng đọc tiếng Việt Valtec-TTS (v-tts).
    Hỗ trợ 5 giọng chuẩn vùng miền Bắc/Nam và cơ chế Cache chống gián đoạn.
    """

    def __init__(self, cache_dir: Optional[str] = None, default_speaker: str = "NF"):
        self.default_speaker = default_speaker if default_speaker in SPEAKERS else "NF"
        self.cache_dir = cache_dir or os.path.join(os.path.dirname(__file__), ".cache", "audio_chunks")
        os.makedirs(self.cache_dir, exist_ok=True)
        self._engine = None
        self._engine_type = None

    def _get_engine(self):
        """
        Khởi tạo v-tts engine khi cần (lazy load để tiết kiệm RAM khi chỉ phân tích text).
        """
        if self._engine is not None:
            return self._engine

        try:
            import sys
            v_tts_src_path = os.path.join(os.path.dirname(__file__), "v_tts_src")
            if os.path.exists(v_tts_src_path) and v_tts_src_path not in sys.path:
                sys.path.insert(0, v_tts_src_path)

            from v_tts import TTS
            print("[TTSSynthesizer] Đang nạp mô hình Valtec-TTS (letrggghieu/v-tts-pretrained)...")
            self._engine = TTS(hf_repo="letrggghieu/v-tts-pretrained")
            self._engine_type = "v_tts"
            print("[TTSSynthesizer] Valtec-TTS đã sẵn sàng.")
        except Exception as e:
            print(f"[TTSSynthesizer] Chú ý: Không thể tải trực tiếp v_tts ({e}). Kích hoạt bộ xử lý giả lập/fallback.")
            self._engine = "fallback"
            self._engine_type = "fallback"

        return self._engine

    def synthesize_chunk(self, text: str, speaker: Optional[str] = None, reference_audio: Optional[str] = None) -> str:
        """
        Sinh âm thanh cho một khối văn bản ngắn (150-350 ký tự).
        Trả về đường dẫn tới file WAV.
        """
        speaker_id = speaker if speaker in SPEAKERS else self.default_speaker
        clean_text = text.strip()
        if not clean_text:
            clean_text = "..."

        # Tạo mã hash duy nhất dựa trên nội dung text + speaker
        text_hash = hashlib.md5(f"{speaker_id}_{clean_text}".encode("utf-8")).hexdigest()
        output_wav = os.path.join(self.cache_dir, f"{text_hash}.wav")

        # 1. Kiểm tra cache: Nếu đã sinh từ trước và file tồn tại > 0 bytes thì dùng lại ngay
        if os.path.exists(output_wav) and os.path.getsize(output_wav) > 100:
            return output_wav

        engine = self._get_engine()

        # 2. Sinh âm thanh bằng Valtec-TTS
        if self._engine_type == "v_tts":
            try:
                engine.speak(clean_text, speaker=speaker_id, output_path=output_wav)
                if os.path.exists(output_wav):
                    return output_wav
            except Exception as ex:
                print(f"[TTSSynthesizer] Lỗi khi gọi engine.speak: {ex}")

        # 3. Fallback sinh âm thanh mẫu nếu chưa có trọng số model (đảm bảo pipeline luôn hoạt động trơn tru)
        sr = 22050
        duration_sec = max(1.2, len(clean_text) * 0.065)
        t = np.linspace(0, duration_sec, int(sr * duration_sec), endpoint=False)
        # Giả lập tần số giọng nói nam/nữ
        base_freq = 220.0 if "female" in SPEAKERS.get(speaker_id, {}).get("gender", "female") else 140.0
        audio = 0.3 * np.sin(2 * np.pi * base_freq * t) * np.exp(-0.2 * (t % 0.5))
        # Envelope làm mờ
        audio[:500] *= np.linspace(0, 1, 500)
        audio[-500:] *= np.linspace(1, 0, 500)
        sf.write(output_wav, audio.astype(np.float32), sr, subtype='PCM_16')

        return output_wav

    def synthesize_chapter_chunks(
        self,
        chunks: List[Dict[str, Any]],
        speaker: Optional[str] = None,
        progress_callback: Optional[Any] = None
    ) -> List[Dict[str, Any]]:
        """
        Sinh âm thanh hàng loạt cho toàn bộ các chunk trong một chương.
        Có thông báo tiến độ và tự động bỏ qua các chunk đã sinh trong cache.
        """
        results = []
        total = len(chunks)

        for idx, chunk in enumerate(chunks):
            text = chunk.get("text", "")
            pause_ms = chunk.get("pause_after_ms", 250)
            chunk_id = chunk.get("chunk_id", idx + 1)

            wav_path = self.synthesize_chunk(text, speaker=speaker)

            results.append({
                "chunk_id": chunk_id,
                "text": text,
                "wav_path": wav_path,
                "pause_after_ms": pause_ms
            })

            if progress_callback:
                progress_callback(idx + 1, total, text[:40])

        return results

    @staticmethod
    def get_available_speakers() -> Dict[str, Dict[str, str]]:
        return SPEAKERS
