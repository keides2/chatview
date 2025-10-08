const DEBUG = true;

let currentMarkdown = '';

// デフォルトの絵文字
const DEFAULT_AI_ICON = '🤖';
const DEFAULT_ME_ICON = '👤';

function parseMessages(markdown) {
  const lines = markdown.split('\n');
  const messages = [];
  let current = null;

  for (let rawLine of lines) {
    const line = rawLine.replace(/\r$/, '');
    
    // @ai[絵文字 名前]{タイムスタンプ} または @me[絵文字 名前]{タイムスタンプ} の形式をチェック
    // タイムスタンプは省略可能
    const aiMatch = line.match(/^@ai(?:\[([^\]]*)\])?(?:\{([^}]*)\})?\s*(.*)/);
    const meMatch = line.match(/^@me(?:\[([^\]]*)\])?(?:\{([^}]*)\})?\s*(.*)/);
    
    if (aiMatch) {
      let icon = DEFAULT_AI_ICON;
      let name = '';
      if (aiMatch[1] !== undefined) {
        const content = aiMatch[1].trim();
        // <img タグがある場合は特別処理
        if (content.startsWith('<img')) {
          const imgEndIndex = content.indexOf('/>');
          if (imgEndIndex !== -1) {
            icon = content.substring(0, imgEndIndex + 2).trim();
            const remainingText = content.substring(imgEndIndex + 2).trim();
            if (remainingText) {
              // 名前を処理
              const nameParts = remainingText.split(/\s+/);
              let englishPart = [];
              let japanesePart = [];
              for (const part of nameParts) {
                if (/^[a-zA-Z]+$/.test(part)) {
                  englishPart.push(part);
                } else {
                  japanesePart.push(part);
                }
              }
              if (englishPart.length > 0 && japanesePart.length > 0) {
                name = englishPart.join(' ') + '\n' + japanesePart.join(' ');
              } else {
                name = nameParts.join(' ');
              }
            }
          }
        } else {
          // 通常の絵文字処理
          const parts = content.split(/\s+/);
          icon = parts[0] || DEFAULT_AI_ICON;
          if (parts.length > 1) {
            const restParts = parts.slice(1);
            let englishPart = [];
            let japanesePart = [];
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
        // <img タグがある場合は特別処理
        if (content.startsWith('<img')) {
          const imgEndIndex = content.indexOf('/>');
          if (imgEndIndex !== -1) {
            icon = content.substring(0, imgEndIndex + 2).trim();
            const remainingText = content.substring(imgEndIndex + 2).trim();
            if (remainingText) {
              // 名前を処理
              const nameParts = remainingText.split(/\s+/);
              let englishPart = [];
              let japanesePart = [];
              for (const part of nameParts) {
                if (/^[a-zA-Z]+$/.test(part)) {
                  englishPart.push(part);
                } else {
                  japanesePart.push(part);
                }
              }
              if (englishPart.length > 0 && japanesePart.length > 0) {
                name = englishPart.join(' ') + '\n' + japanesePart.join(' ');
              } else {
                name = nameParts.join(' ');
              }
            }
          }
        } else {
          // 通常の絵文字処理
          const parts = content.split(/\s+/);
          icon = parts[0] || DEFAULT_ME_ICON;
          if (parts.length > 1) {
            const restParts = parts.slice(1);
            let englishPart = [];
            let japanesePart = [];
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
      if (current) {
        current.text += '\n' + line;
      } else {
        // ignore lines until a role-prefixed line appears
      }
    }
  }

  return messages;
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function renderMarkdownToHtml(text) {
  if (!text) { return ''; }
  const esc = escapeHtml(text);
  const lines = esc.split('\n');
  const out = [];
  let inUl = false;
  let inOl = false;
  let inCodeBlock = false;
  let codeBuffer = [];

  const flush = () => {
    if (inUl) { out.push('</ul>'); inUl = false; }
    if (inOl) { out.push('</ol>'); inOl = false; }
  };

  const inline = (s) => {
    // イメージ ![alt](url)
    s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; height: auto;" />');
    // 太字 **text**
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // イタリック *text* (太字の後に処理することが重要)
    s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // インラインコード `code`
    s = s.replace(/`([^`]+?)`/g, '<code>$1</code>');
    // リンク [text](url)
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    return s;
  };

  for (let raw of lines) {
    const line = raw.trim();
    
    // コードブロックの処理
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
    if (inCodeBlock) {
      codeBuffer.push(escapeHtml(raw));
      continue;
    }
    
    if (line.match(/^#{1,6}\s+/)) {
      flush();
      const m = line.match(/^(#{1,6})\s+(.*)$/);
      out.push(`<div class="md-heading">${inline(m[2])}</div>`);
      continue;
    }
    if (line.match(/^>\s+/)) {
      flush();
      const m = line.match(/^>\s+(.*)$/);
      out.push(`<blockquote>${inline(m[1])}</blockquote>`);
      continue;
    }
    if (line.match(/^[-\*]\s+/)) {
      if (!inUl) { out.push('<ul>'); inUl = true; }
      const m = line.match(/^[-\*]\s+(.*)$/);
      out.push(`<li>${inline(m[1])}</li>`);
      continue;
    }
    if (line.match(/^\d+\.\s+/)) {
      if (!inOl) { out.push('<ol>'); inOl = true; }
      const m = line.match(/^(\d+)\.\s+(.*)$/);
      out.push(`<li>${inline(m[2])}</li>`);
      continue;
    }
    if (line === '') {
      flush();
      out.push('<div class="md-paragraph"></div>');
      continue;
    }
    // 通常のテキスト行
    out.push(`<div class="md-line">${inline(raw)}</div>`);
  }

  flush();
  return out.join('');
}

window.addEventListener('message', event => {
  if (!event.data || !event.data.markdown) { return; }
  const markdown = event.data.markdown;
  currentMarkdown = markdown;
  const messages = parseMessages(markdown);

  const container = document.getElementById('chat-container');
  container.innerHTML = '';

  // 初期表示件数を制限（パフォーマンス対策）
  const INITIAL_LOAD = 50;
  const LOAD_MORE = 50;
  let currentIndex = 0;

  function renderMessages(startIndex, count) {
    const endIndex = Math.min(startIndex + count, messages.length);
    
    for (let i = startIndex; i < endIndex; i++) {
      const msg = messages[i];
      if (!msg.role) { continue; }
      
      // メッセージコンテナを作成
      const messageContainer = document.createElement('div');
      messageContainer.className = `message-container ${msg.role}`;
      
      // アイコンと名前のコンテナ
      const infoContainer = document.createElement('div');
      infoContainer.className = 'message-info';
      
      // アイコン要素（空文字列でない場合のみ）
      if (msg.icon) {
        const iconDiv = document.createElement('div');
        iconDiv.className = 'message-icon';
        // HTMLタグの場合はinnerHTMLを使用
        if (msg.icon.startsWith('<img')) {
          // loading="lazy"属性を追加して遅延読み込み
          const lazyIcon = msg.icon.replace('<img ', '<img loading="lazy" ');
          iconDiv.innerHTML = lazyIcon;
        } else {
          iconDiv.textContent = msg.icon;
        }
        infoContainer.appendChild(iconDiv);
      }
      
      // 名前とタイムスタンプのコンテナ
      const nameTimeContainer = document.createElement('div');
      nameTimeContainer.className = 'message-name-time';
      
      // 名前要素（空文字列でない場合のみ）
      if (msg.name) {
        const nameDiv = document.createElement('div');
        nameDiv.className = 'message-name';
        nameDiv.textContent = msg.name;
        nameTimeContainer.appendChild(nameDiv);
      }
      
      // タイムスタンプ要素（空文字列でない場合のみ）
      if (msg.timestamp) {
        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-timestamp';
        timeDiv.textContent = msg.timestamp;
        nameTimeContainer.appendChild(timeDiv);
      }
      
      infoContainer.appendChild(nameTimeContainer);
      messageContainer.appendChild(infoContainer);
      
      // メッセージバブル
      const div = document.createElement('div');
      div.className = 'message';
      div.innerHTML = renderMarkdownToHtml(msg.text);
      messageContainer.appendChild(div);
      
      container.appendChild(messageContainer);
    }
    
    currentIndex = endIndex;
    
    // 「もっと見る」ボタンの表示/非表示
    updateLoadMoreButton();
  }

  function updateLoadMoreButton() {
    // 既存のボタンを削除
    let loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
      loadMoreBtn.remove();
    }
    
    // まだメッセージが残っている場合は新しいボタンを作成
    if (currentIndex < messages.length) {
      loadMoreBtn = document.createElement('button');
      loadMoreBtn.id = 'load-more-btn';
      loadMoreBtn.textContent = `もっと見る (残り ${messages.length - currentIndex} 件)`;
      loadMoreBtn.style.cssText = 'display: block; margin: 20px auto; padding: 10px 20px; font-size: 14px; cursor: pointer; background-color: #007acc; color: white; border: none; border-radius: 4px;';
      loadMoreBtn.onclick = () => {
        renderMessages(currentIndex, LOAD_MORE);
      };
      container.appendChild(loadMoreBtn);
    }
  }

  // 初回読み込み
  renderMessages(0, INITIAL_LOAD);
});

// single acquisition of VS Code API
const __vscode = (window.acquireVsCodeApi) ? window.acquireVsCodeApi() : null;

// listen for export requests from extension or from in-page forwarding
window.addEventListener('message', async event => {
  const msg = event.data;
  if (msg && msg.command === 'export') {
    // debug: show message arrived
    console.log('script.js: received export request', msg.format);
    
    // エクスポートするMarkdownがあるか確認
    if (!currentMarkdown) {
      console.error('No markdown content to export');
      vscodePost({ command: 'saved', success: false, reason: 'マークダウンコンテンツがありません' });
      return;
    }
    
    var dbg = document.getElementById('chatview-debug');
    if (!dbg) { dbg = document.createElement('div'); dbg.id = 'chatview-debug'; dbg.style.position = 'fixed'; dbg.style.right = '8px'; dbg.style.top = '8px'; dbg.style.background = '#fffa'; dbg.style.padding = '4px 8px'; dbg.style.zIndex = '9999'; document.body.appendChild(dbg); }
    dbg.textContent = 'Export request: ' + msg.format;
    const format = msg.format || 'png';
    const container = document.getElementById('chat-container');
    try {
      if (format === 'svg') {
        // Improved SVG: inline computed styles and set exact width/height
        try {
          const width = container.scrollWidth || container.clientWidth || 800;
          const height = container.scrollHeight || container.clientHeight || 600;
          const cloned = container.cloneNode(true);

          // ensure background
          const bodyBg = window.getComputedStyle(document.body).backgroundColor || '#ffffff';
          cloned.style.background = bodyBg;

          // inline computed styles for all elements inside cloned
          await (async function inlineStylesAndSerialize(root) {
            // To get correct computed styles we must ensure the node is in the document.
            // Insert the cloned subtree into a hidden offscreen container (but not collapsed), compute styles,
            // measure size, then build a proper SVG/foreignObject using XMLSerializer.
            const temp = document.createElement('div');
            temp.style.position = 'absolute';
            temp.style.left = '-99999px';
            temp.style.top = '-99999px';
            // keep natural width/height so layout can occur
            temp.style.visibility = 'hidden';
            temp.appendChild(root);
            document.body.appendChild(temp);

            let measuredWidth = width;
            let measuredHeight = height;

            try {
              const nodes = root.querySelectorAll('*');
              // inline root element as well
              const all = Array.prototype.slice.call(nodes);
              all.unshift(root);
              all.forEach(node => {
                try {
                  const cs = window.getComputedStyle(node);
                  let styleText = '';
                  for (let i = 0; i < cs.length; i++) {
                    const prop = cs[i];
                    const val = cs.getPropertyValue(prop);
                    styleText += `${prop}:${val};`;
                  }
                  node.setAttribute('style', styleText);
                } catch (e) {
                  // ignore individual nodes
                }
              });

              // measure after layout while the cloned subtree is attached
              measuredWidth = root.scrollWidth || root.clientWidth || measuredWidth || 800;
              measuredHeight = root.scrollHeight || root.clientHeight || measuredHeight || 600;
            } finally {
              // we'll remove the temp after we've moved the root into the SVG
            }

            // Ensure message bubbles have visible background/border-radius even if computed style was not captured by some viewers
            try {
              const msgs = root.querySelectorAll('.message');
              msgs.forEach(m => {
                try {
                  const cs = window.getComputedStyle(m);
                  let bg = cs.getPropertyValue('background-color');
                  if (!bg || bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') {
                    if (m.classList.contains('ai')) { bg = '#ffffff'; }
                    else if (m.classList.contains('me')) { bg = '#9efb7a'; }
                    else { bg = window.getComputedStyle(document.body).backgroundColor || '#ffffff'; }
                  }
                  m.style.background = bg;
                  const br = cs.getPropertyValue('border-radius') || '12px';
                  m.style.borderRadius = br;
                  // ensure layout and padding for bubble look
                  m.style.display = 'inline-block';
                  m.style.padding = '10px 14px';
                  m.style.maxWidth = '75%';
                  m.style.whiteSpace = 'pre-wrap';
                  m.style.color = cs.getPropertyValue('color') || '#0b2b2b';
                } catch (e) {
                  // ignore per-message failures
                }
              });
            } catch (e) {
              // ignore
            }

            try {
              // Use foreignObject with inlined styles
              const svgNS = 'http://www.w3.org/2000/svg';
              const xhtmlNS = 'http://www.w3.org/1999/xhtml';
              const svgEl = document.createElementNS(svgNS, 'svg');
              svgEl.setAttribute('xmlns', svgNS);
              svgEl.setAttribute('width', measuredWidth);
              svgEl.setAttribute('height', measuredHeight);

              const fo = document.createElementNS(svgNS, 'foreignObject');
              fo.setAttribute('x', '0');
              fo.setAttribute('y', '0');
              fo.setAttribute('width', measuredWidth);
              fo.setAttribute('height', measuredHeight);

              const wrapper = document.createElementNS(xhtmlNS, 'div');
              wrapper.setAttribute('xmlns', xhtmlNS);
              wrapper.style.width = measuredWidth + 'px';
              wrapper.style.height = measuredHeight + 'px';
              try { wrapper.style.background = window.getComputedStyle(document.body).backgroundColor || '#ffffff'; } catch (e) {}

              wrapper.appendChild(root);
              fo.appendChild(wrapper);
              svgEl.appendChild(fo);

              const serializer = new XMLSerializer();
              const svgString = serializer.serializeToString(svgEl);

              if (temp.parentNode) { temp.parentNode.removeChild(temp); }
              if (DEBUG && typeof window.open === 'function') {
                try { window.open('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString), '_blank'); } catch (e) {}
              }
              // ask extension to render from markdown so puppeteer produces a faithful image
              vscodePost({ command: 'export', format: 'svg', markdown: currentMarkdown });
              return;
            } catch (e) {
              if (temp.parentNode) { temp.parentNode.removeChild(temp); }
              throw e;
            }
          })(cloned);
        } catch (e) {
          vscodePost({ command: 'saved', success: false, reason: String(e) });
        }
      } else {
        // PNG export: delegate to extension puppeteer for consistent output
        vscodePost({ command: 'export', format: 'png', markdown: currentMarkdown });
      }
    } catch (err) {
      vscodePost({ command: 'saved', success: false, reason: String(err) });
    }
  }
});

// also listen for messages directly from the extension (doExport)
window.addEventListener('message', event => {
  const msg = event.data;
  if (msg && msg.command === 'doExport') {
    // normalize to our internal export command
    window.postMessage({ command: 'export', format: msg.format || 'png' }, '*');
  }
});

function vscodePost(msg) {
  if (__vscode) {
    console.log('script.js: posting message to extension', msg.command);
    __vscode.postMessage(msg);
  } else {
    console.warn('vscode api not available');
    var dbg = document.getElementById('chatview-debug');
    if (dbg) { dbg.textContent = 'vscode api not available'; }
  }
}

console.log('script.js loaded, acquireVsCodeApi=', !!window.acquireVsCodeApi);

// listen for responses from extension
window.addEventListener('message', event => {
  const msg = event.data;
  if (!msg) { return; }
  if (msg.command === 'saved') {
    if (msg.success) {
      alert('保存しました: ' + (msg.uri || '')); 
    } else {
      alert('保存に失敗しました: ' + (msg.reason || '')); 
    }
  }
});