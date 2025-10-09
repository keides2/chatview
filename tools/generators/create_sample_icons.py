#!/usr/bin/env python3
"""
シンプルなサンプル用のアイコン画像を生成

使い方:
    python tools/generators/create_sample_icons.py
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_circular_icon(size, bg_color, text, text_color, output_path):
    """
    円形の背景に文字を配置したアイコンを生成
    
    Args:
        size: アイコンのサイズ（ピクセル）
        bg_color: 背景色（RGB タプル）
        text: 表示する文字
        text_color: 文字色（RGB タプル）
        output_path: 出力ファイルパス
    """
    # 透明な背景で画像を作成
    img = Image.new('RGBA', (size, size), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)
    
    # 円を描画
    draw.ellipse([0, 0, size-1, size-1], fill=bg_color + (255,))
    
    # テキストを中央に配置
    try:
        # フォントサイズを調整
        font_size = int(size * 0.5)
        # システムフォントを試す（Windows）
        try:
            font = ImageFont.truetype("arial.ttf", font_size)
        except:
            try:
                font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", font_size)
            except:
                # フォントが見つからない場合はデフォルト
                font = ImageFont.load_default()
    except:
        font = ImageFont.load_default()
    
    # テキストの境界ボックスを取得
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    # 中央に配置
    x = (size - text_width) // 2 - bbox[0]
    y = (size - text_height) // 2 - bbox[1]
    
    draw.text((x, y), text, font=font, fill=text_color + (255,))
    
    # 保存
    img.save(output_path)
    print(f"Created: {output_path}")


def main():
    # 出力ディレクトリ
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(script_dir, '..', 'samples', 'markdown', 'icons')
    os.makedirs(output_dir, exist_ok=True)
    
    # アイコンサイズ
    size = 48
    
    # サンプルアイコンを生成
    icons = [
        {
            'name': 'speaker_ai.png',
            'bg_color': (52, 152, 219),  # 青
            'text': 'AI',
            'text_color': (255, 255, 255)  # 白
        },
        {
            'name': 'speaker_user.png',
            'bg_color': (46, 204, 113),  # 緑
            'text': 'ME',
            'text_color': (255, 255, 255)  # 白
        },
        {
            'name': 'speaker_alice.png',
            'bg_color': (231, 76, 60),  # 赤
            'text': 'A',
            'text_color': (255, 255, 255)  # 白
        },
        {
            'name': 'speaker_bob.png',
            'bg_color': (155, 89, 182),  # 紫
            'text': 'B',
            'text_color': (255, 255, 255)  # 白
        },
        {
            'name': 'speaker_charlie.png',
            'bg_color': (241, 196, 15),  # 黄
            'text': 'C',
            'text_color': (51, 51, 51)  # 黒
        }
    ]
    
    for icon in icons:
        output_path = os.path.join(output_dir, icon['name'])
        create_circular_icon(
            size=size,
            bg_color=icon['bg_color'],
            text=icon['text'],
            text_color=icon['text_color'],
            output_path=output_path
        )
    
    print(f"\n✅ {len(icons)} icons created in {output_dir}")


if __name__ == '__main__':
    main()
