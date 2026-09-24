import os
import re
from typing import List, Dict, Any, Optional
import fitz  # PyMuPDF

from .text_cleaner import normalize_vietnamese_text

class PDFExtractor:
    """
    Trích xuất nội dung văn bản có cấu trúc từ file PDF.
    Kết hợp pymupdf4llm để lấy định dạng Markdown và PyMuPDF (fitz) để lấy TOC / Bookmarks.
    """
    def __init__(self, pdf_path: str):
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"Không tìm thấy file PDF: {pdf_path}")
        self.pdf_path = pdf_path

    def extract(self) -> Dict[str, Any]:
        """
        Trích xuất toàn diện: Metadata, Table of Contents (Mục lục), 
        và nội dung từng trang dạng Markdown.
        """
        doc = fitz.open(self.pdf_path)
        meta = doc.metadata or {}
        raw_title = meta.get("title") or os.path.splitext(os.path.basename(self.pdf_path))[0]
        title = normalize_vietnamese_text(raw_title)
        author = normalize_vietnamese_text(meta.get("author") or "Tác giả ẩn danh")
        
        # 1. Trích xuất TOC (Bookmarks / Mục lục nhúng trong PDF)
        raw_toc = doc.get_toc()
        toc = []
        for item in raw_toc:
            if len(item) >= 3:
                toc.append({
                    "level": item[0],
                    "title": normalize_vietnamese_text(item[1].strip()),
                    "page": item[2]
                })

        # 2. Trích xuất nội dung Markdown theo từng trang
        pages_content = []
        full_markdown_chunks = []

        try:
            import pymupdf4llm
            # Sử dụng pymupdf4llm với page_chunks=True để lưu trữ metadata từng trang
            page_data_list = pymupdf4llm.to_markdown(self.pdf_path, page_chunks=True)
            for idx, pdata in enumerate(page_data_list):
                page_text = normalize_vietnamese_text(pdata.get("text", ""))
                pages_content.append({
                    "page_num": idx + 1,
                    "markdown": page_text
                })
                full_markdown_chunks.append(page_text)
        except Exception as e:
            # Fallback nếu pymupdf4llm gặp lỗi layout đặc thù: Dùng fitz trích xuất thuần
            print(f"[PDFExtractor] pymupdf4llm fallback (lý do: {e}), sử dụng fitz thuần...")
            for page_index in range(len(doc)):
                page = doc[page_index]
                text = normalize_vietnamese_text(page.get_text("text"))
                pages_content.append({
                    "page_num": page_index + 1,
                    "markdown": text
                })
                full_markdown_chunks.append(text)

        doc.close()

        return {
            "title": title,
            "author": author,
            "total_pages": len(pages_content),
            "toc": toc,
            "pages": pages_content,
            "full_markdown": "\n\n".join(full_markdown_chunks)
        }
