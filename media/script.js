const DEBUG = true;

let currentMarkdown = '';

window.addEventListener('message', event => {
  if (!event.data || !event.data.markdown) { return; }
  const markdown = event.data.markdown;
  currentMarkdown = markdown;
  const lines = markdown.split('\n').filter(line => line.trim());

  const container = document.getElementById('chat-container');
  container.innerHTML = '';

  lines.forEach(line => {
    let role = '';
    let text = '';

    if (line.startsWith('@ai')) {
      role = 'ai';
      text = line.replace('@ai', '').trim();
    } else if (line.startsWith('@me')) {
      role = 'me';
      text = line.replace('@me', '').trim();
    }

    if (role) {
      const div = document.createElement('div');
      div.className = `message ${role}`;
      div.textContent = text;
      container.appendChild(div);
    }
  });
});

// single acquisition of VS Code API
const __vscode = (window.acquireVsCodeApi) ? window.acquireVsCodeApi() : null;

// listen for export requests from extension or from in-page forwarding
window.addEventListener('message', async event => {
  const msg = event.data;
  if (msg && msg.command === 'export') {
    // debug: show message arrived
    console.log('script.js: received export request', msg.format);
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
              vscodePost({ command: 'export', format: 'svg', markdown: currentMarkdown || markdown });
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
        vscodePost({ command: 'export', format: 'png', markdown: currentMarkdown || markdown });
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