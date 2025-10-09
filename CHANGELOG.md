# Change Log

All notable changes to the ChatView Enterprise Edition extension will be documented in this file.

## [0.2.0] - 2025-10-09

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

## [0.1.2] - 2025-10-06

### Added
- SVG export functionality
- Teams transcript conversion support
- Enterprise Edition features

### Changed
- Initial Enterprise Edition release

## [0.1.0] - 2025-09-30

- Initial release
