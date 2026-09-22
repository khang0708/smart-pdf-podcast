import os
import numpy as np
import soundfile as sf
import audioop
import pydub
import imageio_ffmpeg

pydub.AudioSegment.converter = imageio_ffmpeg.get_ffmpeg_exe()

ASSETS_DIR = os.path.join(os.path.dirname(__file__), "assets")
os.makedirs(ASSETS_DIR, exist_ok=True)
SAMPLE_RATE = 44100

def create_bell_note(freq: float, duration: float, volume: float = 0.5) -> np.ndarray:
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), endpoint=False)
    # Bell harmonics: fundamental (1.0), octave + 3rd (2.76), second octave (5.40)
    harmonics = [
        (1.0 * freq, 1.0, 3.5),    # Freq, amplitude, decay rate
        (2.76 * freq, 0.4, 5.0),
        (4.07 * freq, 0.25, 7.0),
        (5.40 * freq, 0.15, 9.0),
    ]
    signal = np.zeros_like(t)
    for f, amp, decay in harmonics:
        env = np.exp(-decay * t)
        signal += amp * np.sin(2 * np.pi * f * t) * env
        
    signal = signal / np.max(np.abs(signal) + 1e-7) * volume
    return signal

def generate_intro_jingle():
    output_path = os.path.join(ASSETS_DIR, "intro_jingle.wav")
    total_sec = 4.2
    total_samples = int(SAMPLE_RATE * total_sec)
    audio = np.zeros(total_samples, dtype=np.float32)

    # Arpeggio Cmaj9: C5 (523.25), E5 (659.25), G5 (783.99), B5 (987.77), D6 (1174.66)
    notes = [
        (0.00, 523.25, 0.35),
        (0.25, 659.25, 0.35),
        (0.50, 783.99, 0.40),
        (0.75, 987.77, 0.40),
        (1.00, 1174.66, 0.45),
    ]

    for start_t, freq, vol in notes:
        start_idx = int(start_t * SAMPLE_RATE)
        dur = total_sec - start_t
        note_audio = create_bell_note(freq, dur, vol)
        end_idx = min(start_idx + len(note_audio), total_samples)
        audio[start_idx:end_idx] += note_audio[:end_idx - start_idx]

    # Stereo widening
    left = audio
    right = np.roll(audio, int(SAMPLE_RATE * 0.015))  # 15ms Haas effect
    stereo = np.column_stack((left, right))
    # Soft normalize
    stereo = stereo / np.max(np.abs(stereo) + 1e-7) * 0.85
    sf.write(output_path, stereo, SAMPLE_RATE, subtype='PCM_16')
    print(f"Generated: {output_path}")

def generate_chapter_transition():
    output_path = os.path.join(ASSETS_DIR, "chapter_transition.wav")
    total_sec = 2.0
    total_samples = int(SAMPLE_RATE * total_sec)
    audio = np.zeros(total_samples, dtype=np.float32)

    # Two-note gentle chime: G4 (392Hz) -> D5 (587.33Hz)
    notes = [
        (0.00, 392.00, 0.4),
        (0.35, 587.33, 0.5)
    ]
    for start_t, freq, vol in notes:
        start_idx = int(start_t * SAMPLE_RATE)
        dur = total_sec - start_t
        note_audio = create_bell_note(freq, dur, vol)
        end_idx = min(start_idx + len(note_audio), total_samples)
        audio[start_idx:end_idx] += note_audio[:end_idx - start_idx]

    left = audio
    right = np.roll(audio, int(SAMPLE_RATE * 0.012))
    stereo = np.column_stack((left, right))
    stereo = stereo / np.max(np.abs(stereo) + 1e-7) * 0.8
    sf.write(output_path, stereo, SAMPLE_RATE, subtype='PCM_16')
    print(f"Generated: {output_path}")

def generate_ambient_bgm():
    output_wav = os.path.join(ASSETS_DIR, "ambient_bgm.wav")
    output_mp3 = os.path.join(ASSETS_DIR, "ambient_bgm.mp3")
    total_sec = 25.0
    t = np.linspace(0, total_sec, int(SAMPLE_RATE * total_sec), endpoint=False)

    # Warm meditative chord pad: C3 (130.81), G3 (196.00), C4 (261.63), E4 (329.63)
    # With slow LFO breathing filter (0.1 Hz)
    lfo = (1 + 0.3 * np.sin(2 * np.pi * 0.08 * t))
    pad = (
        0.35 * np.sin(2 * np.pi * 130.81 * t) +
        0.25 * np.sin(2 * np.pi * 196.00 * t) +
        0.20 * np.sin(2 * np.pi * 261.63 * t) +
        0.15 * np.sin(2 * np.pi * 329.63 * t)
    ) * lfo

    # Smooth loop envelope (fade in at start, fade out at end)
    fade_len = int(SAMPLE_RATE * 2.0)
    fade_in = np.linspace(0, 1, fade_len)
    fade_out = np.linspace(1, 0, fade_len)
    env = np.ones_like(t)
    env[:fade_len] = fade_in
    env[-fade_len:] = fade_out

    left = pad * env * 0.22
    right = np.roll(pad * env * 0.22, int(SAMPLE_RATE * 0.03))
    stereo = np.column_stack((left, right))

    sf.write(output_wav, stereo, SAMPLE_RATE, subtype='PCM_16')
    print(f"Generated: {output_wav}")

    # Convert to MP3
    seg = pydub.AudioSegment.from_wav(output_wav)
    seg.export(output_mp3, format="mp3", bitrate="192k")
    print(f"Generated: {output_mp3}")

if __name__ == "__main__":
    generate_intro_jingle()
    generate_chapter_transition()
    generate_ambient_bgm()
    print("All sample audio assets successfully created in", ASSETS_DIR)
