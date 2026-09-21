import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SyncConfig } from '../types';

const CONFIG_STORAGE_KEY = 'smart_pdf_cloud_config';

export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  supabaseUrl: (import.meta.env.VITE_SUPABASE_URL as string) || '',
  supabaseAnonKey: (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '',
  syncRoomId: '',
  googleClientId: (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || '',
  googleApiKey: (import.meta.env.VITE_GOOGLE_API_KEY as string) || '',
  autoSync: true,
  syncPdfFiles: true,
};

let cachedClient: SupabaseClient | null = null;
let currentConfig: SyncConfig = loadSyncConfig();

export function loadSyncConfig(): SyncConfig {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_SYNC_CONFIG,
        ...parsed,
      };
    }
  } catch (e) {
    console.warn('Could not parse sync config from localStorage:', e);
  }
  return { ...DEFAULT_SYNC_CONFIG };
}

export function saveSyncConfig(config: Partial<SyncConfig>): SyncConfig {
  const updated: SyncConfig = {
    ...currentConfig,
    ...config,
  };
  currentConfig = updated;
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Could not save sync config to localStorage:', e);
  }
  // Reset client so it recreates with updated URL/key
  cachedClient = null;
  return updated;
}

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;

  const url = currentConfig.supabaseUrl.trim();
  const key = currentConfig.supabaseAnonKey.trim();

  if (!url || !key) {
    return null;
  }

  try {
    cachedClient = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

export async function testSupabaseConnection(config?: SyncConfig): Promise<{ success: boolean; message: string }> {
  const targetConfig = config || currentConfig;
  const url = targetConfig.supabaseUrl.trim();
  const key = targetConfig.supabaseAnonKey.trim();

  if (!url || !key) {
    return { success: false, message: 'Vui lòng nhập đầy đủ Supabase URL và Anon Key.' };
  }

  try {
    const client = createClient(url, key);
    const { error } = await client.from('books').select('id').limit(1);
    if (error && error.code !== 'PGRST116') {
      // PGRST116 is just row count / single row query code
      return { success: false, message: `Lỗi kết nối CSDL: ${error.message}` };
    }
    return { success: true, message: 'Kết nối CSDL Supabase thành công!' };
  } catch (err: any) {
    return { success: false, message: `Không thể kết nối đến Supabase: ${err?.message || err}` };
  }
}
