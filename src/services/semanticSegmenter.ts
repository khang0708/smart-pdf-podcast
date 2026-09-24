/**
 * Semantic Text Segmenter & NLP Processor for Vietnamese & English
 * Tối ưu hoá phân tách câu và ngữ nghĩa cho Text-to-Speech đọc sách như Podcast
 */

import { normalizeVietnameseText } from './vietnameseUtils';

export interface SemanticSentence {
  index: number;
  text: string;
  cleanedText: string;
}

// Danh sách các từ viết tắt phổ biến không được ngắt câu
const COMMON_ABBREVIATIONS = [
  // Học hàm, học vị, danh xưng tiếng Việt & Anh
  'GS', 'PGS', 'TS', 'ThS', 'BS', 'DS', 'KS', 'CN', 'ThS.BS', 'TS.BS',
  'Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'Sr', 'Jr', 'St',
  // Đơn vị hành chính, địa lý
  'TP', 'TX', 'TT', 'Q', 'H', 'P', 'X',
  // Nhà xuất bản, tổ chức, pháp lý
  'NXB', 'TNHH', 'CP', 'BGD', 'BGDĐT', 'TW', 'UBND', 'HĐND',
  // Từ viết tắt thông dụng khác
  'v.v', 'vv', 'etc', 'e.g', 'i.e', 'vs', 'No', 'Vol', 'pp', 'p', 'tr', 'đ/c', 'đc',
  'Th', 'Thg', 'Jan', 'Feb', 'Mar', 'Apr', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const SemanticSegmenter = {
  /**
   * Làm sạch văn bản từ PDF và phân đoạn thành các câu ngữ nghĩa trọn vẹn
   */
  segment(rawText: string): string[] {
    if (!rawText || rawText.trim().length === 0) {
      return [];
    }

    // 0. Chuẩn hoá tiếng Việt (TCVN3, khử tách dấu NFD, đưa về NFC)
    let text = normalizeVietnameseText(rawText);

    // 1. Chuẩn hoá khoảng trắng và xuống dòng
    text = text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');

    // 2. Nối các từ bị gãy dòng bằng dấu gạch ngang (hyphenated line breaks)
    // Ví dụ: "thông \n tin" hoặc "chức-\n năng" -> "thông tin", "chức năng"
    text = text.replace(/(\p{L}+)-\s*\n\s*(\p{L}+)/gu, '$1$2');
    text = text.replace(/(\p{L}+)\s*\n\s*(\p{L}+)/gu, (match, p1, p2) => {
      // Nếu không phải kết thúc câu, nối liền bằng dấu cách
      return `${p1} ${p2}`;
    });

    // 3. Loại bỏ số trang rời rạc (ví dụ: dòng chỉ có "12" hoặc "Trang 12 / 150")
    text = text.replace(/^\s*(?:trang\s+)?\d+(?:\s*\/\s*\d+)?\s*$/gim, '');

    // 4. Bảo vệ số thập phân, tiền tệ và ngày tháng (VD: 3.14, 1.500.000, 20.09.2026)
    const protectedNumbers: string[] = [];
    text = text.replace(/\b\d+(?:[.,]\d+)+\b/g, (match) => {
      const token = `__NUM_${protectedNumbers.length}__`;
      protectedNumbers.push(match);
      return token;
    });

    // 5. Bảo vệ các từ viết tắt có dấu chấm (VD: "PGS. TS. Nguyễn Văn A", "TP. HCM", "v.v.")
    const protectedAbbrs: string[] = [];
    for (const abbr of COMMON_ABBREVIATIONS) {
      // Regex case-insensitive với dấu chấm phía sau
      const regex = new RegExp(`\\b${abbr}\\.`, 'gi');
      text = text.replace(regex, (match) => {
        const token = `__ABBR_${protectedAbbrs.length}__`;
        protectedAbbrs.push(match);
        return token;
      });
    }

    // Bảo vệ các chữ viết tắt đơn lẻ như "A. B. C." hoặc tên viết tắt "J. K. Rowling"
    text = text.replace(/\b([A-ZĐ])\./g, (match) => {
      const token = `__ABBR_${protectedAbbrs.length}__`;
      protectedAbbrs.push(match);
      return token;
    });

    // 6. Tách đoạn theo các dấu kết thúc câu thực sự (. ! ? ... và kèm ngoặc kép/ngoặc đơn, \n\n)
    // Giữ lại dấu kết thúc câu đi kèm với câu đó
    const rawClauses = text
      .split(/(?<=[.!?…]["'”’)]?)(?:\s+|\n+)|(?:\n\s*\n+)/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // 7. Khôi phục các token đã bảo vệ và chia nhỏ nếu câu quá dài (> 180 ký tự)
    const resultSentences: string[] = [];

    for (let clause of rawClauses) {
      // Khôi phục token
      clause = clause.replace(/__NUM_(\d+)__/g, (_, idx) => protectedNumbers[parseInt(idx, 10)] || '');
      clause = clause.replace(/__ABBR_(\d+)__/g, (_, idx) => protectedAbbrs[parseInt(idx, 10)] || '');

      // Dọn dẹp khoảng trắng thừa
      clause = clause.replace(/\s+/g, ' ').trim();

      if (!clause) continue;

      // Nếu câu quá dài (trên 180 ký tự), ngắt thêm theo vế câu (dấu phẩy, chấm phẩy, hai chấm, gạch ngang)
      // Giúp giọng đọc lấy hơi tự nhiên và không bị ngộp thở như người máy
      if (clause.length > 180) {
        const subParts = clause
          .split(/(?<=[,;:\-—])\s+/)
          .map(p => p.trim())
          .filter(p => p.length > 0);

        let currentChunk = '';
        for (const part of subParts) {
          if (currentChunk.length + part.length > 160 && currentChunk.length > 40) {
            resultSentences.push(currentChunk.trim());
            currentChunk = part;
          } else {
            currentChunk += (currentChunk ? ' ' : '') + part;
          }
        }
        if (currentChunk.trim().length > 0) {
          resultSentences.push(currentChunk.trim());
        }
      } else {
        resultSentences.push(clause);
      }
    }

    return resultSentences.length > 0 ? resultSentences : [rawText.trim()];
  },

  /**
   * Chuẩn hoá câu để gửi đến TTS Engine phát âm mượt nhất
   * Bỏ các ký tự đặc biệt gây lỗi đọc vấp (gạch chéo vô nghĩa, ngoặc vuông, v.v.)
   */
  prepareForSpeech(text: string): string {
    const cleaned = text
      .replace(/\[\d+\]/g, '') // Bỏ chú thích như [1], [2]
      .replace(/[*_~`#]/g, '') // Bỏ định dạng markdown
      .replace(/\s+/g, ' ')
      .trim();
    return normalizeVietnameseText(cleaned);
  }
};
