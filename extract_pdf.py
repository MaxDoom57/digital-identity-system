import pdfplumber
import sys

pdf_path = "E:\\J'pura Campus\\Research\\Group 28 - Final Thesis.pdf"

try:
    with pdfplumber.open(pdf_path) as pdf:
        print(f"Total pages: {len(pdf.pages)}", flush=True)
        for i, page in enumerate(pdf.pages):
            print(f"\n\n===== PAGE {i+1} =====\n", flush=True)
            text = page.extract_text()
            if text:
                print(text, flush=True)
            else:
                print("[No text extracted from this page]", flush=True)
except Exception as e:
    print(f"pdfplumber error: {e}", file=sys.stderr)
    # Fallback to pypdf
    try:
        from pypdf import PdfReader
        reader = PdfReader(pdf_path)
        print(f"Total pages (pypdf): {len(reader.pages)}", flush=True)
        for i, page in enumerate(reader.pages):
            print(f"\n\n===== PAGE {i+1} =====\n", flush=True)
            text = page.extract_text()
            if text:
                print(text, flush=True)
            else:
                print("[No text extracted from this page]", flush=True)
    except Exception as e2:
        print(f"pypdf error: {e2}", file=sys.stderr)
        sys.exit(1)
