import sys

# Đảm bảo mã hóa UTF-8 an toàn trên Windows Console
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

__version__ = "1.0.0"
