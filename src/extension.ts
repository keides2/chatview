import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

let currentPanel: vscode.WebviewPanel | undefined;

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('chatPreview.showPreview', () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('Markdownファイルを開いてください');
        return;
      }

      const markdown = editor.document.getText();
      const originalFileName = editor.document.fileName;
      const panel = vscode.window.createWebviewPanel(
        'chatPreview',
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

    vscode.commands.registerCommand('chatPreview.exportImage', async () => {
      if (!currentPanel) {
        vscode.window.showErrorMessage('プレビューを開いてください');
        return;
      }

      const formatChoice = await vscode.window.showQuickPick(
        [
          { label: 'PNG画像', value: 'png', description: '高品質なビットマップ画像' },
          { label: 'SVG画像', value: 'svg', description: 'ベクター形式（拡大縮小可能）' }
        ],
        { placeHolder: 'エクスポート形式を選択してください' }
      );

      if (formatChoice) {
        currentPanel.webview.postMessage({ command: 'doExport', format: formatChoice.value });
      }
    }),

  );
}

async function handleExport(context: vscode.ExtensionContext, message: any) {
  try {
    const puppeteer = require('puppeteer-core');

    const config = vscode.workspace.getConfiguration('chatPreview');
    let executablePath = config.get<string>('puppeteerExecutablePath');

    if (!executablePath) {
      executablePath = findChromeExecutable();
    }

    if (!executablePath) {
      vscode.window.showErrorMessage(
        'Chromeが見つかりません。設定でchatPreview.puppeteerExecutablePathを指定してください。'
      );
      return;
    }

    let browserOptions: any = {
      executablePath: executablePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    };

    const browser = await puppeteer.launch(browserOptions);
    const page = await browser.newPage();

    const styleUri = vscode.Uri.file(path.join(context.extensionPath, 'media', 'style.css'));
    const styleContent = await fs.promises.readFile(styleUri.fsPath, 'utf8');

    const html = generateExportHtml(message.markdown || '', styleContent);

    await page.setContent(html, { waitUntil: 'networkidle0' });

    const defaultFolder = config.get<string>('defaultFolder') || 'workspace';
    let defaultUri: vscode.Uri;

    if (defaultFolder === 'workspace' && vscode.workspace.workspaceFolders) {
      defaultUri = vscode.workspace.workspaceFolders[0].uri;
    } else if (defaultFolder === 'home') {
      defaultUri = vscode.Uri.file(require('os').homedir());
    } else {
      defaultUri = vscode.Uri.file(defaultFolder);
    }

    const format = message.format || 'png';
    const extension = format === 'svg' ? 'svg' : 'png';
    const filters: { [name: string]: string[] } = format === 'svg'
      ? { 'SVG画像': ['svg'], 'すべてのファイル': ['*'] }
      : { 'PNG画像': ['png'], 'すべてのファイル': ['*'] };

    // 元のファイル名からベース名を取得
    let baseName = 'chatview-export';
    if (currentPanel && (currentPanel as any).originalFileName) {
      const originalPath = (currentPanel as any).originalFileName;
      const parsed = path.parse(originalPath);
      baseName = parsed.name; // 拡張子なしのファイル名
    }

    const saveUri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.joinPath(defaultUri, `${baseName}.${extension}`),
      filters: filters
    });

    if (saveUri) {
      if (format === 'svg') {
        // SVGとして保存
        const svgContent = generateSvgContent(message.markdown || '', styleContent);
        await fs.promises.writeFile(saveUri.fsPath, svgContent, 'utf8');
      } else {
        // PNGとして保存
        await page.screenshot({
          path: saveUri.fsPath,
          fullPage: true,
          type: 'png'
        });
      }

      await browser.close();

      if (currentPanel) {
        currentPanel.webview.postMessage({
          command: 'saved',
          success: true,
          uri: saveUri.toString()
        });
      }

      vscode.window.showInformationMessage(`${format.toUpperCase()}ファイルを保存しました: ${saveUri.fsPath}`);
    } else {
      await browser.close();
      if (currentPanel) {
        currentPanel.webview.postMessage({
          command: 'saved',
          success: false,
          reason: 'ユーザーがキャンセルしました'
        });
      }
    }

  } catch (error) {
    if (currentPanel) {
      currentPanel.webview.postMessage({
        command: 'saved',
        success: false,
        reason: String(error)
      });
    }
    vscode.window.showErrorMessage(`エクスポートエラー: ${error}`);
  }
}

function findChromeExecutable(): string | undefined {
  const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Users\\' + require('os').userInfo().username + '\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  ];

  for (const chromePath of possiblePaths) {
    try {
      if (fs.existsSync(chromePath)) {
        return chromePath;
      }
    } catch (error) {
      // 無視
    }
  }

  return undefined;
}

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
      // テキストを適切な幅で折り返し（段落ごとの改行を保持）
      const maxCharsPerLine = 20;  // より短く設定
  const plain = stripMarkdown(text);
  const paragraphs = plain.split('\n');
      let textLines: string[] = [];
      paragraphs.forEach((p, idx) => {
        if (p === '') {
          // 空行は段落区切りとして空行を追加
          textLines.push('');
        } else {
          const wrapped = wrapText(p, maxCharsPerLine);
          textLines.push(...wrapped);
        }
      });
      const lineHeight = 20;
      const padding = 16;
      const bubbleHeight = Math.max(50, textLines.length * lineHeight + padding * 2);

      // 最長行の文字数から幅を計算（日本語考慮で余裕を持たせる）
      const longestLineLength = Math.max(...textLines.map(line => line.length));
      const estimatedWidth = longestLineLength * 16 + padding * 2;  // 文字幅16px想定（より広く）
      const bubbleWidth = Math.max(300, Math.min(450, estimatedWidth));  // 最小幅を300pxに増加

      const maxWidth = 720 - 40; // SVG幅 - マージン
      const finalBubbleWidth = Math.min(bubbleWidth, maxWidth * 0.65);  // 最大幅を65%に変更（より余裕）

      const xPosition = role === 'ai' ? 20 : (720 - finalBubbleWidth - 20);
      const fillColor = role === 'ai' ? '#ffffff' : '#9efb7a';
      const textColor = '#0b2b2b';

      // バブル背景（吹き出し形状）
      const tailSize = 8;
      let bubblePath = '';

      if (role === 'ai') {
        // AI: 左側の吹き出し（左下に尻尾）
        bubblePath = `
          M ${xPosition + 15} ${yPosition}
          L ${xPosition + finalBubbleWidth - 15} ${yPosition}
          Q ${xPosition + finalBubbleWidth} ${yPosition} ${xPosition + finalBubbleWidth} ${yPosition + 15}
          L ${xPosition + finalBubbleWidth} ${yPosition + bubbleHeight - 15}
          Q ${xPosition + finalBubbleWidth} ${yPosition + bubbleHeight} ${xPosition + finalBubbleWidth - 15} ${yPosition + bubbleHeight}
          L ${xPosition + 25} ${yPosition + bubbleHeight}
          L ${xPosition + 15} ${yPosition + bubbleHeight + tailSize}
          L ${xPosition + 15} ${yPosition + bubbleHeight}
          Q ${xPosition} ${yPosition + bubbleHeight} ${xPosition} ${yPosition + bubbleHeight - 15}
          L ${xPosition} ${yPosition + 15}
          Q ${xPosition} ${yPosition} ${xPosition + 15} ${yPosition}
          Z
        `;
      } else {
        // User: 右側の吹き出し（右下に尻尾）
        bubblePath = `
          M ${xPosition + 15} ${yPosition}
          L ${xPosition + finalBubbleWidth - 15} ${yPosition}
          Q ${xPosition + finalBubbleWidth} ${yPosition} ${xPosition + finalBubbleWidth} ${yPosition + 15}
          L ${xPosition + finalBubbleWidth} ${yPosition + bubbleHeight - 15}
          Q ${xPosition + finalBubbleWidth} ${yPosition + bubbleHeight} ${xPosition + finalBubbleWidth - 15} ${yPosition + bubbleHeight}
          L ${xPosition + finalBubbleWidth - 15} ${yPosition + bubbleHeight + tailSize}
          L ${xPosition + finalBubbleWidth - 25} ${yPosition + bubbleHeight}
          L ${xPosition + 15} ${yPosition + bubbleHeight}
          Q ${xPosition} ${yPosition + bubbleHeight} ${xPosition} ${yPosition + bubbleHeight - 15}
          L ${xPosition} ${yPosition + 15}
          Q ${xPosition} ${yPosition} ${xPosition + 15} ${yPosition}
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
        svgElements += `
          <text x="${xPosition + padding}" y="${textY}" fill="${textColor}"
                font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif"
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
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
        font-size: 14px;
        fill: #0b2b2b;
      }
    </style>
  </defs>
  <rect width="100%" height="100%" fill="${backgroundColor}"/>
  ${svgElements}
</svg>`;
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const lines: string[] = [];
  let currentLine = '';

  // 文字を一つずつ処理（日本語対応）
  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    // スペースで区切るか、文字数制限に達した場合に改行
    if (char === ' ' && currentLine.length > 0) {
      // スペースの場合、次の単語を確認
      let nextWord = '';
      let j = i + 1;
      while (j < text.length && text[j] !== ' ') {
        nextWord += text[j];
        j++;
      }

      // 現在行 + スペース + 次の単語が制限を超える場合は改行
      if (currentLine.length + 1 + nextWord.length > maxCharsPerLine) {
        lines.push(currentLine);
        currentLine = '';
        continue; // スペースはスキップ
      }
    }

    // 文字数制限チェック
    if (currentLine.length >= maxCharsPerLine) {
      lines.push(currentLine);
      currentLine = char;
    } else {
      currentLine += char;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [text];
}

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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function generateExportHtml(markdown: string, styleContent: string): string {
  const messages = parseMessages(markdown);
  let messagesHtml = '';

  messages.forEach(msg => {
    const role = msg.role;
    const text = msg.text;
    if (role) {
      const contentHtml = renderMarkdownToHtml(text);
      messagesHtml += `<div class="message ${role}">${contentHtml}</div>\n`;
    }
  });

  return `
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>${styleContent}</style>
      <title>Chat Export</title>
    </head>
    <body>
      <div id="chat-container">${messagesHtml}</div>
    </body>
    </html>
  `;
}

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