# <p align="center">
  <img src="./media/ChatView-logo4.png" alt="ChatView Logo" width="512" height="512"/>
</p>

**English** | [日本語](README_ja.md)

# 🗨️ ChatView — Preview Markdown conversations in a LINE-style chat UI

**ChatView** is a Visual Studio Code extension that renders conversation content written in Markdown as a LINE-style chat UI. It's useful for creating screenshots and for reviewing conversational content.

---
## 📷 Example

![ChatView sample](./sample_2.jpg)

---

## 👤 User Guide

### ✅ Key features

- Render conversation text written in Markdown as a chat UI
- Stylish chat bubbles (customizable colors, rounded corners, shadows)
- Suitable as a screenshot asset generator
- Appearance can be easily customized via CSS

### 🚀 How to use

1. Open a Markdown file in VS Code (for example, `sample.md`)
2. Open the Command Palette with `Ctrl+Shift+P`
3. Run `ChatView: Preview display`
4. A chat-style preview will open in a webview

### 💬 Conversation markup (using @ai / @me)

In ChatView, you indicate the speaker by prefixing a line with `@ai` or `@me`. Lines starting with `@ai` are rendered as AI messages; lines starting with `@me` are rendered as user messages.

Example (Markdown):

```markdown
@ai Hi — what would you like to do today?
@me I was thinking about watching a movie.
@ai How about "Interstellar"? It is very moving.
```

Important (current behavior and updates):

- Each message starts with a line that begins with `@ai` or `@me`. Subsequent lines that do not start with a prefix are treated as continuation lines for the previous bubble. In other words, you can split a long message across multiple lines and only prefix the first line.
- Prefixes must appear at the start of the line and be lowercase `@ai` / `@me`. Lines with leading spaces or uppercase `@AI`/`@Me` are not detected.
- A limited subset of Markdown is rendered inside bubbles (headings `#`, bold `**`, italic `*`, inline code `` ` ``, unordered lists `-`, ordered lists, blockquotes `>`, links `[text](url)`, etc.).
- For SVG export the Markdown formatting is stripped and plain text is used. HTML/PNG export and the preview support simple Markdown rendering.

### 🎨 Customizing appearance (important)

- The UI styling is defined mainly in `media/style.css`. Edit that file locally to try different appearances.
- Note:
  - In a development environment (clone the repo and run the extension host via F5 in VS Code), editing `media/style.css` and reopening the preview will reflect the changes.
  - If you installed the published extension from the Marketplace, editing `media/style.css` in your local copy will not update the installed extension. To change the published behavior you need to modify the source, rebuild, and republish / reinstall the extension.

---

## 🧑‍💻 Developer Guide

### 📦 Project layout

```text
chatview/
├── src/extension.ts       // Extension entry: generates the webview HTML
├── media/style.css        // Chat UI styling (colors, layout, fonts)
├── media/script.js        // Webview script that parses Markdown and generates messages (supports continuation lines and limited Markdown inside bubbles)
├── sample.md              // Example Markdown for testing
├── .vscode/launch.json    // Debug configuration
├── .vscode/tasks.json     // Build/dev tasks (e.g. `npm: watch` for TS watch)
├── tsconfig.json          // TypeScript compiler settings
└── package.json           // Extension metadata
```

### 🛠 Local development

Prerequisites:

```powershell
git clone https://github.com/keides2/chatview.git
cd chatview
npm install
```

Running and testing (including CSS changes):

1. Open the project in VS Code
2. Press `F5` to start the Extension Development Host (a debug window)
3. In the debug window open `sample.md`, then run `Ctrl+Shift+P` → `ChatView: Preview display`
4. If you edit `media/style.css`, close and reopen the preview or reload the extension host window (Developer: Reload Window / `Ctrl+R`) to see the updates

Notes:

- Editing CSS only does not require rebuilding TypeScript. However, if the extension is already running you must reload or reopen the preview to apply CSS changes.
- If you change the DOM structure (message classes/elements), edit `media/script.js` as needed.

### 🔧 Example HTML/CSS

```html
<div class="message ai">Hi — what would you like to do today?</div>
<div class="message me">I was thinking about watching a movie.</div>
```

```css
.message {
  padding: 10px 14px;
  border-radius: 14px;
  max-width: 75%;
}
.ai { background: #e0f7fa; }
.me { background: #a5d6a7; text-align: right; }
```

---

## 📥 Installation

### Requirements

- **Visual Studio Code**: version 1.103.0 or later

### From the Marketplace

1. Search for "ChatView" in the Extensions view in VS Code
2. Install and start using it

### From source (for developers)

1. Clone the repo
2. Run `npm install` to install dependencies
3. Press `F5` to run the extension host

---

## 🧾 Important note about Puppeteer rendering

High-quality image export (rendering the extension's HTML and taking screenshots) relies on Headless Chrome / Chromium via Puppeteer. This repository uses `puppeteer-core` to keep the package lightweight and expects Chrome/Chromium to be available on the user's machine.

### Why `puppeteer-core`?
- `puppeteer-core` does not include a browser binary, which keeps the extension package small.
- Including full `puppeteer` triggers an automatic Chromium download which can drastically increase package size.

### Requirements
- A Chrome or Chromium binary must be installed on the machine.
- Set the extension configuration `chatPreview.puppeteerExecutablePath` to the browser executable path, or ensure the browser is discoverable on PATH.

Example (settings.json):

```json
"chatPreview.puppeteerExecutablePath": "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
```

### Local testing (quick example)

1. Install dependencies (developer):

```powershell
npm install
```

2. If you're using `puppeteer-core`, make sure Chrome is available and `chatPreview.puppeteerExecutablePath` is set.

3. Run the included test script:

```powershell
node scripts\\puppeteer-test.js
```

This will create `out/puppeteer-test.png` with a screenshot.

---

## 📄 License

MIT License
See the `LICENSE` file for details.
