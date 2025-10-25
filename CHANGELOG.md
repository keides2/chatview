# Change Log

All notable changes to the ChatView extension will be documented in this file.

## [0.4.0] - 2025-10-25

### Changed
- **MAJOR**: Merged Enterprise Edition into main branch
- Discontinued Standard Edition (PNG/HTML export features removed)
- This is now the single, lightweight version optimized for corporate environments
- Renamed from "ChatView Enterprise" to "ChatView"
- Updated command names from `chatPreviewEnterprise.*` to `chatPreview.*`
- Updated configuration keys from `chatPreviewEnterprise.*` to `chatPreview.*`

### Migration Notes
- If upgrading from Standard Edition: PNG/HTML export is no longer available
- If upgrading from Enterprise Edition: Update any custom keybindings or tasks to use new command names
- Configuration settings will need to be migrated from `chatPreviewEnterprise.*` to `chatPreview.*`

## [0.3.2] - 2025-10-09

### Changed
- **transcript2chatview.py**: Changed default icon handling from Base64 embedding to file-based storage
- Icons are now saved as separate files in `icons/` directory by default
- Added `--embed-icons` option for Base64 embedding when needed
- Significantly reduces markdown file size for large transcripts (396 entries: ~5MB → ~50KB)

## [0.3.1] - 2025-10-09

### Fixed
- Fixed image display issue on Visual Studio Marketplace by using absolute GitHub URLs
- Updated all README files with absolute image paths

## [0.3.0] - 2025-10-09

### Added
- Image icon support for speaker avatars
- Sample with image icons (`sample_with_image_icons.md`)
- Language switcher (English/日本語) in READMEs
- Command palette screenshot in documentation
- Bilingual command names (English | Japanese)

### Changed
- **BREAKING**: Removed Puppeteer and Playwright dependencies (~900MB reduction)
- Reduced node_modules size from ~900MB to ~70MB (92% reduction)
- Updated README with package size comparison
- Fixed image paths in READMEs (backslash to forward slash)
- Updated sample images to show icon functionality

### Removed
- Playwright dependency and related configuration
- Puppeteer dependency and related configuration
- Browser-related configuration options

## [0.2.0] - 2025-10-06

### Added
- SVG export functionality
- Teams transcript conversion support
- Enterprise Edition features

### Changed
- Initial Enterprise Edition release

## [0.1.0] - 2025-09-30

- Initial release
