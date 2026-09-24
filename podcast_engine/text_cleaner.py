import re
import unicodedata
from collections import Counter
from typing import List, Dict, Any

# Bảng tra ký tự TCVN3 (ABC) sang Unicode chuẩn
TCVN3_TO_UNICODE = {
    # Nguyên âm thường
    '¸': 'á', 'µ': 'à', '¶': 'ả', '·': 'ã', '¹': 'ạ',
    '¨': 'ă', '¾': 'ắ', '»': 'ằ', '¼': 'ẳ', '½': 'ẵ', 'Æ': 'ặ',
    '©': 'â', 'Ê': 'ấ', 'Ç': 'ầ', 'È': 'ẩ', 'É': 'ẫ', 'Ë': 'ậ',
    'Ð': 'é', 'Ì': 'è', 'Î': 'ẻ', 'Ï': 'ẽ', 'Ñ': 'ẹ',
    'ª': 'ê', 'Õ': 'ế', 'Ò': 'ề', 'Ó': 'ể', 'Ô': 'ễ', 'Ö': 'ệ',
    'Ý': 'í', '×': 'ì', 'Ø': 'ỉ', 'Ü': 'ĩ', 'Þ': 'ị',
    'ã': 'ó', 'ß': 'ò', 'á': 'ỏ', 'â': 'õ', 'ä': 'ọ',
    '«': 'ô', 'è': 'ố', 'å': 'ồ', 'æ': 'ổ', 'ç': 'ỗ', 'é': 'ộ',
    '¬': 'ơ', 'í': 'ớ', 'ê': 'ờ', 'ë': 'ở', 'ì': 'ỡ', 'î': 'ợ',
    'ó': 'ú', 'ï': 'ù', 'ñ': 'ủ', 'ò': 'ũ', 'ô': 'ụ',
    '­': 'ư', 'ø': 'ứ', 'õ': 'ừ', 'ö': 'ử', '÷': 'ữ', 'ù': 'ự',
    'ý': 'ý', 'ú': 'ỳ', 'û': 'ỷ', 'ü': 'ỹ', 'þ': 'ỵ',
    '®': 'đ', '§': 'Đ',
    # Nguyên âm hoa
    '¢': 'À', '£': 'Á', '¤': 'Ả', '¥': 'Ã', '¦': 'Ạ',
}

TCVN3_DISTINCT = set(['¸', 'µ', '¶', '·', '¹', '¨', '¾', '»', '¼', '½', 'Æ', '©', '®', '§', '¢', '£', '¤', '¥', '¦'])

UNICODE_VI_DISTINCT = set([
    'ả', 'ã', 'ạ', 'ă', 'ắ', 'ằ', 'ẳ', 'ẵ', 'ặ', 'â', 'ấ', 'ầ', 'ẩ', 'ẫ', 'ậ',
    'ẻ', 'ẽ', 'ẹ', 'ê', 'ế', 'ề', 'ể', 'ễ', 'ệ', 'ỉ', 'ĩ', 'ị', 'ỏ', 'ọ',
    'ô', 'ố', 'ồ', 'ổ', 'ỗ', 'ộ', 'ơ', 'ớ', 'ờ', 'ở', 'ỡ', 'ợ', 'ủ', 'ũ', 'ụ',
    'ư', 'ứ', 'ừ', 'ử', 'ữ', 'ự', 'ỳ', 'ỷ', 'ỹ', 'ỵ', 'đ', 'Đ'
])

def is_tcvn3(text: str) -> bool:
    """
    Kiểm tra xem văn bản có thực sự sử dụng mã hoá TCVN3 cũ hay không.
    Chỉ trả về True khi có ký tự đặc thù của TCVN3 và KHÔNG có ký tự Unicode tiếng Việt đặc trưng.
    """
    if not text:
        return False
    tcvn3_hits = sum(1 for ch in text if ch in TCVN3_DISTINCT)
    unicode_hits = sum(1 for ch in text if ch in UNICODE_VI_DISTINCT)
    return tcvn3_hits >= 2 and unicode_hits < 2

def convert_tcvn3_to_unicode(text: str) -> str:
    if not text:
        return ""
    return "".join(TCVN3_TO_UNICODE.get(ch, ch) for ch in text)

VIETNAMESE_CHARS = (
    r'a-zA-Z0-9'
    r'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ'
    r'ÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ'
)

def normalize_vietnamese_text(text: str) -> str:
    """
    Chuẩn hoá toàn diện văn bản tiếng Việt:
    - Khử non-breaking spaces (\u00a0), soft-hyphen (\u00ad), zero-width characters
    - Tự động phát hiện an toàn và chuyển đổi font TCVN3 (ABC) sang Unicode chuẩn
    - Hàn gắn các dấu thanh tổ hợp bị tách rời (NFD -> NFC)
    - Chuẩn hoá Canonical Composition (NFC)
    """
    if not text:
        return ""

    # 1. Khử khoảng trắng lạ và ký tự điều khiển ẩn
    text = text.replace('\u00a0', ' ').replace('\u00ad', '').replace('\ufeff', '')
    text = re.sub(r'[\u200B-\u200D]', '', text)

    # 2. Phát hiện an toàn và chuyển đổi TCVN3
    if is_tcvn3(text):
        text = convert_tcvn3_to_unicode(text)

    # 3. Hàn gắn dấu thanh tổ hợp (\u0300-\u036F) bị cách bởi khoảng trắng
    text = re.sub(r'([a-zA-Z\u00C0-\u024F])\s+([\u0300-\u036F]+)', r'\1\2', text)
    text = re.sub(r'([\u0300-\u036F])\s+([\u0300-\u036F])', r'\1\2', text)

    # 4. Đưa về dạng Unicode NFC chuẩn
    return unicodedata.normalize('NFC', text)


class TextCleaner:
    """
    Bộ làm sạch và tiền xử lý văn bản PDF:
    - Khử header / footer lặp lại qua các trang
    - Lọc số trang và metadata trang in
    - Ghép câu bị ngắt dòng giữa chừng (de-hyphenation & cross-line healing)
    - Chuẩn hóa dấu câu tiếng Việt và khử nhiễu Markdown
    """

    @staticmethod
    def detect_repeated_headers_footers(pages: List[Dict[str, Any]], threshold: float = 0.35) -> set:
        """
        Phát hiện các dòng header hoặc footer lặp lại trên nhiều trang (> threshold * tổng số trang).
        """
        if len(pages) < 2:
            return set()

        first_lines = []
        last_lines = []

        for p in pages:
            lines = [normalize_vietnamese_text(l.strip()) for l in p.get("markdown", "").splitlines() if l.strip()]
            if len(lines) >= 2:
                first_lines.append(lines[0])
                first_lines.append(lines[1])
                last_lines.append(lines[-1])
                last_lines.append(lines[-2])
            elif len(lines) == 1:
                first_lines.append(lines[0])
                last_lines.append(lines[0])

        total_pages = len(pages)
        min_count = max(2, int(total_pages * threshold))

        repeated = set()
        for line, count in Counter(first_lines + last_lines).items():
            # Không lọc nếu dòng trông giống như tiêu đề chương chính
            if count >= min_count and not re.match(r'^(#+\s+|chương\s+\d+|chapter\s+\d+)', line, re.IGNORECASE):
                # Chỉ lọc những chuỗi ngắn thường là header/footer (< 80 ký tự)
                if len(line) < 80:
                    repeated.add(line)

        return repeated

    @classmethod
    def clean_page_text(cls, text: str, repeated_headers: set = None) -> str:
        """
        Làm sạch văn bản của một trang cụ thể.
        """
        if not text:
            return ""

        text = normalize_vietnamese_text(text)
        lines = text.splitlines()
        cleaned_lines = []

        for line in lines:
            stripped = line.strip()
            if not stripped:
                cleaned_lines.append("")
                continue

            # 1. Bỏ header/footer lặp lại đã nhận diện
            if repeated_headers and stripped in repeated_headers:
                continue

            # 2. Bỏ số trang độc lập: "Trang 12", "12 / 140", "12", "Page 12 of 100", số La Mã
            if re.match(r'^(trang\s*\d+|\d+\s*/\s*\d+|page\s*\d+(\s*of\s*\d+)?|\d+|[ivxlcdm]+)$', stripped, re.IGNORECASE):
                continue

            cleaned_lines.append(stripped)

        return "\n".join(cleaned_lines)

    @classmethod
    def heal_sentences(cls, text: str) -> str:
        """
        Hàn gắn các câu bị ngắt dòng giữa chừng do format cột hay ngắt dòng của file PDF.
        Ghép các từ có dấu gạch nối (de-hyphenation).
        """
        text = normalize_vietnamese_text(text)

        # 1. Khử soft hyphen (\u00ad) và gạch nối ngắt từ qua dòng
        text = re.sub(rf'([{VIETNAMESE_CHARS}])-[\r\n\s]+([{VIETNAMESE_CHARS}])', r'\1 \2', text)
        text = re.sub(rf'([{VIETNAMESE_CHARS}])-[\r\n]+([{VIETNAMESE_CHARS}])', r'\1\2', text)

        # 2. Bỏ markdown image links: ![alt](url)
        text = re.sub(r'!\[.*?\]\(.*?\)', '', text)

        # 3. Chuẩn hóa markdown inline links: [text](url) -> text
        text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)

        # 4. Hàn gắn dòng bị ngắt giữa chừng:
        def join_broken_lines(match):
            line1 = match.group(1)
            line2 = match.group(2)
            return f"{line1} {line2}"

        # Pattern: dòng 1 kết thúc bằng ký tự thông thường, \n, dòng 2 bắt đầu bằng chữ thường hoặc dấu trích dẫn
        pattern = rf'([{VIETNAMESE_CHARS},;\"\'“‘\(])\n+([{VIETNAMESE_CHARS.lower()}\"\'“‘\(])'
        for _ in range(3):  # Lặp lại để xử lý liên tiếp nhiều dòng
            text = re.sub(pattern, join_broken_lines, text)

        # 5. Khử các đường kẻ ngang rác trong markdown: ---, ***, ___
        text = re.sub(r'^(\s*[-*_]\s*){3,}$', '', text, flags=re.MULTILINE)

        # 6. Chuẩn hóa khoảng trắng và dòng trống liên tiếp
        text = re.sub(r'[ \t]+', ' ', text)
        text = re.sub(r'\n{3,}', '\n\n', text)

        return normalize_vietnamese_text(text.strip())

    @classmethod
    def clean_document(cls, extracted_data: Dict[str, Any]) -> str:
        """
        Làm sạch toàn bộ tài liệu từ kết quả trích xuất của PDFExtractor.
        """
        pages = extracted_data.get("pages", [])
        repeated_headers = cls.detect_repeated_headers_footers(pages)

        cleaned_pages = []
        for p in pages:
            cleaned_p = cls.clean_page_text(p.get("markdown", ""), repeated_headers)
            cleaned_pages.append(cleaned_p)

        combined = "\n\n".join(p for p in cleaned_pages if p.strip())
        final_text = cls.heal_sentences(combined)
        return normalize_vietnamese_text(final_text)
