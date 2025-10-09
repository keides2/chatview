<#
Generate PNG icons from media/chatview-logo.svg for Marketplace and other uses.

This script tries ImageMagick (magick) first, then Inkscape as a fallback.

Usage (PowerShell):
  .\tools\generators\generate-icons.ps1

Outputs to: media/icons/
#>

$ErrorActionPreference = 'Stop'

$svg = Join-Path $PSScriptRoot '..\..\media\chatview-logo.svg'
$outDir = Join-Path $PSScriptRoot '..\..\media\icons'

if (-not (Test-Path $svg)) {
  Write-Error "SVG not found: $svg"
  exit 1
}

if (-not (Test-Path $outDir)) {
  New-Item -ItemType Directory -Path $outDir | Out-Null
}

# Common icon sizes useful for Marketplace and distribution
$sizes = @(512, 256, 128, 64, 48, 32, 16)

function Use-Magick {
  param($size)
  $out = Join-Path $outDir "icon-$size.png"
  magick convert `"$svg`" -background none -resize ${size}x${size} `"$out`"
  Write-Host "Wrote $out"
}

function Use-Inkscape {
  param($size)
  $out = Join-Path $outDir "icon-$size.png"
  inkscape `"$svg`" --export-type=png --export-filename=`"$out`" --export-width=$size --export-height=$size
  Write-Host "Wrote $out"
}

if (Get-Command magick -ErrorAction SilentlyContinue) {
  Write-Host "Using ImageMagick (magick) to create icons..."
  foreach ($s in $sizes) { Use-Magick -size $s }
  exit 0
}

if (Get-Command inkscape -ErrorAction SilentlyContinue) {
  Write-Host "Using Inkscape to create icons..."
  foreach ($s in $sizes) { Use-Inkscape -size $s }
  exit 0
}

Write-Error "Neither 'magick' (ImageMagick) nor 'inkscape' were found in PATH. Install one of them and re-run this script."
exit 1
