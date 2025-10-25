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
      
      // Markdownファイルのディレクトリをリソースルートに追加（icons/フォルダーのため）
      const documentDir = path.dirname(editor.document.uri.fsPath);
      
      const panel = vscode.window.createWebviewPanel(
        'chatPreview',
        'Chat Preview',
        vscode.ViewColumn.Beside,
        {
          enableScripts: true,
          localResourceRoots: [
            vscode.Uri.file(path.join(context.extensionPath, 'media')),
            vscode.Uri.file(documentDir) // iconsフォルダーを含むディレクトリ
          ]
        }
      );

      currentPanel = panel;
      (currentPanel as any).originalFileName = originalFileName;
      
      // 元のMarkdownを保存（SVGエクスポート用）
      (currentPanel as any).originalMarkdown = markdown;
      
      // Markdownの画像パスをwebview URIに変換
      const processedMarkdown = convertIconPathsToWebviewUris(markdown, documentDir, panel.webview);
      (currentPanel as any).markdown = processedMarkdown;

      const scriptUri = panel.webview.asWebviewUri(
        vscode.Uri.file(path.join(context.extensionPath, 'media', 'script.js'))
      );
      const styleUri = panel.webview.asWebviewUri(
        vscode.Uri.file(path.join(context.extensionPath, 'media', 'style.css'))
      );

      panel.webview.html = getWebviewContent(scriptUri, styleUri);
      panel.webview.postMessage({ markdown: processedMarkdown });

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
  vscode.commands.registerCommand('chatPreview.exportImage', async () => {
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
    
    // 元のMarkdownを使用（webview経由のものはアイコンパスが変換されているため）
    const originalMarkdown = currentPanel && (currentPanel as any).originalMarkdown 
      ? (currentPanel as any).originalMarkdown 
      : message.markdown;
    
    if (!originalMarkdown) {
      throw new Error('Markdown content is missing');
    }
    
    console.log('[SVG Export] Using original markdown, length:', originalMarkdown.length);
    console.log('[SVG Export] First 200 chars:', originalMarkdown.substring(0, 200));
    
    const styleUri = vscode.Uri.file(path.join(context.extensionPath, 'media', 'style.css'));
    const styleContent = await fs.promises.readFile(styleUri.fsPath, 'utf8');
    
    // Markdownファイルのディレクトリを取得
    const markdownDir = currentPanel && (currentPanel as any).originalFileName 
      ? path.dirname((currentPanel as any).originalFileName)
      : '';
    
    const svgContent = generateSvgContent(originalMarkdown, styleContent, markdownDir);
    
    // 既存の保存処理を使用
  const config = vscode.workspace.getConfiguration('chatPreview');
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
function generateSvgContent(markdown: string, styleContent: string, markdownDir: string = ''): string {
  try {
    const messages = parseMessages(markdown);
    
    let yPosition = 30;
    let svgElements = '';

    // CSSから背景色を抽出
    const backgroundColorMatch = styleContent.match(/background-color:\s*([^;]+)/);
    const backgroundColor = backgroundColorMatch ? backgroundColorMatch[1].trim() : '#a7b6d9';

  messages.forEach(msg => {
    const role = msg.role;
    const text = msg.text;
    let icon = msg.icon || '';
    let iconImageData = ''; // Base64 PNG data for SVG <image>
    const name = msg.name || '';
    const timestamp = msg.timestamp || '';

    // <img>タグの場合はPNG画像をBase64に変換してSVGに埋め込む
    if (icon.startsWith('<img')) {
      const srcMatch = icon.match(/src="([^"]+)"/);
      if (srcMatch) {
        const iconPath = srcMatch[1];
        
        // デバッグ: 最初のアイコンだけ確認
        if (messages.indexOf(msg) === 0) {
          vscode.window.showInformationMessage(`[DEBUG] First icon path: ${iconPath}`);
        }
        
        // vscode-webview:// URIの場合はデコードして実際のパスを取得
        if (iconPath.startsWith('vscode-webview://')) {
          // vscode-webview://... のURIをデコード
          try {
            const decodedPath = decodeURIComponent(iconPath.replace(/^vscode-webview:\/\/[^/]+\//, ''));
            console.log('[SVG Export] Decoded vscode-webview path:', decodedPath);
            if (fs.existsSync(decodedPath)) {
              const imageBuffer = fs.readFileSync(decodedPath);
              const base64Data = imageBuffer.toString('base64');
              iconImageData = `data:image/png;base64,${base64Data}`;
              icon = ''; // 絵文字はクリア（画像を使用）
              console.log('[SVG Export] Successfully loaded icon from vscode-webview URI');
            } else {
              console.error('[SVG Export] File not found:', decodedPath);
              icon = role === 'ai' ? '🤖' : '👤';
            }
          } catch (error) {
            console.error('[SVG Export] Failed to load vscode-webview icon:', error);
            icon = role === 'ai' ? '🤖' : '👤';
          }
        } else if (iconPath.startsWith('icons/')) {
          // 相対パスの場合、Markdownファイルのディレクトリから読み込む
          try {
            const fullIconPath = markdownDir ? path.join(markdownDir, iconPath) : iconPath;
            
            // デバッグ: 最初のアイコンだけ確認
            if (messages.indexOf(msg) === 0) {
              vscode.window.showInformationMessage(`[DEBUG] Full path: ${fullIconPath}, exists: ${fs.existsSync(fullIconPath)}`);
            }
            
            if (fs.existsSync(fullIconPath)) {
              const imageBuffer = fs.readFileSync(fullIconPath);
              const base64Data = imageBuffer.toString('base64');
              iconImageData = `data:image/png;base64,${base64Data}`;
              icon = ''; // 絵文字はクリア（画像を使用）
              
              // デバッグ: 最初のアイコンだけ確認
              if (messages.indexOf(msg) === 0) {
                vscode.window.showInformationMessage(`[DEBUG] Image loaded successfully, base64 length: ${base64Data.length}`);
              }
            } else {
              console.error('[SVG Export] Icon file not found:', fullIconPath);
              icon = role === 'ai' ? '🤖' : '👤';
            }
          } catch (error) {
            console.error('Failed to load icon:', error);
            icon = role === 'ai' ? '🤖' : '👤';
          }
        } else {
          // その他の場合は絵文字フォールバック
          icon = role === 'ai' ? '🤖' : '👤';
        }
      } else {
        icon = role === 'ai' ? '🤖' : '👤';
      }
    }

    if (role) {
      // プレインテキストに変換
      let plain = stripMarkdown(text);

      // テキストを適切に折り返し（より自然な方法）
      const maxWidth = 450; // バブルの最大幅（ピクセル）
      let textLines = wrapTextNaturally(plain, maxWidth);

      // バブルの末尾に不要な空行が入るケースを削除（段落内の空行は維持）
      while (textLines.length > 0 && textLines[textLines.length - 1].trim() === '') {
        textLines.pop();
      }
      if (textLines.length === 0) { textLines = ['']; }

      // バブルのサイズ計算
      const lineHeight = 20;
      const padding = 12;
      const bubbleHeight = textLines.length * lineHeight + padding * 2;
      
      // 最長行から幅を計算
      const longestLine = textLines.reduce((max, line) => 
        line.length > max.length ? line : max, '');
      const textWidth = measureTextWidth(longestLine);
      const bubbleWidth = Math.min(maxWidth, textWidth + padding * 3);
      
      // 配置位置の計算
      const svgWidth = 800; // 720から800に拡大
      // アイコンサイズとギャップを確保して、名前/時刻はアイコンの横に、バブルはその外側に配置する
      const iconSize = 48; // 40から48に変更（名前/時刻表示スペース確保）
      const iconGap = 10;

      let iconX = 0;
      let bubbleX = 0;
      // 名前/時刻はアイコンの下に表示するため横幅は特にバブル配置の考慮は不要
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

  // 名前/時刻はアイコンの下に表示する
  const nameFontSize = 11;
  const timeFontSize = 9;
  const iconY = yPosition;
  // 名前に改行が含まれている場合は行数分の高さを計算（最大3行まで）
  let nameLineCount = 0;
  if (name) {
    const lines = name.split('\n').filter(line => line.trim());
    nameLineCount = Math.min(lines.length, 3);
  }
  const nameSectionHeight = (name && timestamp) 
    ? (nameLineCount * (nameFontSize + 2) + timeFontSize + 6)  // 名前の行数 + タイムスタンプ
    : (name) 
      ? (nameLineCount * (nameFontSize + 2) + 4)  // 名前の行数のみ
      : (timestamp)
        ? (timeFontSize + 6)  // タイムスタンプのみ
        : 0;
  // アイコン+名前領域（column）とバブルを横並びに配置する。
  // バブルはアイコンの中央に対して垂直中央合わせにする（プレビューに近づける）
  const columnHeight = iconSize + nameSectionHeight + 6;
  // Slight upward nudge so bubble doesn't overlap the name text visually
  const bubbleNudgeUp = 8; // pixels
  let bubbleY = yPosition + Math.max(0, Math.floor((columnHeight - bubbleHeight) / 2)) - bubbleNudgeUp;
  // prevent bubble from moving unreasonably high
  if (bubbleY < yPosition - 20) { bubbleY = yPosition - 20; }

      // バブル背景（吹き出し形状）
      const tailSize = 8;
      let bubblePath = '';

      if (role === 'ai') {
        // AI: 左側の吹き出し（左下に尻尾）
        bubblePath = `
          M ${bubbleX + 14} ${bubbleY}
          L ${bubbleX + bubbleWidth - 14} ${bubbleY}
          Q ${bubbleX + bubbleWidth} ${bubbleY} ${bubbleX + bubbleWidth} ${bubbleY + 14}
          L ${bubbleX + bubbleWidth} ${bubbleY + bubbleHeight - 14}
          Q ${bubbleX + bubbleWidth} ${bubbleY + bubbleHeight} ${bubbleX + bubbleWidth - 14} ${bubbleY + bubbleHeight}
          L ${bubbleX + 25} ${bubbleY + bubbleHeight}
          L ${bubbleX + 14} ${bubbleY + bubbleHeight + tailSize}
          L ${bubbleX + 14} ${bubbleY + bubbleHeight}
          Q ${bubbleX} ${bubbleY + bubbleHeight} ${bubbleX} ${bubbleY + bubbleHeight - 14}
          L ${bubbleX} ${bubbleY + 14}
          Q ${bubbleX} ${bubbleY} ${bubbleX + 14} ${bubbleY}
          Z
        `;
      } else {
        // User: 右側の吹き出し（右下に尻尾）
        bubblePath = `
          M ${bubbleX + 14} ${bubbleY}
          L ${bubbleX + bubbleWidth - 14} ${bubbleY}
          Q ${bubbleX + bubbleWidth} ${bubbleY} ${bubbleX + bubbleWidth} ${bubbleY + 14}
          L ${bubbleX + bubbleWidth} ${bubbleY + bubbleHeight - 14}
          Q ${bubbleX + bubbleWidth} ${bubbleY + bubbleHeight} ${bubbleX + bubbleWidth - 14} ${bubbleY + bubbleHeight}
          L ${bubbleX + bubbleWidth - 14} ${bubbleY + bubbleHeight + tailSize}
          L ${bubbleX + bubbleWidth - 25} ${bubbleY + bubbleHeight}
          L ${bubbleX + 14} ${bubbleY + bubbleHeight}
          Q ${bubbleX} ${bubbleY + bubbleHeight} ${bubbleX} ${bubbleY + bubbleHeight - 14}
          L ${bubbleX} ${bubbleY + 14}
          Q ${bubbleX} ${bubbleY} ${bubbleX + 14} ${bubbleY}
          Z
        `;
      }

  // アイコンと名前とタイムスタンプを描画
  const iconCx = iconX + iconSize / 2;
  const iconCy = iconY + iconSize / 2;
      
      // アイコン描画（画像 or 絵文字）
      if (iconImageData) {
        // PNG画像をSVG <image>タグで埋め込み
        svgElements += `
          <image x="${iconX}" y="${iconY}" width="${iconSize}" height="${iconSize}"
                 href="${iconImageData}"
                 style="border-radius: 50%;" />
        `;
      } else if (icon) {
        // 絵文字をテキストとして表示
        const iconFontSize = Math.floor(iconSize * 0.6);
        svgElements += `
          <text x="${iconCx}" y="${iconCy}" text-anchor="middle" dominant-baseline="middle"
                font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', 'Meiryo', sans-serif"
                font-size="${iconFontSize}" fill="#0b2b2b">${escapeXml(icon)}</text>
        `;
      }
      
      // 名前とタイムスタンプ（アイコンの下に表示）
      const nameTimeY = iconY + iconSize + 12; // アイコンの下に配置
      
      try {
        if (name && timestamp) {
          // 名前に改行が含まれている場合は複数行で表示
          // ただし、src= を含む行は除外（デバッグ用パス表示を防ぐ）
          const nameLines = name.split('\n')
            .filter(line => line.trim() && !line.includes('src='));
          let currentY = nameTimeY;
          
          for (let i = 0; i < Math.min(nameLines.length, 3); i++) {
            const line = nameLines[i];
            svgElements += `
              <text x="${iconCx}" y="${currentY}" text-anchor="middle" dominant-baseline="middle"
                    font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', 'Meiryo', sans-serif"
                    font-size="${nameFontSize}" fill="#666666">${escapeXml(line)}</text>
            `;
            currentY += nameFontSize + 2;
          }
          
          // タイムスタンプを最後に表示
          const timeText = escapeXml(timestamp);
          svgElements += `
            <text x="${iconCx}" y="${currentY}" text-anchor="middle" dominant-baseline="middle"
                  font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', 'Meiryo', sans-serif"
                  font-size="${timeFontSize}" fill="#999999">${timeText}</text>
          `;
        } else if (name) {
          // 名前に改行が含まれている場合は複数行で表示
          // ただし、src= を含む行は除外（デバッグ用パス表示を防ぐ）
          const nameLines = name.split('\n')
            .filter(line => line.trim() && !line.includes('src='));
          let currentY = nameTimeY;
          
          for (let i = 0; i < Math.min(nameLines.length, 3); i++) {
            const line = nameLines[i];
            svgElements += `
              <text x="${iconCx}" y="${currentY}" text-anchor="middle" dominant-baseline="middle"
                    font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', 'Meiryo', sans-serif"
                    font-size="${nameFontSize}" fill="#666666">${escapeXml(line)}</text>
            `;
            currentY += nameFontSize + 2;
          }
        } else if (timestamp) {
          svgElements += `
            <text x="${iconCx}" y="${nameTimeY}" text-anchor="middle" dominant-baseline="middle"
                  font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', 'Meiryo', sans-serif"
                  font-size="${timeFontSize}" fill="#999999">${escapeXml(timestamp)}</text>
          `;
        }
      } catch (error) {
        console.error('Error rendering name/timestamp:', error);
        // フォールバック: シンプルな1行表示
        if (name) {
          svgElements += `
            <text x="${iconCx}" y="${nameTimeY}" text-anchor="middle" dominant-baseline="middle"
                  font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', 'Meiryo', sans-serif"
                  font-size="${nameFontSize}" fill="#666666">${escapeXml(name.replace(/\n/g, ' '))}</text>
          `;
        }
        if (timestamp) {
          svgElements += `
            <text x="${iconCx}" y="${nameTimeY + nameFontSize + 2}" text-anchor="middle" dominant-baseline="middle"
                  font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', 'Meiryo', sans-serif"
                  font-size="${timeFontSize}" fill="#999999">${escapeXml(timestamp)}</text>
          `;
        }
      }

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

      // バブルのパスを描画
      svgElements += `
        <path d="${bubblePath}" fill="${fillColor}"
              stroke="rgba(3, 30, 32, 0.06)" stroke-width="1"/>
      `;

      textLines.forEach((textLine, index) => {
        const textY = bubbleY + padding + index * lineHeight + 16;
        const textX = bubbleX + padding;
        const inner = svgInlineFormat(textLine, textColor, 14);
        svgElements += `
          <text x="${textX}" y="${textY}" fill="${textColor}"
                font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', Meiryo, sans-serif"
                font-size="14">${inner}</text>
        `;
      });

  // advance yPosition by the greater of bubble height or column (icon+name) height
  const blockHeight = Math.max(bubbleHeight, columnHeight);
  yPosition += blockHeight + 15;
    }
  });

  const totalHeight = yPosition + 20;
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="${totalHeight}" viewBox="0 0 800 ${totalHeight}">
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
  } catch (error) {
    console.error('generateSvgContent: error', error);
    // エラー時は最小限のSVGを返す
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <rect width="100%" height="100%" fill="#a7b6d9"/>
  <text x="400" y="300" text-anchor="middle" fill="#333" font-size="16">エラー: SVG生成に失敗しました</text>
  <text x="400" y="330" text-anchor="middle" fill="#666" font-size="12">${String(error).substring(0, 100)}</text>
</svg>`;
  }
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
function parseMessages(markdown: string): { role: 'ai' | 'me' | '' , icon: string, name: string, timestamp: string, text: string }[] {
  const lines = markdown.split('\n');
  const messages: { role: 'ai' | 'me' | '' , icon: string, name: string, timestamp: string, text: string }[] = [];
  let current: { role: 'ai' | 'me' | '' , icon: string, name: string, timestamp: string, text: string } | null = null;

  const DEFAULT_AI_ICON = '🤖';
  const DEFAULT_ME_ICON = '👤';

  for (let rawLine of lines) {
    const line = rawLine.replace(/\r$/, '');
    
    // @ai[絵文字 名前]{タイムスタンプ} または @me[絵文字 名前]{タイムスタンプ} の形式をチェック
    const aiMatch = line.match(/^@ai(?:\[([^\]]*)\])?(?:\{([^}]*)\})?\s*(.*)/);
    const meMatch = line.match(/^@me(?:\[([^\]]*)\])?(?:\{([^}]*)\})?\s*(.*)/);
    
    if (aiMatch) {
      let icon = DEFAULT_AI_ICON;
      let name = '';
      if (aiMatch[1] !== undefined) {
        const content = aiMatch[1].trim();
        
        // <img>タグがある場合は特別処理
        if (content.startsWith('<img')) {
          const imgEndIndex = content.indexOf('/>');
          if (imgEndIndex !== -1) {
            // <img ... />全体を抽出
            icon = content.substring(0, imgEndIndex + 2);
            // 残りの部分を名前として処理
            const remainingText = content.substring(imgEndIndex + 2).trim();
            if (remainingText) {
              const restParts = remainingText.split(/\s+/);
              let englishPart: string[] = [];
              let japanesePart: string[] = [];
              for (const part of restParts) {
                if (/^[a-zA-Z]+$/.test(part)) {
                  englishPart.push(part);
                } else {
                  japanesePart.push(part);
                }
              }
              if (englishPart.length > 0 && japanesePart.length > 0) {
                name = englishPart.join(' ') + '\n' + japanesePart.join(' ');
              } else {
                name = restParts.join(' ');
              }
            }
          }
        } else {
          // 通常の絵文字の場合
          const parts = content.split(/\s+/);
          icon = parts[0] || DEFAULT_AI_ICON;
          if (parts.length > 1) {
            // 英語名と漢字名の間に改行を挿入
            const restParts = parts.slice(1);
            let englishPart: string[] = [];
            let japanesePart: string[] = [];
            for (const part of restParts) {
              if (/^[a-zA-Z]+$/.test(part)) {
                englishPart.push(part);
              } else {
                japanesePart.push(part);
              }
            }
            if (englishPart.length > 0 && japanesePart.length > 0) {
              name = englishPart.join(' ') + '\n' + japanesePart.join(' ');
            } else {
              name = restParts.join(' ');
            }
          }
        }
      }
      const timestamp = aiMatch[2] || '';
      current = { role: 'ai', icon: icon, name: name, timestamp: timestamp, text: aiMatch[3] };
      messages.push(current);
    } else if (meMatch) {
      let icon = DEFAULT_ME_ICON;
      let name = '';
      if (meMatch[1] !== undefined) {
        const content = meMatch[1].trim();
        
        // <img>タグがある場合は特別処理
        if (content.startsWith('<img')) {
          const imgEndIndex = content.indexOf('/>');
          if (imgEndIndex !== -1) {
            // <img ... />全体を抽出
            icon = content.substring(0, imgEndIndex + 2);
            // 残りの部分を名前として処理
            const remainingText = content.substring(imgEndIndex + 2).trim();
            if (remainingText) {
              const restParts = remainingText.split(/\s+/);
              let englishPart: string[] = [];
              let japanesePart: string[] = [];
              for (const part of restParts) {
                if (/^[a-zA-Z]+$/.test(part)) {
                  englishPart.push(part);
                } else {
                  japanesePart.push(part);
                }
              }
              if (englishPart.length > 0 && japanesePart.length > 0) {
                name = englishPart.join(' ') + '\n' + japanesePart.join(' ');
              } else {
                name = restParts.join(' ');
              }
            }
          }
        } else {
          // 通常の絵文字の場合
          const parts = content.split(/\s+/);
          icon = parts[0] || DEFAULT_ME_ICON;
          if (parts.length > 1) {
            // 英語名と漢字名の間に改行を挿入
            const restParts = parts.slice(1);
            let englishPart: string[] = [];
            let japanesePart: string[] = [];
            for (const part of restParts) {
              if (/^[a-zA-Z]+$/.test(part)) {
                englishPart.push(part);
              } else {
                japanesePart.push(part);
              }
            }
            if (englishPart.length > 0 && japanesePart.length > 0) {
              name = englishPart.join(' ') + '\n' + japanesePart.join(' ');
            } else {
              name = restParts.join(' ');
            }
          }
        }
      }
      const timestamp = meMatch[2] || '';
      current = { role: 'me', icon: icon, name: name, timestamp: timestamp, text: meMatch[3] };
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

// iconsディレクトリの画像パスをwebview URIに変換
function convertIconPathsToWebviewUris(markdown: string, baseDir: string, webview: vscode.Webview): string {
  // <img src="icons/speaker_XXX.png" のパターンを検索して変換
  return markdown.replace(
    /<img\s+src="(icons\/[^"]+)"/g,
    (match, iconPath) => {
      const fullPath = path.join(baseDir, iconPath);
      const webviewUri = webview.asWebviewUri(vscode.Uri.file(fullPath));
      return `<img src="${webviewUri.toString()}"`;
    }
  );
}