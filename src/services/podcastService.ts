export interface Speaker {
  id: string;
  name: string;
  gender: 'female' | 'male';
  region: 'north' | 'south';
  is_default?: boolean;
}

export interface ChapterTrack {
  chapter_index: number;
  title: string;
  audio_url: string;
  mp3_file: string;
  duration_seconds: number;
  duration_formatted: string;
  total_chunks: number;
}

export interface PodcastManifest {
  book_id: string;
  title: string;
  author: string;
  speaker: string;
  speaker_info?: {
    name: string;
    gender: string;
    region: string;
  };
  total_chapters: number;
  total_duration_seconds: number;
  total_duration_formatted: string;
  chapters: ChapterTrack[];
  created_at: number;
}

export interface JobStatus {
  job_id: string;
  book_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  percent: number;
  stage: string;
  message: string;
  manifest?: PodcastManifest;
  error?: string;
}

export const getPodcastApiBase = (): string => {
  const envUrl = (import.meta as any).env?.VITE_PODCAST_API_URL;
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }
  return 'http://127.0.0.1:8765';
};

export const resolveAudioUrl = (url: string): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const base = getPodcastApiBase();
  if (base && !base.includes('127.0.0.1') && !base.includes('localhost')) {
    return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
  }
  return url;
};

class PodcastService {
  private workerOnline: boolean | null = null;

  async isWorkerOnline(): Promise<boolean> {
    try {
      const res = await fetch(`${getPodcastApiBase()}/api/health`, { method: 'GET' });
      const data = await res.json();
      this.workerOnline = data.status === 'healthy';
      return this.workerOnline;
    } catch {
      this.workerOnline = false;
      return false;
    }
  }

  async getSpeakers(): Promise<Speaker[]> {
    try {
      const res = await fetch(`${getPodcastApiBase()}/api/speakers`);
      if (!res.ok) throw new Error('Failed to load speakers');
      return await res.json();
    } catch {
      return [
        { id: 'NF', name: 'Nữ miền Bắc (Chuẩn)', gender: 'female', region: 'north', is_default: true },
        { id: 'SF', name: 'Nữ miền Nam (Truyền cảm)', gender: 'female', region: 'south' },
        { id: 'NM1', name: 'Nam miền Bắc 1 (Trầm ấm)', gender: 'male', region: 'north' },
        { id: 'SM', name: 'Nam miền Nam (Tự nhiên)', gender: 'male', region: 'south' },
        { id: 'NM2', name: 'Nam miền Bắc 2 (Sâu lắng)', gender: 'male', region: 'north' },
      ];
    }
  }

  async startConversion(
    file: File | null,
    bookId: string,
    speaker: string = 'NF',
    enableBgm: boolean = true
  ): Promise<{ job_id: string; book_id: string }> {
    const formData = new FormData();
    if (file) {
      formData.append('file', file);
    }
    formData.append('book_id', bookId);
    formData.append('speaker', speaker);
    formData.append('enable_bgm', String(enableBgm));

    const res = await fetch(`${getPodcastApiBase()}/api/convert`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Lỗi khởi tạo' }));
      throw new Error(err.detail || 'Không thể bắt đầu chuyển đổi');
    }

    return await res.json();
  }

  async getJobStatus(jobId: string): Promise<JobStatus> {
    const res = await fetch(`${getPodcastApiBase()}/api/status/${jobId}`);
    if (!res.ok) throw new Error('Không tìm thấy trạng thái');
    return await res.json();
  }

  async getManifest(bookId: string): Promise<PodcastManifest | null> {
    try {
      // 1. Thử tải trực tiếp từ Vite public static folder trước
      const staticRes = await fetch(`/podcasts/${bookId}/podcast_manifest.json`);
      if (staticRes.ok) {
        return await staticRes.json();
      }

      // 2. Thử tải qua FastAPI worker
      const apiRes = await fetch(`${getPodcastApiBase()}/api/podcasts/${bookId}`);
      if (apiRes.ok) {
        return await apiRes.json();
      }
      return null;
    } catch {
      return null;
    }
  }

  async pollUntilComplete(
    jobId: string,
    onProgress: (status: JobStatus) => void,
    intervalMs: number = 1000
  ): Promise<PodcastManifest> {
    return new Promise((resolve, reject) => {
      const timer = setInterval(async () => {
        try {
          const status = await this.getJobStatus(jobId);
          onProgress(status);

          if (status.status === 'completed' && status.manifest) {
            clearInterval(timer);
            resolve(status.manifest);
          } else if (status.status === 'failed') {
            clearInterval(timer);
            reject(new Error(status.error || 'Quá trình sinh podcast thất bại'));
          }
        } catch (err) {
          clearInterval(timer);
          reject(err);
        }
      }, intervalMs);
    });
  }
}

export const podcastService = new PodcastService();
