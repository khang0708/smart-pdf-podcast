/**
 * Vietnamese Text & Font Normalization Utilities
 * Khắc phục triệt để lỗi PDF mất dấu tiếng Việt, font TCVN3/VNI, và tách rời dấu tổ hợp (NFD)
 */

// Bảng tra ký tự TCVN3 (ABC) sang Unicode chuẩn
const TCVN3_TO_UNICODE: Record<string, string> = {
  // Nguyên âm thường
  '¸': 'á', 'µ': 'à', '¶': 'ả', '·': 'ã', '¹': 'ạ',
  '¨': 'ă', '¾': 'ắ', '»': 'ằ', '¼': 'ẳ', '½': 'ẵ', 'Æ': 'ặ',
  '©': 'â', 'Ê': 'ấ', 'Ç': 'ầ', 'È': 'ẩ', 'É': 'ẫ', 'Ë': 'ậ',
  'e': 'e', 'Ð': 'é', 'Ì': 'è', 'Î': 'ẻ', 'Ï': 'ẽ', 'Ñ': 'ẹ',
  'ª': 'ê', 'Õ': 'ế', 'Ò': 'ề', 'Ó': 'ể', 'Ô': 'ễ', 'Ö': 'ệ',
  'i': 'i', 'Ý': 'í', '×': 'ì', 'Ø': 'ỉ', 'Ü': 'ĩ', 'Þ': 'ị',
  'o': 'o', 'ã': 'ó', 'ß': 'ò', 'á': 'ỏ', 'â': 'õ', 'ä': 'ọ',
  '«': 'ô', 'è': 'ố', 'å': 'ồ', 'æ': 'ổ', 'ç': 'ỗ', 'é': 'ộ',
  '¬': 'ơ', 'í': 'ớ', 'ê': 'ờ', 'ë': 'ở', 'ì': 'ỡ', 'î': 'ợ',
  'u': 'u', 'ó': 'ú', 'ï': 'ù', 'ñ': 'ủ', 'ò': 'ũ', 'ô': 'ụ',
  '­': 'ư', 'ø': 'ứ', 'õ': 'ừ', 'ö': 'ử', '÷': 'ữ', 'ù': 'ự',
  'y': 'y', 'ý': 'ý', 'ú': 'ỳ', 'û': 'ỷ', 'ü': 'ỹ', 'þ': 'ỵ',
  '®': 'đ',

  // Nguyên âm hoa TCVN3 riêng biệt
  '¢': 'À', '£': 'Á', '¤': 'Ả', '¥': 'Ã', '¦': 'Ạ',
  '§': 'Đ',
};

// Các ký tự đặc thù chỉ xuất hiện trong font TCVN3 cũ (không bao giờ có trong văn bản Unicode chuẩn)
const TCVN3_DISTINCT = new Set(['¸', 'µ', '¶', '·', '¹', '¨', '¾', '»', '¼', '½', 'Æ', '©', '®', '§', '¢', '£', '¤', '¥', '¦']);

// Các nguyên âm đặc trưng chỉ có trong Unicode chuẩn tiếng Việt
const UNICODE_VI_DISTINCT = new Set([
  'ả', 'ã', 'ạ', 'ă', 'ắ', 'ằ', 'ẳ', 'ẵ', 'ặ', 'â', 'ấ', 'ầ', 'ẩ', 'ẫ', 'ậ',
  'ẻ', 'ẽ', 'ẹ', 'ê', 'ế', 'ề', 'ể', 'ễ', 'ệ', 'ỉ', 'ĩ', 'ị', 'ỏ', 'ọ',
  'ô', 'ố', 'ồ', 'ổ', 'ỗ', 'ộ', 'ơ', 'ớ', 'ờ', 'ở', 'ỡ', 'ợ', 'ủ', 'ũ', 'ụ',
  'ư', 'ứ', 'ừ', 'ử', 'ữ', 'ự', 'ỳ', 'ỷ', 'ỹ', 'ỵ', 'đ', 'Đ'
]);

// Từ khoá đặc trưng tiếng Việt nhận diện ngôn ngữ
const COMMON_VIETNAMESE_WORDS = new Set([
  'và', 'của', 'người', 'những', 'được', 'trong', 'không', 'với', 'cho', 
  'các', 'một', 'có', 'là', 'này', 'đã', 'khi', 'để', 'từ', 'về', 'thì',
  'đọc', 'sách', 'ngày', 'hơn', 'bạn', 'tôi', 'chúng', 'ra', 'lại', 'làm'
]);

/**
 * Phát hiện văn bản đang bị lỗi mã hoá font TCVN3 (ABC).
 * Chỉ kích hoạt nếu có ký tự đặc thù TCVN3 và KHÔNG chứa các ký tự Unicode chuẩn tiếng Việt.
 */
export function isTCVN3(text: string): boolean {
  if (!text) return false;
  let tcvn3Hits = 0;
  let unicodeHits = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (TCVN3_DISTINCT.has(ch)) tcvn3Hits++;
    if (UNICODE_VI_DISTINCT.has(ch)) unicodeHits++;
  }
  return tcvn3Hits >= 2 && unicodeHits < 2;
}

/**
 * Chuyển đổi chuỗi mã hoá TCVN3 sang Unicode chuẩn NFC
 */
export function convertTCVN3ToUnicode(text: string): string {
  if (!text) return '';
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    result += TCVN3_TO_UNICODE[ch] !== undefined ? TCVN3_TO_UNICODE[ch] : ch;
  }
  return result.normalize('NFC');
}

/**
 * Hàn gắn các dấu thanh / dấu mũ bị tách rời trong luồng Text của PDF (Combining Diacritics Healing)
 * Ví dụ: "e \u0301" -> "é", "a \u0300" -> "à", "o \u0302 \u0301" -> "ố"
 */
export function healSeparatedDiacritics(text: string): string {
  if (!text) return '';

  // 1. Khử khoảng cách giữa nguyên âm và dấu thanh tổ hợp (\u0300-\u036F)
  let healed = text.replace(/([a-zA-Z\u00C0-\u024F])\s+([\u0300-\u036F]+)/gu, '$1$2');

  // 2. Gom các dấu kết hợp bị cách nhau bởi khoảng trắng: "\u0302 \u0301" -> "\u0302\u0301"
  healed = healed.replace(/([\u0300-\u036F])\s+([\u0300-\u036F])/gu, '$1$2');

  // 3. Chuẩn hoá Canonical Composition (NFC)
  return healed.normalize('NFC');
}

/**
 * Hàn gắn các từ bị ngắt rời rạc từng chữ cái do kerning font PDF (ví dụ: "c h ư ơ n g" -> "chương")
 */
export function recombineSpacedLetters(text: string): string {
  if (!text) return '';

  // Phát hiện mẫu các chữ cái đơn lẻ cách nhau bằng 1 dấu cách liên tiếp (>= 3 chữ cái)
  // Ví dụ: "k h á m   p h á" -> "khám phá"
  return text.replace(/\b([a-zA-Zà-ỹÀ-ỸđĐ])\s+([a-zA-Zà-ỹÀ-ỸđĐ])\s+([a-zA-Zà-ỹÀ-ỸđĐ])(?:\s+([a-zA-Zà-ỹÀ-ỸđĐ]))*/gu, (match) => {
    // Không gộp nếu trông giống như tên viết tắt hoặc danh sách chữ cái
    const withoutSpaces = match.replace(/\s+/g, '');
    if (withoutSpaces.length <= 1) return match;
    return withoutSpaces;
  });
}

/**
 * Bộ chuẩn hoá văn bản tiếng Việt toàn diện cho Reader & Text-to-Speech
 */
export function normalizeVietnameseText(rawText: string): string {
  if (!rawText) return '';

  // 1. Khử non-breaking spaces và soft hyphens
  let text = rawText
    .replace(/\u00A0/g, ' ')
    .replace(/\u00AD/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, ''); // Zero-width spaces

  // 2. Chuyển đổi mã TCVN3 nếu phát hiện font cũ
  if (isTCVN3(text)) {
    text = convertTCVN3ToUnicode(text);
  }

  // 3. Hàn gắn dấu thanh tổ hợp tách rời và đưa về chuẩn NFC
  text = healSeparatedDiacritics(text);

  // 4. Chuẩn hoá Unicode NFC một lần nữa
  text = text.normalize('NFC');

  return text;
}

/**
 * Kiểm tra xem một đoạn văn bản có phải tiếng Việt hay không (kể cả khi ở dạng NFD hoặc unaccented)
 */
export function isVietnameseText(text: string): boolean {
  if (!text) return false;
  const nfc = text.normalize('NFC');

  // 1. Kiểm tra ký tự có dấu tiếng Việt chuẩn
  const hasVietnameseChars = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ\u0300-\u036F]/i.test(nfc);
  if (hasVietnameseChars) return true;

  // 2. Kiểm tra các từ thông dụng tiếng Việt (khi chữ không có dấu)
  const lowerWords = nfc.toLowerCase().split(/\s+/);
  let matches = 0;
  for (const w of lowerWords) {
    if (COMMON_VIETNAMESE_WORDS.has(w)) {
      matches++;
      if (matches >= 2) return true;
    }
  }

  return false;
}
