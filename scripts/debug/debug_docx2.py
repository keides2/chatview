#!/usr/bin/env python3
"""DOCXファイルの段落構造をデバッグ表示"""
from docx import Document
import re

docx_file = r"C:\Users\shimatani\Docs\GitHub\keides2\chatview\docs\セキュリティチーム昼礼_抜粋.docx"
doc = Document(docx_file)

paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
speaker_pattern = re.compile(r'^(.+?)\s{2,}(\d+:\d+)')

print(f"総段落数: {len(paragraphs)}\n")
print("最初の30段落:\n")

for i, text in enumerate(paragraphs[:30]):
    is_speaker = "✓" if speaker_pattern.match(text) else " "
    print(f"[{i:3d}] {is_speaker} {repr(text[:80])}")
