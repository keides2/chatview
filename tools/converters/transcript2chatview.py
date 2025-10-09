#!/usr/bin/env python3
"""
Microsoft Teams DOCX文字起こしをChatView形式のマークダウンに変換するツール

使い方:
    python transcript2chatview.py input.docx -o output.md
    python transcript2chatview.py input.docx --merge-speaker   # 同一話者の連続発言を結合
    python transcript2chatview.py input.docx --no-timestamp    # タイムスタンプ非表示
    python transcript2chatview.py input.docx --no-icon         # アイコン絵文字非表示
    python transcript2chatview.py input.docx --merge-speaker --no-timestamp --no-icon  # 複数オプション併用
"""

import argparse
import re
from pathlib import Path
from docx import Document


def parse_teams_docx(docx_file):
    """
    Teams DOCXファイルをパースして構造化データに変換
    
    Args:
        docx_file: DOCXファイルのパス
        
    Returns:
        list: [{'start': str, 'end': str, 'speaker': str, 'text': str}, ...]
    """
    doc = Document(docx_file)
    transcript = []
    current_entry = {}
    state = 'waiting_timestamp'
    
    for para in doc.paragraphs:
        text = para.text.strip()
        
        # 空行をスキップ
        if not text:
            continue
        
        # タイムスタンプ行を検出
        timestamp_match = re.match(r'(\d+:\d+:\d+\.\d+)\s*-->\s*(\d+:\d+:\d+\.\d+)', text)
        
        if timestamp_match:
            # 前のエントリを保存
            if current_entry and current_entry.get('text'):
                transcript.append(current_entry)
            
            # 新しいエントリを開始
            current_entry = {
                'start': timestamp_match.group(1),
                'end': timestamp_match.group(2),
                'speaker': None,
                'text': ''
            }
            state = 'waiting_speaker'
            
        elif state == 'waiting_speaker' and current_entry.get('speaker') is None:
            # 話者名行
            current_entry['speaker'] = text
            state = 'waiting_text'
            
        elif state == 'waiting_text' and current_entry.get('speaker'):
            # テキスト内容行（複数行の可能性あり）
            if current_entry['text']:
                current_entry['text'] += ' ' + text
            else:
                current_entry['text'] = text
    
    # 最後のエントリを追加
    if current_entry and current_entry.get('text'):
        transcript.append(current_entry)
    
    return transcript


def merge_consecutive_speakers(transcript):
    """
    同一話者の連続した発言を結合
    
    Args:
        transcript: パースされた文字起こしデータ
        
    Returns:
        list: 結合後のデータ
    """
    if not transcript:
        return []
    
    merged = []
    current = transcript[0].copy()
    
    for entry in transcript[1:]:
        if entry['speaker'] == current['speaker']:
            # 同じ話者なら結合
            current['text'] += ' ' + entry['text']
            current['end'] = entry['end']  # 終了時刻を更新
        else:
            # 違う話者なら保存して新規開始
            merged.append(current)
            current = entry.copy()
    
    # 最後のエントリを追加
    merged.append(current)
    
    return merged


def get_speaker_icon(speaker_name, speaker_index):
    """
    話者に応じたアイコン絵文字を返す
    
    Args:
        speaker_name: 話者名
        speaker_index: 話者の出現順（0始まり）
        
    Returns:
        str: 絵文字アイコン
    """
    # 話者ごとに異なるアイコンを割り当て
    icons = ['👨', '👩', '🧑', '👴', '👵', '👦', '👧', '🧔', '👱', '👨‍💼']
    return icons[speaker_index % len(icons)]


def convert_to_chatview_markdown(transcript, show_timestamp=True, show_icon=True):
    """
    パースした文字起こしをChatView形式のマークダウンに変換
    
    Args:
        transcript: パースされたデータ
        show_timestamp: タイムスタンプを表示するか
        show_icon: アイコンを表示するか
        
    Returns:
        str: ChatView形式のマークダウン
    """
    markdown_lines = []
    
    # 話者ごとにuserとassistantを交互に割り当て
    speaker_roles = {}
    speaker_icons = {}
    role_toggle = ['ai', 'me']
    role_index = 0
    
    for entry in transcript:
        speaker = entry['speaker']
        text = entry['text'].strip()
        timestamp = entry['start']
        
        # 初出の話者にロールとアイコンを割り当て
        if speaker not in speaker_roles:
            speaker_roles[speaker] = role_toggle[role_index % 2]
            speaker_icons[speaker] = get_speaker_icon(speaker, role_index)
            role_index += 1
        
        role = speaker_roles[speaker]
        icon = speaker_icons[speaker]
        
        # ChatView形式で出力: @ai[絵文字 話者名]{タイムスタンプ} または @me[絵文字 話者名]{タイムスタンプ}
        if show_icon:
            header = f'@{role}[{icon} {speaker}]'
        else:
            header = f'@{role}[{speaker}]'
        
        if show_timestamp:
            header += f'{{{timestamp}}}'
        
        markdown_lines.append(header)
        
        markdown_lines.append(text)
        markdown_lines.append('')
    
    return '\n'.join(markdown_lines)


def main():
    parser = argparse.ArgumentParser(
        description='Microsoft Teams DOCX文字起こしをChatView形式に変換'
    )
    parser.add_argument(
        'input',
        type=Path,
        help='入力DOCXファイル'
    )
    parser.add_argument(
        '-o', '--output',
        type=Path,
        help='出力マークダウンファイル（省略時は標準出力）'
    )
    parser.add_argument(
        '--merge-speaker',
        action='store_true',
        help='同一話者の連続発言を結合'
    )
    parser.add_argument(
        '--no-timestamp',
        action='store_true',
        help='タイムスタンプを非表示'
    )
    parser.add_argument(
        '--no-icon',
        action='store_true',
        help='アイコン絵文字を非表示'
    )
    
    args = parser.parse_args()
    
    # ファイル存在チェック
    if not args.input.exists():
        print(f'エラー: ファイルが見つかりません: {args.input}')
        return 1
    
    # DOCXファイルをパース
    print(f'文字起こしファイルを読み込んでいます: {args.input}')
    transcript = parse_teams_docx(args.input)
    print(f'  → {len(transcript)}件のエントリを検出')
    
    # オプション: 連続話者を結合
    if args.merge_speaker:
        print('同一話者の連続発言を結合しています...')
        transcript = merge_consecutive_speakers(transcript)
        print(f'  → {len(transcript)}件に結合')
    
    # ChatView形式に変換
    print('ChatView形式のマークダウンに変換しています...')
    markdown = convert_to_chatview_markdown(
        transcript,
        show_timestamp=not args.no_timestamp,
        show_icon=not args.no_icon
    )
    
    # 出力
    if args.output:
        args.output.write_text(markdown, encoding='utf-8')
        print(f'✓ 変換完了: {args.output}')
    else:
        print('\n--- 変換結果 ---\n')
        print(markdown)
    
    return 0


if __name__ == '__main__':
    exit(main())

