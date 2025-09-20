const fs = require('fs');
const path = require('path');
(async () => {
  try {
    const puppeteer = require('puppeteer');
    const outDir = path.join(__dirname, '..', 'out');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial,Helvetica,sans-serif;margin:20px} .bubble{display:inline-block;padding:12px;border-radius:12px;background:#e6f3ff;color:#003366;max-width:400px}</style></head><body><h2>ChatView Puppeteer Test</h2><div class="bubble">これは Puppeteer によるテスト画像です</div></body></html>`;
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const outPath = path.join(outDir, 'puppeteer-test.png');
    await page.screenshot({ path: outPath, fullPage: true });
    await browser.close();
    console.log('OK: screenshot saved to', outPath);
    process.exit(0);
  } catch (err) {
    console.error('ERROR', err && err.stack ? err.stack : err);
    process.exit(2);
  }
})();
