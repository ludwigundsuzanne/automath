# Génère les icônes d'Automath dans le dossier icons/.
# Usage : powershell -ExecutionPolicy Bypass -File tools\icons.ps1
param([string]$OutDir = (Join-Path $PSScriptRoot '..\icons'))
Add-Type -AssemblyName System.Drawing
New-Item -ItemType Directory -Force $OutDir | Out-Null

$blue  = [System.Drawing.ColorTranslator]::FromHtml('#2846C8')
$white = [System.Drawing.Color]::White
$mark  = [System.Drawing.ColorTranslator]::FromHtml('#F2C94C')

function Make-Icon([int]$size, [double]$scale, [string]$name) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.TextRenderingHint = 'AntiAliasGridFit'
  $g.Clear($blue)

  # Quadrillage discret, comme le fond de l'app
  $gridPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(28, 255, 255, 255)), ([float][Math]::Max(1, $size / 256))
  $step = $size / 8
  for ($i = 1; $i -lt 8; $i++) {
    $g.DrawLine($gridPen, [float]($i * $step), [float]0, [float]($i * $step), [float]$size)
    $g.DrawLine($gridPen, [float]0, [float]($i * $step), [float]$size, [float]($i * $step))
  }

  # Grand « × » blanc et petit « 2 » jaune en exposant
  $c = $size / 2
  $arm = $size * 0.2 * $scale
  $pen = New-Object System.Drawing.Pen $white, ([float]($size * 0.1 * $scale))
  $pen.StartCap = 'Round'; $pen.EndCap = 'Round'
  $cx = $c - $size * 0.05 * $scale; $cy = $c + $size * 0.05 * $scale
  $g.DrawLine($pen, [float]($cx - $arm), [float]($cy - $arm), [float]($cx + $arm), [float]($cy + $arm))
  $g.DrawLine($pen, [float]($cx - $arm), [float]($cy + $arm), [float]($cx + $arm), [float]($cy - $arm))

  $font = New-Object System.Drawing.Font 'Segoe UI', ([float]($size * 0.24 * $scale)), ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
  $brush = New-Object System.Drawing.SolidBrush $mark
  $fmt = New-Object System.Drawing.StringFormat
  $fmt.Alignment = 'Center'; $fmt.LineAlignment = 'Center'
  $g.DrawString('2', $font, $brush, [float]($cx + $arm + $size * 0.1 * $scale), [float]($cy - $arm - $size * 0.06 * $scale), $fmt)

  $g.Dispose()
  $bmp.Save((Join-Path $OutDir $name), [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

Make-Icon 192 1.0 'icon-192.png'
Make-Icon 512 1.0 'icon-512.png'
Make-Icon 512 0.75 'icon-maskable-512.png'
Make-Icon 180 1.0 'apple-touch-icon.png'
