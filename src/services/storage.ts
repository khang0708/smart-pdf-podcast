import localforage from 'localforage';
import { Book, Bookmark, ReadingProgress } from '../types';

// Configure localforage stores
const bookMetadataStore = localforage.createInstance({
  name: 'smart_pdf_reader',
  storeName: 'book_metadata'
});

const pdfBinaryStore = localforage.createInstance({
  name: 'smart_pdf_reader',
  storeName: 'pdf_binaries'
});

const bookmarkStore = localforage.createInstance({
  name: 'smart_pdf_reader',
  storeName: 'bookmarks'
});

const settingsStore = localforage.createInstance({
  name: 'smart_pdf_reader',
  storeName: 'settings'
});

export const StorageService = {
  // --- Book Metadata ---
  async getAllBooks(): Promise<Book[]> {
    const books: Book[] = [];
    await bookMetadataStore.iterate((value: Book) => {
      books.push(value);
    });
    // Sort by lastReadAt descending
    return books.sort((a, b) => b.lastReadAt - a.lastReadAt);
  },

  async getBook(id: string): Promise<Book | null> {
    return await bookMetadataStore.getItem<Book>(id);
  },

  async saveBook(book: Book): Promise<void> {
    await bookMetadataStore.setItem(book.id, book);
  },

  async updateBookProgress(id: string, currentPage: number): Promise<void> {
    const book = await this.getBook(id);
    if (book) {
      book.currentPage = currentPage;
      book.lastReadAt = Date.now();
      await bookMetadataStore.setItem(id, book);
    }
  },

  async toggleFavorite(id: string): Promise<boolean> {
    const book = await this.getBook(id);
    if (book) {
      book.isFavorite = !book.isFavorite;
      await bookMetadataStore.setItem(id, book);
      return book.isFavorite;
    }
    return false;
  },

  async deleteBook(id: string): Promise<void> {
    await bookMetadataStore.removeItem(id);
    await pdfBinaryStore.removeItem(id);
    // Remove bookmarks for this book
    const bookmarks = await this.getBookmarks(id);
    for (const b of bookmarks) {
      await bookmarkStore.removeItem(b.id);
    }
  },

  // --- PDF Binaries (ArrayBuffer) ---
  async savePdfBinary(id: string, data: ArrayBuffer): Promise<void> {
    await pdfBinaryStore.setItem(id, data);
  },

  async getPdfBinary(id: string): Promise<ArrayBuffer | null> {
    return await pdfBinaryStore.getItem<ArrayBuffer>(id);
  },

  // --- Bookmarks ---
  async getBookmarks(bookId: string): Promise<Bookmark[]> {
    const list: Bookmark[] = [];
    await bookmarkStore.iterate((value: Bookmark) => {
      if (value.bookId === bookId) {
        list.push(value);
      }
    });
    return list.sort((a, b) => a.pageNumber - b.pageNumber);
  },

  async saveBookmark(bookmark: Bookmark): Promise<void> {
    await bookmarkStore.setItem(bookmark.id, bookmark);
  },

  async deleteBookmark(bookmarkId: string): Promise<void> {
    await bookmarkStore.removeItem(bookmarkId);
  },

  // --- Settings ---
  async getSetting<T>(key: string, defaultValue: T): Promise<T> {
    const val = await settingsStore.getItem<T>(key);
    return val !== null && val !== undefined ? val : defaultValue;
  },

  async saveSetting<T>(key: string, value: T): Promise<void> {
    await settingsStore.setItem(key, value);
  }
};
