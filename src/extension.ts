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

    if (role) {
      // プレインテキストに変換
      const plain = stripMarkdown(text);
      
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
      const xPosition = role === 'ai' ? 20 : (svgWidth - bubbleWidth - 20);
      const fillColor = role === 'ai' ? '#ffffff' : '#9efb7a';
      const textColor = '#0b2b2b';

      // バブル背景（吹き出し形状）
      const tailSize = 8;
      let bubblePath = '';

      if (role === 'ai') {
        // AI: 左側の吹き出し（左下に尻尾）
        bubblePath = `
          M ${xPosition + 14} ${yPosition}
          L ${xPosition + bubbleWidth - 14} ${yPosition}
          Q ${xPosition + bubbleWidth} ${yPosition} ${xPosition + bubbleWidth} ${yPosition + 14}
          L ${xPosition + bubbleWidth} ${yPosition + bubbleHeight - 14}
          Q ${xPosition + bubbleWidth} ${yPosition + bubbleHeight} ${xPosition + bubbleWidth - 14} ${yPosition + bubbleHeight}
          L ${xPosition + 25} ${yPosition + bubbleHeight}
          L ${xPosition + 14} ${yPosition + bubbleHeight + tailSize}
          L ${xPosition + 14} ${yPosition + bubbleHeight}
          Q ${xPosition} ${yPosition + bubbleHeight} ${xPosition} ${yPosition + bubbleHeight - 14}
          L ${xPosition} ${yPosition + 14}
          Q ${xPosition} ${yPosition} ${xPosition + 14} ${yPosition}
          Z
        `;
      } else {
        // User: 右側の吹き出し（右下に尻尾）
        bubblePath = `
          M ${xPosition + 14} ${yPosition}
          L ${xPosition + bubbleWidth - 14} ${yPosition}
          Q ${xPosition + bubbleWidth} ${yPosition} ${xPosition + bubbleWidth} ${yPosition + 14}
          L ${xPosition + bubbleWidth} ${yPosition + bubbleHeight - 14}
          Q ${xPosition + bubbleWidth} ${yPosition + bubbleHeight} ${xPosition + bubbleWidth - 14} ${yPosition + bubbleHeight}
          L ${xPosition + bubbleWidth - 14} ${yPosition + bubbleHeight + tailSize}
          L ${xPosition + bubbleWidth - 25} ${yPosition + bubbleHeight}
          L ${xPosition + 14} ${yPosition + bubbleHeight}
          Q ${xPosition} ${yPosition + bubbleHeight} ${xPosition} ${yPosition + bubbleHeight - 14}
          L ${xPosition} ${yPosition + 14}
          Q ${xPosition} ${yPosition} ${xPosition + 14} ${yPosition}
          Z
        `;
      }

      svgElements += `
        <path d="${bubblePath}" fill="${fillColor}"
              stroke="rgba(3, 30, 32, 0.06)" stroke-width="1"/>
      `;

      // テキストを行ごとに配置
      textLines.forEach((textLine, index) => {
        const textY = yPosition + padding + (index + 1) * lineHeight - 4;
        const textX = xPosition + padding;
        svgElements += `
          <text x="${textX}" y="${textY}" fill="${textColor}"
                font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', Meiryo, sans-serif"
                font-size="14">${escapeXml(textLine)}</text>
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
        font-size: 14px;
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
      if (pIndex > 0) lines.push(''); // 段落間の空行
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
function parseMessages(markdown: string): { role: 'ai' | 'me' | '' , text: string }[] {
  const lines = markdown.split('\n');
  const messages: { role: 'ai' | 'me' | '' , text: string }[] = [];
  let current: { role: 'ai' | 'me' | '' , text: string } | null = null;

  for (let rawLine of lines) {
    const line = rawLine.replace(/\r$/, '');
    if (line.startsWith('@ai')) {
      // start new ai message
      current = { role: 'ai', text: line.replace('@ai', '').trim() };
      messages.push(current);
    } else if (line.startsWith('@me')) {
      // start new user message
      current = { role: 'me', text: line.replace('@me', '').trim() };
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

  const flushLists = () => {
    if (inUl) { out.push('</ul>'); inUl = false; }
    if (inOl) { out.push('</ol>'); inOl = false; }
  };

  const inline = (s: string) => {
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
  // bold/italic/code/links
  s = s.replace(/\*\*(.+?)\*\*/g, '$1');
  s = s.replace(/\*(.+?)\*/g, '$1');
  s = s.replace(/`([^`]+?)`/g, '$1');
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
  // blockquote marker
  s = s.replace(/^>\s+/gm, '');
  // list markers
  s = s.replace(/^[-\*]\s+/gm, '');
  s = s.replace(/^\d+\.\s+/gm, '');
  return s;
}