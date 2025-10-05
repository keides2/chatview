import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

let currentPanel: vscode.WebviewPanel | undefined;

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
  vscode.commands.registerCommand('chatPreviewEnterprise.showPreview', () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('Markdownファイルを開いてください');
        return;
      }

      const markdown = editor.document.getText();
      const originalFileName = editor.document.fileName;
      const panel = vscode.window.createWebviewPanel(
        'chatPreviewEnterprise',
        'Chat Preview',
        vscode.ViewColumn.Beside,
        {
          enableScripts: true,
          localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'media'))]
        }
      );

      currentPanel = panel;
      (currentPanel as any).originalFileName = originalFileName;
      (currentPanel as any).markdown = markdown;

      const scriptUri = panel.webview.asWebviewUri(
        vscode.Uri.file(path.join(context.extensionPath, 'media', 'script.js'))
      );
      const styleUri = panel.webview.asWebviewUri(
        vscode.Uri.file(path.join(context.extensionPath, 'media', 'style.css'))
      );

      panel.webview.html = getWebviewContent(scriptUri, styleUri);
      panel.webview.postMessage({ markdown });

      // パネルがアクティブになった時にコンテンツを再送信
      panel.onDidChangeViewState(() => {
        if (panel.visible && (panel as any).markdown) {
          panel.webview.postMessage({ markdown: (panel as any).markdown });
        }
      });

      panel.webview.onDidReceiveMessage(async (message) => {
        if (message.command === 'export') {
          await handleExport(context, message);
        }
      });

      panel.onDidDispose(() => {
        currentPanel = undefined;
      });
    }),

    // exportImageコマンドでSVGのみ提供
  vscode.commands.registerCommand('chatPreviewEnterprise.exportImage', async () => {
      if (!currentPanel) {
        vscode.window.showErrorMessage('プレビューを開いてください');
        return;
      }
    
      // SVG固定で実行
      currentPanel.webview.postMessage({ 
        command: 'doExport', 
        format: 'svg' 
      });
    })
  );
}

// extension.tsのhandleExport関数をSVG専用に簡略化
async function handleExport(context: vscode.ExtensionContext, message: any) {
  try {
    // SVGのみサポート（Playwrightは使用しない）
    const format = 'svg';
    
    const styleUri = vscode.Uri.file(path.join(context.extensionPath, 'media', 'style.css'));
    const styleContent = await fs.promises.readFile(styleUri.fsPath, 'utf8');
    const svgContent = generateSvgContent(message.markdown || '', styleContent);
    
    // 既存の保存処理を使用
  const config = vscode.workspace.getConfiguration('chatPreviewEnterprise');
    const defaultFolder = config.get<string>('defaultFolder') || 'workspace';
    let defaultUri: vscode.Uri;
    if (defaultFolder === 'workspace' && vscode.workspace.workspaceFolders) {
      defaultUri = vscode.workspace.workspaceFolders[0].uri;
    } else if (defaultFolder === 'home') {
      defaultUri = vscode.Uri.file(require('os').homedir());
    } else {
      defaultUri = vscode.Uri.file(defaultFolder);
    }
    
    const filters: { [name: string]: string[] } = { 'SVG画像': ['svg'], 'すべてのファイル': ['*'] };
    
    let baseName = 'chatview-export';
    if (currentPanel && (currentPanel as any).originalFileName) {
      const originalPath = (currentPanel as any).originalFileName;
      const parsed = path.parse(originalPath);
      baseName = parsed.name;
    }
    
    const saveUri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.joinPath(defaultUri, `${baseName}.svg`),
      filters: filters
    });
    
    if (saveUri) {
      await fs.promises.writeFile(saveUri.fsPath, svgContent, 'utf8');
      
      if (currentPanel) {
        currentPanel.webview.postMessage({
          command: 'saved',
          success: true,
          uri: saveUri.toString()
        });
      }
      
      vscode.window.showInformationMessage(`SVGファイルを保存しました: ${saveUri.fsPath}`);
    } else {
      if (currentPanel) {
        currentPanel.webview.postMessage({
          command: 'saved',
          success: false,
          reason: 'ユーザーがキャンセルしました'
        });
      }
    }
  } catch (error: any) {
    if (currentPanel) {
      currentPanel.webview.postMessage({
        command: 'saved',
        success: false,
        reason: String(error)
      });
    }
    vscode.window.showErrorMessage(`エクスポートエラー: ${error?.message || String(error)}`);
  }
}

// SVGコンテンツ生成関数
function generateSvgContent(markdown: string, styleContent: string): string {
  const messages = parseMessages(markdown);
  let yPosition = 30;
  let svgElements = '';

  // CSSから背景色を抽出
  const backgroundColorMatch = styleContent.match(/background-color:\s*([^;]+)/);
  const backgroundColor = backgroundColorMatch ? backgroundColorMatch[1].trim() : '#a7b6d9';

  messages.forEach(msg => {
    const role = msg.role;
    const text = msg.text;
    const icon = msg.icon || '';
    const name = msg.name || '';

    if (role) {
      // プレインテキストに変換
      let plain = stripMarkdown(text);

      // テキストを適切に折り返し（より自然な方法）
      const maxWidth = 450; // バブルの最大幅（ピクセル）
      const textLines = wrapTextNaturally(plain, maxWidth);
      
      // バブルのサイズ計算
      const lineHeight = 20;
      const padding = 14;
      const bubbleHeight = Math.max(50, textLines.length * lineHeight + padding * 2);
      
      // 最長行から幅を計算
      const longestLine = textLines.reduce((max, line) => 
        line.length > max.length ? line : max, '');
      const textWidth = measureTextWidth(longestLine);
      const bubbleWidth = Math.min(maxWidth, textWidth + padding * 3);
      
      // 配置位置の計算
      const svgWidth = 720;
      // アイコンサイズとギャップを確保して、バブルはアイコンの外側に配置する
      const iconSize = 40;
      const iconGap = 10;
      let iconX = 0;
      let bubbleX = 0;
      if (role === 'ai') {
        // 左側にアイコン、バブルはその右
        iconX = 20;
        bubbleX = iconX + iconSize + iconGap;
      } else {
        // 右側にアイコン、バブルはその左
        iconX = svgWidth - 20 - iconSize;
        bubbleX = iconX - iconGap - bubbleWidth;
      }
      const fillColor = role === 'ai' ? '#ffffff' : '#9efb7a';
      const textColor = '#0b2b2b';

      // バブル背景（吹き出し形状）
      const tailSize = 8;
      let bubblePath = '';

      if (role === 'ai') {
        // AI: 左側の吹き出し（左下に尻尾）
        bubblePath = `
          M ${bubbleX + 14} ${yPosition}
          L ${bubbleX + bubbleWidth - 14} ${yPosition}
          Q ${bubbleX + bubbleWidth} ${yPosition} ${bubbleX + bubbleWidth} ${yPosition + 14}
          L ${bubbleX + bubbleWidth} ${yPosition + bubbleHeight - 14}
          Q ${bubbleX + bubbleWidth} ${yPosition + bubbleHeight} ${bubbleX + bubbleWidth - 14} ${yPosition + bubbleHeight}
          L ${bubbleX + 25} ${yPosition + bubbleHeight}
          L ${bubbleX + 14} ${yPosition + bubbleHeight + tailSize}
          L ${bubbleX + 14} ${yPosition + bubbleHeight}
          Q ${bubbleX} ${yPosition + bubbleHeight} ${bubbleX} ${yPosition + bubbleHeight - 14}
          L ${bubbleX} ${yPosition + 14}
          Q ${bubbleX} ${yPosition} ${bubbleX + 14} ${yPosition}
          Z
        `;
      } else {
        // User: 右側の吹き出し（右下に尻尾）
        bubblePath = `
          M ${bubbleX + 14} ${yPosition}
          L ${bubbleX + bubbleWidth - 14} ${yPosition}
          Q ${bubbleX + bubbleWidth} ${yPosition} ${bubbleX + bubbleWidth} ${yPosition + 14}
          L ${bubbleX + bubbleWidth} ${yPosition + bubbleHeight - 14}
          Q ${bubbleX + bubbleWidth} ${yPosition + bubbleHeight} ${bubbleX + bubbleWidth - 14} ${yPosition + bubbleHeight}
          L ${bubbleX + bubbleWidth - 14} ${yPosition + bubbleHeight + tailSize}
          L ${bubbleX + bubbleWidth - 25} ${yPosition + bubbleHeight}
          L ${bubbleX + 14} ${yPosition + bubbleHeight}
          Q ${bubbleX} ${yPosition + bubbleHeight} ${bubbleX} ${yPosition + bubbleHeight - 14}
          L ${bubbleX} ${yPosition + 14}
          Q ${bubbleX} ${yPosition} ${bubbleX + 14} ${yPosition}
          Z
        `;
      }

      // アイコンと名前を描画
      const iconY = yPosition;
      const iconCx = iconX + iconSize / 2;
      const iconCy = iconY + iconSize / 2;
      
      // アイコン（絵文字）
      if (icon) {
        const iconFontSize = Math.floor(iconSize * 0.65);
        svgElements += `
          <text x="${iconCx}" y="${iconCy}" text-anchor="middle" dominant-baseline="middle"
                font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', 'Meiryo', sans-serif"
                font-size="${iconFontSize}" fill="#0b2b2b">${escapeXml(icon)}</text>
        `;
      }
      
      // 名前（アイコンの下に小さく表示）
      if (name) {
        const nameY = iconY + iconSize + 12;
        const nameFontSize = 11;
        svgElements += `
          <text x="${iconCx}" y="${nameY}" text-anchor="middle" dominant-baseline="middle"
                font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', 'Meiryo', sans-serif"
                font-size="${nameFontSize}" fill="#666666">${escapeXml(name)}</text>
        `;
      }

      svgElements += `
        <path d="${bubblePath}" fill="${fillColor}"
              stroke="rgba(3, 30, 32, 0.06)" stroke-width="1"/>
      `;

      // テキストを行ごとに配置
      // SVG内で簡易Markdownを反映（**bold**, *italic*, `code` を tspan に変換）
      const svgInlineFormat = (s: string, color: string, baseFontSize = 14) => {
  if (!s) { return ''; }
        // まず生テキストをエスケープ
        let t = s;
        // code (inline)
        t = t.replace(/`([^`]+?)`/g, (m, g1) => {
          return `<tspan font-family="monospace" font-size="${Math.floor(baseFontSize * 0.9)}" fill="${color}">${escapeXml(g1)}</tspan>`;
        });
        // bold
        t = t.replace(/\*\*(.+?)\*\*/g, (m, g1) => {
          return `<tspan font-weight="bold" fill="${color}">${escapeXml(g1)}</tspan>`;
        });
        // italic
        t = t.replace(/\*(.+?)\*/g, (m, g1) => {
          return `<tspan font-style="italic" fill="${color}">${escapeXml(g1)}</tspan>`;
        });
        // fallback: escape remaining
        // Note: replacements already escaped inner content; escape any leftover < or &
        t = t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        // restore allowed tspan tags (they were escaped) - but ensure we didn't double-escape
        t = t.replace(/&lt;tspan/g, '<tspan').replace(/&lt;\/tspan&gt;/g, '</tspan>');
        return t;
      };

      textLines.forEach((textLine, index) => {
        const textY = yPosition + padding + (index + 1) * lineHeight - 4;
        const textX = bubbleX + padding;
        const inner = svgInlineFormat(textLine, textColor, 14);
        svgElements += `
          <text x="${textX}" y="${textY}" fill="${textColor}"
                font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', Meiryo, sans-serif"
                font-size="14">${inner}</text>
        `;
      });

      yPosition += bubbleHeight + tailSize + 15;
    }
  });

  const totalHeight = yPosition + 20;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="720" height="${totalHeight}" viewBox="0 0 720 ${totalHeight}">
  <defs>
    <style>
      text {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", "Hiragino Kaku Gothic ProN", Meiryo, sans-serif;
        fill: #0b2b2b;
      }
    </style>
  </defs>
  <rect width="100%" height="100%" fill="${backgroundColor}"/>
  ${svgElements}
</svg>`;
}

// テキスト幅を推定（日本語・英語混在対応）
function measureTextWidth(text: string): number {
  let width = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const code = char.charCodeAt(0);
    
    // 日本語文字（ひらがな、カタカナ、漢字）
    if ((code >= 0x3040 && code <= 0x309F) || // ひらがな
        (code >= 0x30A0 && code <= 0x30FF) || // カタカナ
        (code >= 0x4E00 && code <= 0x9FFF) || // 漢字
        (code >= 0xFF01 && code <= 0xFF5E)) { // 全角英数
      width += 15; // 日本語文字幅
    } else {
      width += 8; // 英数字幅
    }
  }
  return width;
}

// 自然な折り返し（単語を途中で切らない）
function wrapTextNaturally(text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  const paragraphs = text.split('\n');
  
  paragraphs.forEach((paragraph, pIndex) => {
    if (paragraph.trim() === '') {
      if (pIndex > 0) { lines.push(''); } // 段落間の空行
      return;
    }
    
    let currentLine = '';
    let i = 0;
    
    while (i < paragraph.length) {
      // 次の単語または文字を取得
      let word = '';
      
      // 英単語の場合はスペースまで取得
      if (paragraph[i].match(/[a-zA-Z0-9]/)) {
        while (i < paragraph.length && paragraph[i].match(/[a-zA-Z0-9]/)) {
          word += paragraph[i];
          i++;
        }
        // スペースも含める
        if (i < paragraph.length && paragraph[i] === ' ') {
          word += ' ';
          i++;
        }
      } else {
        // 日本語や記号は1文字ずつ
        word = paragraph[i];
        i++;
      }
      
      // 現在行 + 新しい単語の幅を計算
      const testLine = currentLine + word;
      const testWidth = measureTextWidth(testLine);
      
      // 現在行に追加できるかチェック
      if (testWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        // 現在行が空でない場合は確定して改行
        if (currentLine.trim()) {
          lines.push(currentLine.trimEnd());
          currentLine = word.trimStart();
        } else {
          // 現在行が空の場合（1単語が長すぎる）、強制的に追加
          currentLine = word;
        }
      }
    }
    
    // 最後の行を追加
    if (currentLine.trim()) {
      lines.push(currentLine.trimEnd());
    }
  });
  
  return lines.length > 0 ? lines : [''];
}

// XMLエスケープ
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Parse markdown lines into message objects. Lines starting with @ai or @me start a new message.
// Lines without a role prefix are treated as continuation lines and appended with a newline.
function parseMessages(markdown: string): { role: 'ai' | 'me' | '' , icon: string, name: string, text: string }[] {
  const lines = markdown.split('\n');
  const messages: { role: 'ai' | 'me' | '' , icon: string, name: string, text: string }[] = [];
  let current: { role: 'ai' | 'me' | '' , icon: string, name: string, text: string } | null = null;

  const DEFAULT_AI_ICON = '🤖';
  const DEFAULT_ME_ICON = '👤';

  for (let rawLine of lines) {
    const line = rawLine.replace(/\r$/, '');
    
    // @ai[絵文字 名前] または @me[絵文字 名前] の形式をチェック
    const aiMatch = line.match(/^@ai(?:\[([^\]]*)\])?\s*(.*)/);
    const meMatch = line.match(/^@me(?:\[([^\]]*)\])?\s*(.*)/);
    
    if (aiMatch) {
      let icon = DEFAULT_AI_ICON;
      let name = '';
      if (aiMatch[1] !== undefined) {
        const parts = aiMatch[1].trim().split(/\s+/);
        icon = parts[0] || DEFAULT_AI_ICON;
        name = parts.length > 1 ? parts.slice(1).join(' ') : '';
      }
      current = { role: 'ai', icon: icon, name: name, text: aiMatch[2] };
      messages.push(current);
    } else if (meMatch) {
      let icon = DEFAULT_ME_ICON;
      let name = '';
      if (meMatch[1] !== undefined) {
        const parts = meMatch[1].trim().split(/\s+/);
        icon = parts[0] || DEFAULT_ME_ICON;
        name = parts.length > 1 ? parts.slice(1).join(' ') : '';
      }
      current = { role: 'me', icon: icon, name: name, text: meMatch[2] };
      messages.push(current);
    } else {
      // continuation or unrelated line
      if (current) {
        // append as continuation with explicit newline
        current.text += '\n' + line;
      } else {
        // no current message: ignore or treat as anonymous (skip)
        // We'll skip lines until a role-prefixed line appears
      }
    }
  }

  return messages;
}

// Escape HTML special characters to prevent XSS
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Generate the HTML content for the webview
function getWebviewContent(scriptUri: vscode.Uri, styleUri: vscode.Uri): string {
  return `
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link href="${styleUri}" rel="stylesheet">
      <title>Chat Preview</title>
    </head>
    <body>
      <div id="chat-container"></div>
      <script src="${scriptUri}"></script>
    </body>
    </html>
  `;
}

// Render a limited subset of Markdown to HTML for display inside bubbles.
function renderMarkdownToHtml(text: string): string {
  if (!text) { return ''; }
  // work with escaped text to avoid XSS
  const esc = escapeHtml(text);
  const lines = esc.split('\n');
  const out: string[] = [];
  let inUl = false;
  let inOl = false;
  let inCodeBlock = false;
  let codeBuffer: string[] = [];

  const flushLists = () => {
    if (inUl) { out.push('</ul>'); inUl = false; }
    if (inOl) { out.push('</ol>'); inOl = false; }
  };

  const inline = (s: string) => {
    // images ![alt](url)
    s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');
    // bold **text**
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // italic *text*
    s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // inline code `code`
    s = s.replace(/`([^`]+?)`/g, '<code>$1</code>');
    // links [text](url)
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    return s;
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    // fenced code block support
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBuffer = [];
        continue;
      } else {
        inCodeBlock = false;
        out.push(`<pre><code>${codeBuffer.join('\n')}</code></pre>`);
        codeBuffer = [];
        continue;
      }
    }
    if (inCodeBlock) { codeBuffer.push(escapeHtml(raw)); continue; }
    if (line.match(/^#{1,6}\s+/)) {
      flushLists();
      const m = line.match(/^(#{1,6})\s+(.*)$/)!;
      out.push(`<div class="md-heading">${inline(m[2])}</div>`);
      continue;
    }

    if (line.match(/^>\s+/)) {
      flushLists();
      const m = line.match(/^>\s+(.*)$/)!;
      out.push(`<blockquote>${inline(m[1])}</blockquote>`);
      continue;
    }

    if (line.match(/^[-\*]\s+/)) {
      if (!inUl) { out.push('<ul>'); inUl = true; }
      const m = line.match(/^[-\*]\s+(.*)$/)!;
      out.push(`<li>${inline(m[1])}</li>`);
      continue;
    }

    if (line.match(/^\d+\.\s+/)) {
      if (!inOl) { out.push('<ol>'); inOl = true; }
      const m = line.match(/^(\d+)\.\s+(.*)$/)!;
      out.push(`<li>${inline(m[2])}</li>`);
      continue;
    }

    if (line === '') {
      // blank line -> paragraph break
      flushLists();
      out.push('<div class="md-paragraph"></div>');
      continue;
    }

    // normal text
    out.push(`<div class="md-line">${inline(raw)}</div>`);
  }

  flushLists();
  return out.join('');
}

// Strip markdown markers for plain-text rendering (used for SVG export)
function stripMarkdown(text: string): string {
  if (!text) { return ''; }
  let s = text;
  // remove headings
  s = s.replace(/^#{1,6}\s+/gm, '');
  // fenced code blocks
  s = s.replace(/```[\s\S]*?```/g, '');
  // bold/italic/code/links/images
  s = s.replace(/\*\*(.+?)\*\*/g, '$1');
  s = s.replace(/\*(.+?)\*/g, '$1');
  s = s.replace(/`([^`]+?)`/g, '$1');
  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '');
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
  // blockquote marker
  s = s.replace(/^>\s+/gm, '');
  // list markers
  s = s.replace(/^[-\*]\s+/gm, '');
  s = s.replace(/^\d+\.\s+/gm, '');
  return s;
  // remove leading empty [] tokens (e.g. '[] text')
  s = s.replace(/^\s*\[\s*\]\s*/g, '');
}