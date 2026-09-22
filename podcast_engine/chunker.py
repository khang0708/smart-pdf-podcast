import re
from typing import List, Dict, Any, Optional

class Chapter:
    def __init__(self, title: str, chapter_index: int, level: int = 1):
        self.title = title
        self.chapter_index = chapter_index
        self.level = level
        self.raw_text = ""
        self.chunks: List[Dict[str, Any]] = []

    def to_dict(self) -> Dict[str, Any]:
        return {
            "title": self.title,
            "chapter_index": self.chapter_index,
            "level": self.level,
            "total_chunks": len(self.chunks),
            "chunks": self.chunks
        }


class SemanticChunker:
    """
    Phân đoạn văn bản theo cấu trúc chương mục và tạo các khối văn bản (chunks)
    có độ dài tối ưu cho mô hình Valtec-TTS (khoảng 150 - 350 ký tự).
    """
    def __init__(self, min_chars: int = 120, max_chars: int = 350):
        self.min_chars = min_chars
        self.max_chars = max_chars

    def split_into_chapters(self, markdown_text: str, toc: Optional[List[Dict[str, Any]]] = None) -> List[Chapter]:
        """
        Nhận diện và cắt văn bản thành danh sách các Chương (Chapters).
        Dựa vào TOC từ PDF hoặc các Markdown headings (# Chương..., ## Phần...).
        """
        # Regex nhận diện tiêu đề chương thông dụng
        chapter_regex = r'(?m)^(#{1,3}\s+.*|Chương\s+[0-9IVXLCDM]+[:\.\s\-].*|Phần\s+[0-9IVXLCDM]+[:\.\s\-].*|Hồi\s+[0-9IVXLCDM]+[:\.\s\-].*)$'
        
        matches = list(re.finditer(chapter_regex, markdown_text, re.IGNORECASE))

        if not matches:
            # Nếu không tìm thấy tiêu đề chương nào rõ rệt, coi toàn bộ là 1 Chương chính
            single_chap = Chapter(title="Nội dung chính", chapter_index=1, level=1)
            single_chap.raw_text = markdown_text.strip()
            return [single_chap]

        chapters = []
        # Phần mở đầu (nếu có nội dung trước chương 1)
        first_match_start = matches[0].start()
        if first_match_start > 0:
            intro_text = markdown_text[:first_match_start].strip()
            if len(intro_text) > 100:
                intro_chap = Chapter(title="Lời mở đầu", chapter_index=0, level=1)
                intro_chap.raw_text = intro_text
                chapters.append(intro_chap)

        for i, match in enumerate(matches):
            raw_title = match.group(0).strip()
            clean_title = re.sub(r'^#+\s*', '', raw_title).strip()
            start_pos = match.end()
            end_pos = matches[i + 1].start() if i + 1 < len(matches) else len(markdown_text)

            chap_text = markdown_text[start_pos:end_pos].strip()
            chap = Chapter(title=clean_title, chapter_index=len(chapters) + 1, level=1)
            chap.raw_text = chap_text
            chapters.append(chap)

        return chapters

    def _split_long_sentence(self, sentence: str) -> List[str]:
        """
        Chia nhỏ một câu dài quá max_chars tại các dấu phẩy, chấm phẩy hoặc từ nối.
        """
        if len(sentence) <= self.max_chars:
            return [sentence]

        sub_parts = []
        # Tách theo dấu phẩy, chấm phẩy, gạch ngang
        parts = re.split(r'(?<=[,;—])\s+', sentence)
        current = ""

        for p in parts:
            if len(current) + len(p) + 1 <= self.max_chars:
                current = f"{current} {p}".strip()
            else:
                if current:
                    sub_parts.append(current)
                # Nếu một mẩu con vẫn dài quá max_chars, cắt theo từ
                if len(p) > self.max_chars:
                    words = p.split()
                    w_chunk = ""
                    for w in words:
                        if len(w_chunk) + len(w) + 1 <= self.max_chars:
                            w_chunk = f"{w_chunk} {w}".strip()
                        else:
                            if w_chunk:
                                sub_parts.append(w_chunk)
                            w_chunk = w
                    if w_chunk:
                        current = w_chunk
                    else:
                        current = ""
                else:
                    current = p

        if current:
            sub_parts.append(current)

        return sub_parts

    def chunk_chapter(self, chapter: Chapter) -> List[Dict[str, Any]]:
        """
        Chia nhỏ nội dung một chương thành các chunk tối ưu cho Valtec-TTS.
        Gắn nhãn thời gian tạm dừng tự nhiên:
        - Tiêu đề: 1000ms
        - Cuối đoạn văn: 650ms
        - Cuối câu thường: 280ms
        """
        chunks = []
        chunk_counter = 1

        # 1. Chunk cho chính tiêu đề chương
        if chapter.title:
            chunks.append({
                "chunk_id": chunk_counter,
                "text": chapter.title,
                "pause_after_ms": 1100,
                "is_heading": True
            })
            chunk_counter += 1

        paragraphs = [p.strip() for p in chapter.raw_text.split("\n\n") if p.strip()]

        for p_idx, para in enumerate(paragraphs):
            # Kiểm tra nếu đoạn là heading phụ (ví dụ: ### Tiểu mục)
            if para.startswith("#"):
                clean_heading = re.sub(r'^#+\s*', '', para).strip()
                chunks.append({
                    "chunk_id": chunk_counter,
                    "text": clean_heading,
                    "pause_after_ms": 900,
                    "is_heading": True
                })
                chunk_counter += 1
                continue

            # Tách các câu trong đoạn: ., !, ?, ..., …
            sentences = re.split(r'(?<=[.?!…])\s+', para)
            current_chunk = ""

            for s_idx, raw_sentence in enumerate(sentences):
                sentence = raw_sentence.strip()
                if not sentence:
                    continue

                # Xử lý nếu câu quá dài
                sub_sentences = self._split_long_sentence(sentence)

                for sub_s in sub_sentences:
                    candidate = f"{current_chunk} {sub_s}".strip() if current_chunk else sub_s

                    if len(candidate) <= self.max_chars:
                        current_chunk = candidate
                    else:
                        if current_chunk:
                            chunks.append({
                                "chunk_id": chunk_counter,
                                "text": current_chunk,
                                "pause_after_ms": 280,
                                "is_heading": False
                            })
                            chunk_counter += 1
                        current_chunk = sub_s

            # Kết thúc một đoạn văn: đẩy chunk còn lại ra và gán nhịp nghỉ dài hơn (cuối paragraph)
            if current_chunk:
                chunks.append({
                    "chunk_id": chunk_counter,
                    "text": current_chunk,
                    "pause_after_ms": 650,
                    "is_heading": False
                })
                chunk_counter += 1

        chapter.chunks = chunks
        return chunks

    def process_all(self, markdown_text: str, toc: Optional[List[Dict[str, Any]]] = None) -> List[Chapter]:
        """
        Thực hiện phân chương và chunk toàn bộ sách.
        """
        chapters = self.split_into_chapters(markdown_text, toc)
        for chap in chapters:
            self.chunk_chapter(chap)
        return chapters
