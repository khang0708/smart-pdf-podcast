import re
from collections import Counter
from typing import List, Dict, Any

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
            lines = [l.strip() for l in p.get("markdown", "").splitlines() if l.strip()]
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
        # 1. Khử soft hyphen (\u00ad) và gạch nối ngắt từ qua dòng
        text = text.replace('\u00ad', '')
        text = re.sub(r'([a-zA-Zà-ỹÀ-Ỹ0-9])-[\r\n\s]+([a-zA-Zà-ỹÀ-Ỹ0-9])', r'\1 \2', text)
        text = re.sub(r'([a-zA-Zà-ỹÀ-Ỹ0-9])-[\r\n]+([a-zA-Zà-ỹÀ-Ỹ0-9])', r'\1\2', text)

        # 2. Bỏ markdown image links: ![alt](url)
        text = re.sub(r'!\[.*?\]\(.*?\)', '', text)

        # 3. Chuẩn hóa markdown inline links: [text](url) -> text
        text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)

        # 4. Hàn gắn dòng bị ngắt giữa chừng:
        # Nếu dòng hiện tại không kết thúc bằng dấu chấm kết câu (. ? ! : …) hoặc tiêu đề markdown (#)
        # và dòng kế tiếp bắt đầu bằng chữ thường hoặc số -> nối lại bằng dấu cách
        def join_broken_lines(match):
            line1 = match.group(1)
            line2 = match.group(2)
            return f"{line1} {line2}"

        # Pattern: dòng 1 kết thúc bằng ký tự thông thường, \n, dòng 2 bắt đầu bằng chữ thường hoặc dấu trích dẫn
        pattern = r'([a-zA-Zà-ỹÀ-Ỹ0-9,;\"\'“‘\(])\n+([a-zà-ỹ0-9\"\'“‘\(])'
        for _ in range(3):  # Lặp lại để xử lý liên tiếp nhiều dòng
            text = re.sub(pattern, join_broken_lines, text)

        # 5. Khử các đường kẻ ngang rác trong markdown: ---, ***, ___
        text = re.sub(r'^(\s*[-*_]\s*){3,}$', '', text, flags=re.MULTILINE)

        # 6. Chuẩn hóa khoảng trắng và dòng trống liên tiếp
        text = re.sub(r'[ \t]+', ' ', text)
        text = re.sub(r'\n{3,}', '\n\n', text)

        return text.strip()

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
        return final_text
