#!/usr/bin/env python3
"""
絵文字を使ったシンプルなサンプル用のアイコン画像を生成

使い方:
    python tools/generators/create_sample_icons_emoji.py
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_emoji_icon(size, bg_color, emoji, output_path):
    """
    円形の背景に絵文字を配置したアイコンを生成
    
    Args:
        size: アイコンのサイズ（ピクセル）
        bg_color: 背景色（RGB タプル）
        emoji: 表示する絵文字
        output_path: 出力ファイルパス
    """
    # 透明な背景で画像を作成
    img = Image.new('RGBA', (size, size), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)
    
    # 円を描画
    draw.ellipse([0, 0, size-1, size-1], fill=bg_color + (255,))
    
    # 絵文字を中央に配置
    try:
        # 絵文字フォントを試す（Windows）
        font_size = int(size * 0.6)
        font_paths = [
            "C:/Windows/Fonts/seguiemj.ttf",  # Segoe UI Emoji
            "C:/Windows/Fonts/NotoColorEmoji.ttf",  # Noto Color Emoji
            "seguiemj.ttf",
        ]
        
        font = None
        for font_path in font_paths:
            try:
                font = ImageFont.truetype(font_path, font_size)
                break
            except:
                continue
        
        if font is None:
            # フォールバック
            font = ImageFont.load_default()
            print(f"Warning: Emoji font not found, using default font for {output_path}")
    except Exception as e:
        print(f"Error loading font: {e}")
        font = ImageFont.load_default()
    
    # テキストの境界ボックスを取得
    bbox = draw.textbbox((0, 0), emoji, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    # 中央に配置
    x = (size - text_width) // 2 - bbox[0]
    y = (size - text_height) // 2 - bbox[1]
    
    draw.text((x, y), emoji, font=font, fill=(255, 255, 255, 255), embedded_color=True)
    
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
    
    # サンプルアイコンを生成（絵文字付き）
    icons = [
        {
            'name': 'speaker_dog.png',
            'bg_color': (255, 193, 7),  # アンバー
            'emoji': '🐕'
        },
        {
            'name': 'speaker_cat.png',
            'bg_color': (233, 30, 99),  # ピンク
            'emoji': '🐱'
        },
        {
            'name': 'speaker_frog.png',
            'bg_color': (76, 175, 80),  # グリーン
            'emoji': '🐸'
        },
        {
            'name': 'speaker_train.png',
            'bg_color': (33, 150, 243),  # ブルー
            'emoji': '🚆'
        },
        {
            'name': 'speaker_shark.png',
            'bg_color': (96, 125, 139),  # ブルーグレー
            'emoji': '🦈'
        },
        {
            'name': 'speaker_robot.png',
            'bg_color': (158, 158, 158),  # グレー
            'emoji': '🤖'
        },
        {
            'name': 'speaker_user.png',
            'bg_color': (121, 85, 72),  # ブラウン
            'emoji': '👤'
        }
    ]
    
    for icon in icons:
        output_path = os.path.join(output_dir, icon['name'])
        create_emoji_icon(
            size=size,
            bg_color=icon['bg_color'],
            emoji=icon['emoji'],
            output_path=output_path
        )
    
    print(f"\n✅ {len(icons)} emoji icons created in {output_dir}")


if __name__ == '__main__':
    main()
