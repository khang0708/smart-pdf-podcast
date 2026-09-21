import { loadSyncConfig } from './supabaseClient';

declare global {
  interface Window {
    google?: any;
    gapi?: any;
  }
}

export interface DrivePickedResult {
  fileId: string;
  name: string;
  arrayBuffer: ArrayBuffer;
  sizeBytes: number;
}

class GoogleDriveServiceClass {
  private gapiLoaded: boolean = false;
  private gisLoaded: boolean = false;
  private tokenClient: any = null;
  private accessToken: string | null = null;

  /**
   * Extract Google Drive File ID from various share link formats
   */
  public extractFileIdFromUrl(url: string): string | null {
    if (!url) return null;
    const cleanUrl = url.trim();

    // Format: https://drive.google.com/file/d/FILE_ID/view...
    const match1 = cleanUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match1 && match1[1]) return match1[1];

    // Format: https://drive.google.com/open?id=FILE_ID or uc?id=FILE_ID
    const match2 = cleanUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match2 && match2[1]) return match2[1];

    // Format: bare file ID if user pasted raw ID
    if (/^[a-zA-Z0-9_-]{25,}$/.test(cleanUrl)) {
      return cleanUrl;
    }

    return null;
  }

  /**
   * Load Google API and Google Identity Services scripts dynamically
   */
  public async loadGoogleLibraries(): Promise<boolean> {
    if (this.gapiLoaded && this.gisLoaded) return true;

    const loadScript = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve();
          return;
        }
        const s = document.createElement('script');
        s.src = src;
        s.async = true;
        s.defer = true;
        s.onload = () => resolve();
        s.onerror = (e) => reject(e);
        document.body.appendChild(s);
      });
    };

    try {
      await Promise.all([
        loadScript('https://apis.google.com/js/api.js'),
        loadScript('https://accounts.google.com/gsi/client'),
      ]);

      await new Promise<void>((resolve) => {
        if (window.gapi) {
          window.gapi.load('picker', () => {
            this.gapiLoaded = true;
            resolve();
          });
        } else {
          resolve();
        }
      });

      this.gisLoaded = !!window.google?.accounts?.oauth2;
      return true;
    } catch (e) {
      console.warn('Could not load Google libraries:', e);
      return false;
    }
  }

  /**
   * Request OAuth access token using Google Identity Services
   */
  public async requestAccessToken(clientId: string): Promise<string> {
    if (this.accessToken) return this.accessToken;

    await this.loadGoogleLibraries();

    if (!window.google?.accounts?.oauth2) {
      throw new Error('Google Identity Services chưa tải xong. Vui lòng thử lại.');
    }

    return new Promise((resolve, reject) => {
      try {
        this.tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file',
          callback: (response: any) => {
            if (response.error !== undefined) {
              reject(new Error(`Google OAuth error: ${response.error}`));
              return;
            }
            this.accessToken = response.access_token;
            resolve(response.access_token);
          },
        });

        this.tokenClient.requestAccessToken({ prompt: 'consent' });
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Open Google Drive Picker modal allowing user to choose a PDF file
   */
  public async openPicker(clientId: string, apiKey: string): Promise<DrivePickedResult> {
    await this.loadGoogleLibraries();

    const token = await this.requestAccessToken(clientId);

    if (!window.google?.picker) {
      throw new Error('Google Picker API không khả dụng.');
    }

    return new Promise((resolve, reject) => {
      try {
        const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS)
          .setMimeTypes('application/pdf')
          .setMode(window.google.picker.DocsViewMode.LIST);

        let builder = new window.google.picker.PickerBuilder()
          .addView(view)
          .setOAuthToken(token)
          .setTitle('Chọn tệp PDF từ Google Drive của bạn')
          .setCallback(async (data: any) => {
            if (data.action === window.google.picker.Action.PICKED) {
              const doc = data.docs[0];
              const fileId = doc.id;
              const fileName = doc.name || 'Tai_lieu_Drive.pdf';

              try {
                const arrayBuffer = await this.downloadFileWithToken(fileId, token);
                resolve({
                  fileId,
                  name: fileName,
                  arrayBuffer,
                  sizeBytes: arrayBuffer.byteLength,
                });
              } catch (downloadErr) {
                reject(downloadErr);
              }
            } else if (data.action === window.google.picker.Action.CANCEL) {
              reject(new Error('Người dùng đã hủy chọn file Google Drive.'));
            }
          });

        if (apiKey) {
          builder = builder.setDeveloperKey(apiKey);
        }

        const picker = builder.build();
        picker.setVisible(true);
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Download file binary using Google Drive API v3
   */
  public async downloadFileWithToken(fileId: string, token: string): Promise<ArrayBuffer> {
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const res = await fetch(downloadUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Tải tệp từ Google Drive thất bại: HTTP ${res.status} ${res.statusText}`);
    }

    return await res.arrayBuffer();
  }

  /**
   * Download file directly using public Google Drive share URL / ID
   */
  public async downloadFromPublicUrl(urlOrId: string): Promise<{ arrayBuffer: ArrayBuffer; name: string }> {
    const fileId = this.extractFileIdFromUrl(urlOrId);
    if (!fileId) {
      throw new Error('Liên kết Google Drive không hợp lệ hoặc không trích xuất được ID tệp.');
    }

    const config = loadSyncConfig();
    const apiKey = config.googleApiKey?.trim() || '';

    // If an API key is available, we can fetch metadata and content cleanly
    if (apiKey) {
      try {
        // Fetch metadata to get file name
        const metaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?key=${apiKey}&fields=name,mimeType`);
        let fileName = 'Google_Drive_Book.pdf';
        if (metaRes.ok) {
          const meta = await metaRes.json();
          if (meta.name) fileName = meta.name;
        }

        // Fetch binary
        const contentRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`);
        if (contentRes.ok) {
          const buffer = await contentRes.arrayBuffer();
          return { arrayBuffer: buffer, name: fileName };
        }
      } catch (e) {
        console.warn('API key download failed, attempting standard direct download...', e);
      }
    }

    // Direct Google Drive download URL (public files)
    const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    try {
      const response = await fetch(directUrl);
      if (!response.ok) {
        throw new Error(`Không thể tải file: HTTP ${response.status}`);
      }

      // Check content type
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        // Large Google Drive files show virus scan warning HTML page
        throw new Error(
          'Tệp này yêu cầu xác nhận quét virus của Google Drive hoặc tệp không được công khai (Anyone with link). Vui lòng sử dụng tính năng "Chọn từ Drive (Google Picker)" hoặc đảm bảo file được chia sẻ Công khai.'
        );
      }

      const buffer = await response.arrayBuffer();
      return {
        arrayBuffer: buffer,
        name: `Google_Drive_${fileId.substring(0, 8)}.pdf`,
      };
    } catch (err: any) {
      throw new Error(err?.message || 'Không thể tải trực tiếp từ Google Drive.');
    }
  }
}

export const googleDriveService = new GoogleDriveServiceClass();
