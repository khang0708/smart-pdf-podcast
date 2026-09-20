import { TTSState } from '../types';
import { SemanticSegmenter } from './semanticSegmenter';

type TTSCallback = {
  onSentenceStart?: (index: number, text: string) => void;
  onPageEnd?: () => void;
  onStateChange?: (state: TTSState) => void;
};

class TTSService {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private audioPlayer: HTMLAudioElement | null = null;
  
  private sentences: string[] = [];
  private currentIndex: number = 0;
  private currentPage: number = 1;
  private totalPages: number = 1;
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  private rate: number = 1.0;
  private pitch: number = 1.0;
  private selectedVoiceURI: string | null = null;
  private engineMode: 'ai_natural' | 'system' = 'ai_natural';
  private continuousBookMode: boolean = true;
  private callbacks: TTSCallback = {};
  
  // Watchdog timer to fix Chrome 15s speech timeout bug
  private keepAliveInterval: any = null;
  
  // Sleep Timer
  private sleepTimerId: any = null;
  private sleepCountdownInterval: any = null;
  private sleepTimerMinutes: number | null = null;
  private sleepTimerRemainingSeconds: number | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      if ('speechSynthesis' in window) {
        this.synth = window.speechSynthesis;
        if (this.synth.onvoiceschanged !== undefined) {
          this.synth.onvoiceschanged = () => {
            this.autoSelectVoice();
          };
        }
      }
      this.audioPlayer = new Audio();
      this.audioPlayer.playbackRate = this.rate;

      this.audioPlayer.onended = () => {
        if (this.isPlaying && !this.isPaused) {
          this.handleSentenceFinished();
        }
      };

      this.audioPlayer.onerror = (e) => {
        console.warn('AI Audio stream error, falling back to system speech:', e);
        // Seamless fallback to system voice if network error
        this.speakWithSystemSynthesis(this.sentences[this.currentIndex]);
      };
    }
  }

  public initCallbacks(cb: TTSCallback) {
    this.callbacks = cb;
  }

  public getVoices(): SpeechSynthesisVoice[] {
    if (!this.synth) return [];
    return this.synth.getVoices();
  }

  public autoSelectVoice(langPrefix: string = 'vi'): SpeechSynthesisVoice | null {
    const voices = this.getVoices();
    if (!voices || voices.length === 0) return null;

    // Prioritize high-quality Vietnamese voices: Google Tiếng Việt, Microsoft HoaiMy/NamMinh, Apple Linh/An
    const viVoices = voices.filter(v => v.lang.toLowerCase().startsWith('vi') || v.lang.includes('VIE'));
    const preferredVi = viVoices.find(v => 
      v.name.includes('Google') || 
      v.name.includes('Linh') || 
      v.name.includes('An') || 
      v.name.includes('HoaiMy') || 
      v.name.includes('NamMinh') ||
      v.name.includes('Natural')
    ) || viVoices[0];

    if (preferredVi) {
      this.selectedVoiceURI = preferredVi.voiceURI;
      return preferredVi;
    }

    // Fallback: natural English or default
    const defaultVoice = voices.find(v => v.default) || voices.find(v => v.lang.startsWith('en')) || voices[0];
    if (defaultVoice) {
      this.selectedVoiceURI = defaultVoice.voiceURI;
      return defaultVoice;
    }

    return null;
  }

  public setVoice(voiceURI: string) {
    this.selectedVoiceURI = voiceURI;
    this.notifyState();
  }

  public setEngineMode(mode: 'ai_natural' | 'system') {
    this.engineMode = mode;
    if (this.isPlaying && !this.isPaused) {
      this.speakCurrentSentence();
    } else {
      this.notifyState();
    }
  }

  public toggleContinuousBookMode() {
    this.continuousBookMode = !this.continuousBookMode;
    this.notifyState();
  }

  public setRate(newRate: number) {
    this.rate = Math.max(0.5, Math.min(2.5, newRate));
    if (this.audioPlayer) {
      this.audioPlayer.playbackRate = this.rate;
    }
    if (this.isPlaying && !this.isPaused) {
      this.speakCurrentSentence();
    } else {
      this.notifyState();
    }
  }

  public setPitch(newPitch: number) {
    this.pitch = Math.max(0.5, Math.min(1.8, newPitch));
    if (this.isPlaying && !this.isPaused) {
      this.speakCurrentSentence();
    } else {
      this.notifyState();
    }
  }

  public startPlayback(
    sentences: string[],
    page: number,
    totalPages: number,
    startIndex: number = 0,
    rate?: number
  ) {
    this.stopPlayback();
    this.sentences = sentences;
    this.currentPage = page;
    this.totalPages = totalPages;
    this.currentIndex = Math.max(0, Math.min(startIndex, sentences.length - 1));
    if (rate) {
      this.rate = rate;
      if (this.audioPlayer) this.audioPlayer.playbackRate = this.rate;
    }
    this.isPlaying = true;
    this.isPaused = false;

    this.startWatchdog();
    this.speakCurrentSentence();
  }

  private speakCurrentSentence() {
    if (this.currentIndex >= this.sentences.length) {
      this.handlePageEnd();
      return;
    }

    const rawText = this.sentences[this.currentIndex];
    const cleanText = SemanticSegmenter.prepareForSpeech(rawText);

    if (!cleanText || cleanText.trim().length === 0) {
      this.handleSentenceFinished();
      return;
    }

    this.callbacks.onSentenceStart?.(this.currentIndex, cleanText);
    this.notifyState();

    if (this.engineMode === 'ai_natural') {
      this.speakWithAINatural(cleanText);
    } else {
      this.speakWithSystemSynthesis(cleanText);
    }
  }

  /**
   * Phát âm bằng giọng AI tự nhiên chuẩn phát thanh viên (Online Natural Neural Stream)
   */
  private speakWithAINatural(text: string) {
    if (!this.audioPlayer) {
      this.speakWithSystemSynthesis(text);
      return;
    }

    // Stop previous audio
    this.audioPlayer.pause();
    this.audioPlayer.currentTime = 0;
    if (this.synth) this.synth.cancel();

    // Determine language prefix
    const isVietnamese = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(text);
    const lang = isVietnamese ? 'vi' : 'en';

    // Google Translate Natural Neural Stream
    const encoded = encodeURIComponent(text);
    const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encoded}`;

    this.audioPlayer.src = audioUrl;
    this.audioPlayer.playbackRate = this.rate;
    
    this.audioPlayer.play().catch((err) => {
      console.warn('AI Audio play interrupted or blocked, fallback to system synth:', err);
      this.speakWithSystemSynthesis(text);
    });
  }

  /**
   * Phát âm bằng Web Speech API của thiết bị (Offline mode)
   */
  private speakWithSystemSynthesis(text: string) {
    if (!this.synth) return;
    this.synth.cancel();
    if (this.audioPlayer) this.audioPlayer.pause();

    const utterance = new SpeechSynthesisUtterance(text);
    this.currentUtterance = utterance;
    utterance.rate = this.rate;
    utterance.pitch = this.pitch;

    const voices = this.getVoices();
    let voice = voices.find(v => v.voiceURI === this.selectedVoiceURI);
    if (!voice) {
      voice = this.autoSelectVoice() || undefined;
    }
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onend = () => {
      if (this.isPlaying && !this.isPaused) {
        this.handleSentenceFinished();
      }
    };

    utterance.onerror = (e) => {
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        console.warn('System Speech synthesis error:', e);
        this.handleSentenceFinished();
      }
    };

    this.synth.speak(utterance);
  }

  private handleSentenceFinished() {
    this.currentIndex++;
    if (this.currentIndex < this.sentences.length) {
      this.speakCurrentSentence();
    } else {
      this.handlePageEnd();
    }
  }

  private handlePageEnd() {
    if (this.callbacks.onPageEnd) {
      this.callbacks.onPageEnd();
    } else {
      this.stopPlayback();
    }
  }

  /**
   * Watchdog timer ngăn Chrome/Safari ngắt tiếng sau 15 giây
   */
  private startWatchdog() {
    this.stopWatchdog();
    this.keepAliveInterval = setInterval(() => {
      if (this.isPlaying && !this.isPaused && this.engineMode === 'system' && this.synth) {
        if (this.synth.speaking) {
          this.synth.pause();
          this.synth.resume();
        }
      }
    }, 9000);
  }

  private stopWatchdog() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  public pause() {
    this.isPaused = true;
    if (this.audioPlayer) this.audioPlayer.pause();
    if (this.synth) this.synth.pause();
    this.notifyState();
  }

  public resume() {
    if (this.isPaused) {
      this.isPaused = false;
      if (this.engineMode === 'ai_natural' && this.audioPlayer && this.audioPlayer.src) {
        this.audioPlayer.play().catch(() => this.speakCurrentSentence());
      } else if (this.synth) {
        this.synth.resume();
        if (!this.synth.speaking) {
          this.speakCurrentSentence();
        }
      } else {
        this.speakCurrentSentence();
      }
      this.notifyState();
    } else if (!this.isPlaying && this.sentences.length > 0) {
      this.isPlaying = true;
      this.speakCurrentSentence();
    }
  }

  public togglePlayPause() {
    if (!this.isPlaying) {
      if (this.sentences.length > 0) {
        this.startPlayback(this.sentences, this.currentPage, this.totalPages, this.currentIndex);
      }
    } else if (this.isPaused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  public nextSentence() {
    if (this.currentIndex < this.sentences.length - 1) {
      this.currentIndex++;
      this.speakCurrentSentence();
    } else {
      this.handlePageEnd();
    }
  }

  public prevSentence() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.speakCurrentSentence();
    }
  }

  public seekSentence(index: number) {
    if (index >= 0 && index < this.sentences.length) {
      this.currentIndex = index;
      if (this.isPlaying) {
        this.speakCurrentSentence();
      } else {
        this.notifyState();
      }
    }
  }

  public skipSeconds(seconds: number) {
    const sentenceShift = Math.round(seconds / 3.5);
    const target = Math.max(0, Math.min(this.currentIndex + sentenceShift, this.sentences.length - 1));
    this.seekSentence(target);
  }

  public stopPlayback() {
    this.stopWatchdog();
    if (this.audioPlayer) {
      this.audioPlayer.pause();
      this.audioPlayer.currentTime = 0;
    }
    if (this.synth) {
      this.synth.cancel();
    }
    this.isPlaying = false;
    this.isPaused = false;
    this.currentUtterance = null;
    this.notifyState();
  }

  // --- Sleep Timer ---
  public setSleepTimer(minutes: number | null) {
    if (this.sleepTimerId) clearTimeout(this.sleepTimerId);
    if (this.sleepCountdownInterval) clearInterval(this.sleepCountdownInterval);

    this.sleepTimerMinutes = minutes;
    if (!minutes) {
      this.sleepTimerRemainingSeconds = null;
      this.notifyState();
      return;
    }

    this.sleepTimerRemainingSeconds = minutes * 60;
    this.notifyState();

    this.sleepCountdownInterval = setInterval(() => {
      if (this.sleepTimerRemainingSeconds !== null && this.sleepTimerRemainingSeconds > 0) {
        this.sleepTimerRemainingSeconds--;
        this.notifyState();
      }
    }, 1000);

    this.sleepTimerId = setTimeout(() => {
      this.stopPlayback();
      this.setSleepTimer(null);
    }, minutes * 60 * 1000);
  }

  public getState(): TTSState {
    return {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      currentPage: this.currentPage,
      totalPages: this.totalPages,
      currentSentenceIndex: this.currentIndex,
      sentences: this.sentences,
      rate: this.rate,
      pitch: this.pitch,
      voiceURI: this.selectedVoiceURI,
      engineMode: this.engineMode,
      continuousBookMode: this.continuousBookMode,
      sleepTimerMinutes: this.sleepTimerMinutes,
      sleepTimerRemainingSeconds: this.sleepTimerRemainingSeconds,
    };
  }

  private notifyState() {
    this.callbacks.onStateChange?.(this.getState());
  }
}

export const ttsService = new TTSService();
