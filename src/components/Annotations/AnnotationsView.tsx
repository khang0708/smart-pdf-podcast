import React, { useState, useEffect, useMemo } from 'react';
import { Book, Annotation } from '../../types';
import { StorageService } from '../../services/storage';
import { 
  Tag, 
  BookOpen, 
  Trash2, 
  Search, 
  Clock, 
  Plus, 
  Quote, 
  Share2, 
  Copy, 
  Check, 
  ChevronRight,
  Sparkles,
  X
} from 'lucide-react';

interface AnnotationsViewProps {
  books: Book[];
  onOpenBookAtPage: (book: Book, pageNumber: number) => void;
}

const SAMPLE_ANNOTATIONS: Annotation[] = [
  {
    id: 'ann_sample_1',
    bookId: 'atelier_book_4', // The Quiet Woods
    pageNumber: 44,
    quote: 'Trong sự tĩnh lặng sâu sắc nhất của khu rừng già, tâm trí tìm thấy câu trả lời mà những ồn ào phố thị không thể đem lại.',
    content: 'Đoạn văn mang lại cảm giác an yên đặc biệt. Khi làm việc căng thẳng, quay về với sự tĩnh lặng của thiên nhiên luôn là phương thuốc chữa lành tốt nhất.',
    tags: ['triết-lý', 'tâm-đắc', 'chữa-lành'],
    color: 'sage',
    createdAt: Date.now() - 1000 * 60 * 60 * 3,
    updatedAt: Date.now() - 1000 * 60 * 60 * 3,
  },
  {
    id: 'ann_sample_2',
    bookId: 'atelier_book_3', // Chronicles of Ash
    pageNumber: 88,
    quote: 'Lịch sử không bao giờ lặp lại một cách cơ học, nhưng nó luôn hòa âm theo cùng một điệu khúc của tham vọng và sự tha thứ.',
    content: 'Một góc nhìn rất sắc sảo về chu kỳ phát triển của xã hội. Tham vọng tạo nên biến động, và sự tha thứ tái thiết lại văn minh.',
    tags: ['lịch-sử', 'suy-ngẫm'],
    color: 'terracotta',
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24,
  },
  {
    id: 'ann_sample_3',
    bookId: 'atelier_book_2', // Whispers in the Wind
    pageNumber: 18,
    quote: 'Tri thức thực sự không nằm ở số lượng sách bạn tích lũy trên giá, mà ở những dòng tư tưởng bạn để lại trong tâm thức.',
    content: 'Cần tập trung vào chất lượng đọc sâu (Deep Reading) hơn là chỉ chạy đua theo tốc độ đọc lướt số lượng trang.',
    tags: ['phát-triển-bản-thân', 'tri-thức'],
    color: 'amber',
    createdAt: Date.now() - 1000 * 60 * 60 * 48,
    updatedAt: Date.now() - 1000 * 60 * 60 * 48,
  }
];

export const AnnotationsView: React.FC<AnnotationsViewProps> = ({
  books,
  onOpenBookAtPage
}) => {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedBookId, setSelectedBookId] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newBookId, setNewBookId] = useState<string>(books[0]?.id || '');
  const [newPageNumber, setNewPageNumber] = useState<number>(1);
  const [newQuote, setNewQuote] = useState<string>('');
  const [newContent, setNewContent] = useState<string>('');
  const [newTags, setNewTags] = useState<string>('tâm-đắc');
  const [newColor, setNewColor] = useState<'terracotta' | 'amber' | 'sage' | 'blue' | 'purple'>('terracotta');

  // Copy toast
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [exportedToast, setExportedToast] = useState<boolean>(false);

  // Load annotations
  useEffect(() => {
    const load = async () => {
      try {
        let anns = await StorageService.getAllAnnotations();
        if (!anns || anns.length === 0) {
          for (const s of SAMPLE_ANNOTATIONS) {
            await StorageService.saveAnnotation(s).catch(() => {});
          }
          anns = SAMPLE_ANNOTATIONS;
        }
        setAnnotations(anns);
      } catch (err) {
        console.warn('Error loading annotations:', err);
        setAnnotations(SAMPLE_ANNOTATIONS);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  // Books lookup map
  const bookMap = useMemo(() => {
    const map = new Map<string, Book>();
    for (const b of books) {
      map.set(b.id, b);
    }
    return map;
  }, [books]);

  // Extract all unique tags
  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const a of annotations) {
      if (a.tags) {
        for (const t of a.tags) set.add(t);
      }
    }
    return Array.from(set);
  }, [annotations]);

  // Filtered annotations
  const filteredAnnotations = useMemo(() => {
    return annotations.filter(ann => {
      if (selectedBookId !== 'all' && ann.bookId !== selectedBookId) {
        return false;
      }
      if (selectedTag !== 'all' && (!ann.tags || !ann.tags.includes(selectedTag))) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchQuote = ann.quote?.toLowerCase().includes(q) || false;
        const matchContent = ann.content.toLowerCase().includes(q);
        const matchTag = ann.tags?.some(t => t.toLowerCase().includes(q)) || false;
        if (!matchQuote && !matchContent && !matchTag) return false;
      }
      return true;
    });
  }, [annotations, selectedBookId, selectedTag, searchQuery]);

  // Save new annotation
  const handleSaveNewAnnotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    const tagsArray = newTags
      .split(/[,# ]+/)
      .map(t => t.trim())
      .filter(Boolean);

    const newAnn: Annotation = {
      id: `ann_${Date.now()}`,
      bookId: newBookId || books[0]?.id || 'local_book',
      pageNumber: Number(newPageNumber) || 1,
      quote: newQuote.trim() || undefined,
      content: newContent.trim(),
      tags: tagsArray.length > 0 ? tagsArray : ['ghi-chú'],
      color: newColor,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await StorageService.saveAnnotation(newAnn);
    setAnnotations(prev => [newAnn, ...prev]);
    setShowCreateModal(false);
    setNewQuote('');
    setNewContent('');
  };

  // Delete annotation
  const handleDeleteAnnotation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Bạn có chắc chắn muốn xóa ghi chú này?')) {
      await StorageService.deleteAnnotation(id);
      setAnnotations(prev => prev.filter(a => a.id !== id));
    }
  };

  // Copy single note
  const handleCopyNote = (ann: Annotation, e: React.MouseEvent) => {
    e.stopPropagation();
    const book = bookMap.get(ann.bookId);
    let text = `📖 ${book?.title || 'Sách'} (Trang ${ann.pageNumber})\n`;
    if (ann.quote) text += `> "${ann.quote}"\n\n`;
    text += `✍️ Ghi chú: ${ann.content}`;

    navigator.clipboard.writeText(text);
    setCopiedId(ann.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Export all to Markdown
  const handleExportMarkdown = () => {
    let md = `# Sổ Tay Ghi Chú & Trích Dẫn - Aurora Reader\n`;
    md += `*Xuất ngày: ${new Date().toLocaleDateString('vi-VN')}*\n\n---\n\n`;

    for (const ann of filteredAnnotations) {
      const book = bookMap.get(ann.bookId);
      md += `### ${book?.title || 'Sách'} - Trang ${ann.pageNumber}\n`;
      if (ann.quote) {
        md += `> "${ann.quote}"\n\n`;
      }
      md += `${ann.content}\n\n`;
      if (ann.tags && ann.tags.length > 0) {
        md += `*Tags: ${ann.tags.map(t => `#${t}`).join(' ')}*\n\n`;
      }
      md += `---\n\n`;
    }

    navigator.clipboard.writeText(md);
    setExportedToast(true);
    setTimeout(() => setExportedToast(false), 3000);
  };

  const getColorClasses = (color?: string) => {
    switch (color) {
      case 'amber':
        return { border: 'border-l-[#f59e0b]', badge: 'bg-[#2b2114] text-[#fbbf24] border-[#4a361e]' };
      case 'sage':
        return { border: 'border-l-[#22c55e]', badge: 'bg-[#15261b] text-[#4ade80] border-[#223f2b]' };
      case 'blue':
        return { border: 'border-l-[#3b82f6]', badge: 'bg-[#152336] text-[#60a5fa] border-[#213550]' };
      case 'purple':
        return { border: 'border-l-[#a855f7]', badge: 'bg-[#261536] text-[#c084fc] border-[#3e1f59]' };
      case 'terracotta':
      default:
        return { border: 'border-l-[#c97a3e]', badge: 'bg-[#2b1c15] text-[#f97316] border-[#4a2e20]' };
    }
  };

  return (
    <div className="flex-1 w-full h-full bg-[#0c0d10] text-stone-200 overflow-y-auto px-4 sm:px-8 py-6 pb-24 md:pb-8 flex flex-col gap-6 select-none font-sans">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1b1e25] pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#faf6ee] tracking-wide flex items-center gap-2.5">
            <span>Sổ Tay Ghi Chú & Trích Dẫn</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#181b22] text-[#c97a3e] border border-[#2b3040] font-sans font-medium">
              {annotations.length} mục
            </span>
          </h1>
          <p className="text-xs text-stone-400 mt-1 font-sans">
            Lưu giữ những câu văn tâm đắc, ý tưởng sáng tạo và góc nhìn sâu sắc từ các trang sách
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#c97a3e] hover:bg-[#b56930] text-white text-xs font-semibold shadow-lg shadow-[#c97a3e]/20 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Viết ghi chú</span>
          </button>
          <button
            onClick={handleExportMarkdown}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#161820] hover:bg-[#202430] border border-[#262c3b] text-stone-200 text-xs font-medium transition-all cursor-pointer"
            title="Sao chép toàn bộ ghi chú dạng Markdown sang Obsidian / Notion"
          >
            {exportedToast ? <Check className="w-3.5 h-3.5 text-[#22c55e]" /> : <Share2 className="w-3.5 h-3.5 text-stone-400" />}
            <span>{exportedToast ? 'Đã sao chép MD!' : 'Xuất Markdown'}</span>
          </button>
        </div>
      </div>

      {/* 2. Search & Filters Bar */}
      <div className="flex flex-col gap-3 bg-[#111318] border border-[#1c202a] rounded-2xl p-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-stone-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo trích dẫn, suy ngẫm hoặc từ khóa thẻ..."
              className="w-full bg-[#181b22] border border-[#262c3b] rounded-xl pl-9 pr-3 py-1.5 text-xs text-stone-200 placeholder:text-stone-500 focus:outline-none focus:border-[#c97a3e] transition-colors"
            />
          </div>

          {/* Filter by Book Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-stone-400 shrink-0">Cuốn sách:</span>
            <select
              value={selectedBookId}
              onChange={(e) => setSelectedBookId(e.target.value)}
              className="bg-[#181b22] border border-[#262c3b] text-stone-300 text-xs rounded-xl px-3 py-1.5 focus:outline-none cursor-pointer max-w-[200px] truncate"
            >
              <option value="all">Mọi cuốn sách</option>
              {books.map(b => (
                <option key={b.id} value={b.id}>{b.title}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tag Filter Chips */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1 scrollbar-none">
            <span className="text-[11px] text-stone-500 shrink-0">Thẻ:</span>
            <button
              onClick={() => setSelectedTag('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer shrink-0 ${
                selectedTag === 'all'
                  ? 'bg-[#c97a3e] text-white'
                  : 'bg-[#181a22] text-stone-400 hover:text-stone-200'
              }`}
            >
              #Tất-cả
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer shrink-0 ${
                  selectedTag === tag
                    ? 'bg-[#c97a3e] text-white'
                    : 'bg-[#181a22] text-stone-400 hover:text-stone-200 border border-[#222736]'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. Notes Grid */}
      {filteredAnnotations.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-16 text-center bg-[#111318] border border-dashed border-[#222734] rounded-3xl p-6">
          <div className="w-16 h-16 rounded-full bg-[#181b24] flex items-center justify-center text-[#c97a3e] mb-4">
            <Quote className="w-8 h-8 opacity-60" />
          </div>
          <h3 className="text-base font-serif font-semibold text-[#faf6ee]">Chưa có ghi chú hoặc trích dẫn nào</h3>
          <p className="text-xs text-stone-400 max-w-sm mt-1.5 mb-5">
            Bấm nút <b>Viết ghi chú</b> để lưu lại những ý tưởng tâm đắc đầu tiên từ các trang sách bạn đang đọc.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl bg-[#c97a3e] hover:bg-[#b56930] text-white text-xs font-semibold shadow-lg shadow-[#c97a3e]/20 transition-all cursor-pointer"
          >
            + Viết ghi chú mới
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAnnotations.map((ann) => {
            const book = bookMap.get(ann.bookId);
            const bookTitle = book?.title || 'Tác phẩm trong thư viện';
            const colors = getColorClasses(ann.color);

            return (
              <div
                key={ann.id}
                onClick={() => book && onOpenBookAtPage(book, ann.pageNumber)}
                className={`group bg-[#12141a] hover:bg-[#161922] border border-[#1e222d] hover:border-[#384055] rounded-2xl p-4.5 flex flex-col justify-between gap-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/50 cursor-pointer border-l-4 ${colors.border}`}
              >
                {/* Header: Book Title & Page */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="text-xs font-serif font-bold text-[#faf6ee] truncate group-hover:text-[#c97a3e] transition-colors">
                      {bookTitle}
                    </h4>
                    <p className="text-[10px] text-stone-400 truncate">
                      {book?.author || 'Tác giả ẩn danh'}
                    </p>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full border text-[10.5px] font-mono font-semibold shrink-0 ${colors.badge}`}>
                    Trang {ann.pageNumber}
                  </span>
                </div>

                {/* Content: Quote & Reflection */}
                <div className="flex flex-col gap-2.5">
                  {/* Quoted Text */}
                  {ann.quote && (
                    <div className="relative pl-3.5 border-l-2 border-[#3c445a] py-0.5">
                      <Quote className="w-3 h-3 text-[#c97a3e] absolute -left-1.5 -top-1 opacity-70" />
                      <p className="font-serif italic text-xs text-[#e8dfd2] leading-relaxed line-clamp-4">
                        "{ann.quote}"
                      </p>
                    </div>
                  )}

                  {/* Personal Reflection Note */}
                  <div className="bg-[#171922] border border-[#222634] rounded-xl p-3 text-xs text-stone-300 leading-relaxed font-sans">
                    {ann.content}
                  </div>
                </div>

                {/* Tags */}
                {ann.tags && ann.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {ann.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-md bg-[#191d29] text-[10px] font-mono text-stone-400 border border-[#262b3a]"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Footer: Time & Action Buttons */}
                <div className="flex items-center justify-between pt-1 border-t border-[#1b1e26] text-[10px] text-stone-500">
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3 text-stone-600" />
                    {new Date(ann.createdAt).toLocaleDateString('vi-VN')}
                  </span>

                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => handleCopyNote(ann, e)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-[#202430] transition-colors cursor-pointer"
                      title="Sao chép nội dung"
                    >
                      {copiedId === ann.id ? <Check className="w-3.5 h-3.5 text-[#22c55e]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={(e) => handleDeleteAnnotation(ann.id, e)}
                      className="p-1.5 rounded-lg text-stone-500 hover:text-[#f43f5e] hover:bg-[#202430] transition-colors cursor-pointer"
                      title="Xóa ghi chú"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => book && onOpenBookAtPage(book, ann.pageNumber)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#202534] hover:bg-[#c97a3e] text-stone-200 hover:text-white text-[11px] font-medium transition-colors cursor-pointer ml-1"
                    >
                      <span>Mở</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Create Note Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#13161e] border border-[#262c3b] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#202432]">
              <h3 className="font-serif font-bold text-[#faf6ee] text-base flex items-center gap-2">
                <Quote className="w-4 h-4 text-[#c97a3e]" />
                <span>Viết Ghi Chú & Trích Dẫn Mới</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-7 h-7 rounded-lg text-stone-400 hover:text-white flex items-center justify-center hover:bg-[#1e222e] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveNewAnnotation} className="p-5 flex flex-col gap-4 text-xs">
              {/* Pick Book & Page */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 flex flex-col gap-1.5">
                  <label className="text-stone-300 font-medium">Chọn cuốn sách:</label>
                  <select
                    value={newBookId}
                    onChange={(e) => setNewBookId(e.target.value)}
                    className="bg-[#1a1d27] border border-[#2b3142] text-stone-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#c97a3e]"
                  >
                    {books.map(b => (
                      <option key={b.id} value={b.id}>{b.title}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-stone-300 font-medium">Số trang:</label>
                  <input
                    type="number"
                    min="1"
                    value={newPageNumber}
                    onChange={(e) => setNewPageNumber(parseInt(e.target.value, 10) || 1)}
                    className="bg-[#1a1d27] border border-[#2b3142] text-stone-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#c97a3e]"
                  />
                </div>
              </div>

              {/* Quote */}
              <div className="flex flex-col gap-1.5">
                <label className="text-stone-300 font-medium">Câu trích dẫn nguyên văn (Tùy chọn):</label>
                <textarea
                  rows={2}
                  value={newQuote}
                  onChange={(e) => setNewQuote(e.target.value)}
                  placeholder="Dán đoạn văn bạn tâm đắc vào đây..."
                  className="bg-[#1a1d27] border border-[#2b3142] text-stone-200 rounded-xl p-3 focus:outline-none focus:border-[#c97a3e] placeholder:text-stone-500 font-serif italic"
                />
              </div>

              {/* Reflection Note */}
              <div className="flex flex-col gap-1.5">
                <label className="text-stone-300 font-medium">Suy ngẫm / Lời bình của bạn (*):</label>
                <textarea
                  rows={3}
                  required
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Ghi lại suy nghĩ, liên hệ thực tế hoặc bài học bạn rút ra..."
                  className="bg-[#1a1d27] border border-[#2b3142] text-stone-200 rounded-xl p-3 focus:outline-none focus:border-[#c97a3e] placeholder:text-stone-500"
                />
              </div>

              {/* Tags & Color */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-stone-300 font-medium">Thẻ nhãn (Cách nhau dấu phẩy):</label>
                  <input
                    type="text"
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                    placeholder="triết-lý, tâm-đắc, công-việc"
                    className="bg-[#1a1d27] border border-[#2b3142] text-stone-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#c97a3e]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-stone-300 font-medium">Màu sắc đánh dấu:</label>
                  <div className="flex items-center gap-2 pt-1.5">
                    {[
                      { id: 'terracotta', bg: 'bg-[#c97a3e]' },
                      { id: 'amber', bg: 'bg-[#f59e0b]' },
                      { id: 'sage', bg: 'bg-[#22c55e]' },
                      { id: 'blue', bg: 'bg-[#3b82f6]' },
                      { id: 'purple', bg: 'bg-[#a855f7]' },
                    ].map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setNewColor(c.id as any)}
                        className={`w-6 h-6 rounded-full ${c.bg} transition-transform ${
                          newColor === c.id ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-100'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#202432] mt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-stone-400 hover:text-stone-200 font-medium transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#c97a3e] hover:bg-[#b56930] text-white font-semibold shadow-lg shadow-[#c97a3e]/20 transition-all cursor-pointer"
                >
                  Lưu ghi chú
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default AnnotationsView;
