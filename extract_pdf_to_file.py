import pdfplumber
import sys

pdf_path = "E:\\J'pura Campus\\Research\\Group 28 - Final Thesis.pdf"
out_path = "E:\\digital-identity-system\\thesis_extracted_text.txt"

with pdfplumber.open(pdf_path) as pdf:
    total = len(pdf.pages)
    print(f"Total pages: {total}", flush=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(f"Total pages: {total}\n")
        for i, page in enumerate(pdf.pages):
            header = f"\n\n===== PAGE {i+1} =====\n\n"
            f.write(header)
            text = page.extract_text()
            if text:
                f.write(text)
            else:
                f.write("[No text extracted from this page]")
            print(f"Done page {i+1}/{total}", flush=True)

print(f"\nExtraction complete. Output saved to: {out_path}")
