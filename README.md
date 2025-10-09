# <p align="center">
  <img src="https://raw.githubusercontent.com/keides2/chatview/enterprise-edition/media/ChatView-logo-Enterprise.png" alt="ChatView Enterprise Logo" width="512" height="512"/>
</p>

# 🗨️ ChatView Enterprise Edition — Lightweight Version for Corporate Environments

**[English]** | **[日本語](README-enterprise-ja.md)**

**ChatView Enterprise Edition** is a lightweight version of ChatView designed for corporate security requirements. By completely removing browser automation and implementing SVG-only export, it operates safely in environments with SSL certificate issues or proxy restrictions.

---

## 📷 Sample Display

![ChatView Sample](https://raw.githubusercontent.com/keides2/chatview/enterprise-edition/tools/samples/markdown/sample_with_icons.jpg)

---

## 🏢 Enterprise Edition Features

### ✅ Optimized for Corporate Environments

- **No Browser Automation**: Completely removed dependencies like Puppeteer and Playwright
- **Lightweight Package**: No browser binaries required, significantly reducing distribution size
- **Enhanced Security**: No external browser process launches, avoids SSL certificate issues
- **Proxy Environment Support**: Not affected by corporate proxy settings
- **SVG-Only Export**: High-quality output in vector format

### ⚠️ Differences from Standard Edition

| Feature | Enterprise Edition | Standard Edition |
|---------|-------------------|------------------|
| Preview Display | ✅ Supported | ✅ Supported |
| SVG Export | ✅ Supported | ✅ Supported |
| PNG Export | ❌ Not Supported | ✅ Supported |
| HTML Export | ❌ Not Supported | ✅ Supported |
| Browser Dependency | ❌ None | ✅ Chrome/Chromium Required |
| Package Size | Small | Large |

---

## 👤 User Guide

### 🚀 How to Use

1. Open a Markdown file (e.g., sample.md) in VS Code
2. Press Ctrl+Shift+P to open the Command Palette
3. Execute **ChatView: Show Preview | プレビュー表示**
4. The chat UI will be displayed in the Webview

![command_palette](https://raw.githubusercontent.com/keides2/chatview/enterprise-edition/media/command_palette.jpg)

### 💾 SVG Export

1. While preview is displayed, press Ctrl+Shift+P to open the Command Palette
2. Execute **ChatView: Export as SVG | SVGエクスポート**
3. Specify the save location and save the SVG file

### 🎤 Converting Teams Transcripts

You can convert Microsoft Teams transcript DOCX files to ChatView format.

```powershell
# Basic usage
python tools/converters/transcript2chatview.py input.docx -o output.md

# Merge consecutive messages from the same speaker
python tools/converters/transcript2chatview.py input.docx --merge-speaker

# Hide timestamps and icons
python tools/converters/transcript2chatview.py input.docx --no-timestamp --no-icon
```

After conversion, you can open and preview the Markdown file in VS Code.

### 💬 How to Write Conversations (@ai / @me Usage)

In ChatView, you can easily specify speakers in Markdown. By placing the prefix @ai or @me at the beginning of a line, they will be rendered as AI-side or user-side speech bubbles respectively.

Example (Markdown):

```markdown
@ai Hello, what shall we do today?
@me I'm thinking about watching a movie!
@ai How about "Interstellar"? It's very moving.
```

Important specifications:

- Each conversation starts with a line prefixed with @ai or @me
- Subsequent lines without a prefix at the beginning are treated as "continuation lines" and grouped into the same speech bubble
- Use lowercase @ai / @me prefixes at the beginning of lines
- Limited Markdown syntax is rendered within speech bubbles (headings #, bold **, italic *, inline code \`, lists -, numbered lists, quotes >, links [text](url), etc.)
- In SVG export, Markdown notation is removed and output as plain text

### 🎨 Customizing Appearance

The UI appearance is mainly defined in media/style.css.

Steps to modify in development environment:
1. Edit media/style.css
2. Close and reopen the preview, or reload the extension host window (Ctrl+R)

---

## 🧑‍💻 Developer Guide

### 📦 Project Structure

```
chatview/
├── src/
│   └── extension.ts           // Extension entry point (includes SVG generation logic)
├── media/
│   ├── style.css              // Chat UI style definitions
│   └── script.js              // Markdown parser in Webview
├── tools/                     // Development and conversion tools
│   ├── converters/
│   │   └── transcript2chatview.py  // Convert Teams transcript DOCX to ChatView format
│   ├── generators/
│   │   ├── create_sample_docx.py   // Generate sample transcript DOCX
│   │   └── generate-icons.ps1      // Generate icon images
│   ├── samples/
│   │   ├── transcripts/            // Transcript samples
│   │   └── markdown/               // Markdown samples
│   └── tests/
│       └── puppeteer-test.js       // Test scripts
├── dist/
│   └── releases/              // Released .vsix files
├── .vscode/
│   ├── launch.json            // Debug configuration
│   └── tasks.json             // Build/development task definitions
├── tsconfig.json              // TypeScript compiler settings
└── package.json               // Extension metadata
```

### 🛠 Local Development Setup

Prerequisites:

```powershell
git clone https://github.com/keides2/chatview.git
cd chatview
git checkout enterprise-edition
npm install
```

Testing:

1. Open the project in VS Code
2. Press F5 to launch the extension host
3. In the debug window, open sample.md and press Ctrl+Shift+P → ChatView: Preview display
4. After editing media/style.css, close and reopen the preview

### 🔧 Build and Package

```powershell
# Development build
npm run compile

# Production build
npm run package

# Create VSIX package
vsce package
```

---

## 📥 Installation

### System Requirements

- **Visual Studio Code**: Version 1.103.0 or higher
- **No Browser Required**: Chrome/Chromium installation is not required

### Install from VSIX File

1. Download the .vsix file from the release page
2. In VS Code, press Ctrl+Shift+P → Extensions: Install from VSIX...
3. Select the downloaded .vsix file

### Build from Source (For Developers)

1. Clone the repository (enterprise-edition branch)
2. Run `npm install` to install dependencies
3. Run `npm run package` to build
4. Press F5 to launch the extension host

---

## 🔒 Security and Privacy

Enterprise Edition meets the following security requirements:

- **No External Process Launch**: Reduces security risks by not launching browsers
- **No Network Access**: Export processing requires no external communication
- **Privacy Protection**: Implementation does not include personal information (such as usernames) in paths
- **Avoids SSL Certificate Issues**: Works in corporate self-signed certificate environments without using browser automation

---

## 📋 Configuration Settings

### chatPreview.defaultFolder

Specify the default folder for the save dialog.

- workspace: Workspace root (default)
- home: User home directory
- Absolute path: Any directory path

Example (settings.json):

```json
{
  "chatPreview.defaultFolder": "C:\\Users\\YourName\\Documents\\ChatExports"
}
```

---

## 🆚 Comparison with Standard Edition

### When to Choose Enterprise Edition

- Using in corporate proxy environments
- Environments with SSL certificate issues
- Browser installation is restricted
- Need for lightweight package
- SVG format is sufficient

### When to Choose Standard Edition

- Need PNG format export
- Need HTML format export
- Need pixel-perfect screenshots

---

## 🐛 Troubleshooting

### Preview Not Displaying

1. Verify VS Code version is 1.103.0 or higher
2. Execute Developer: Reload Window in the Command Palette

### SVG Export Not Working

1. Verify write permissions for the save directory
2. Verify the filename does not contain invalid characters

---

## 📄 License

MIT License
See LICENSE file for details.

---

## 🔗 Related Links

- [GitHub Repository](https://github.com/keides2/chatview)
- [Standard Edition README](README_ja.md)
- [Issue Reports](https://github.com/keides2/chatview/issues)
