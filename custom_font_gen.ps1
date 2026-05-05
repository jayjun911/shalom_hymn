Add-Type -AssemblyName System.Drawing
$width = 512
$height = 512
$bmp = New-Object System.Drawing.Bitmap($width, $height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

# Colors (Slightly darker than Azure Blue)
$bgColor = [System.Drawing.ColorTranslator]::FromHtml("#2559C7")
$whiteColor = [System.Drawing.Color]::White

# Draw Background (Sharp Square)
$g.Clear($bgColor)

# Brushes
$whiteBrush = New-Object System.Drawing.SolidBrush($whiteColor)

# Specific Fonts requested by User
# HYPMokGak-Bold (HY목각파임B) for "샬롬"
# Malgun Gothic for "찬송가"
$fontShalom = New-Object System.Drawing.Font("HYPMokGak-Bold", 100, [System.Drawing.FontStyle]::Bold)
$fontHymn = New-Object System.Drawing.Font("Malgun Gothic", 50, [System.Drawing.FontStyle]::Bold)

# 1. Draw Small White Cross (Top)
$g.FillRectangle($whiteBrush, 248, 45, 16, 80)
$g.FillRectangle($whiteBrush, 218, 65, 76, 16)

# 2. Draw "샬롬" (Middle) - HYPMokGak-Bold
$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = [System.Drawing.StringAlignment]::Center
$sf.LineAlignment = [System.Drawing.StringAlignment]::Center
$g.DrawString("샬롬", $fontShalom, $whiteBrush, (New-Object System.Drawing.RectangleF(0, 160, 512, 180)), $sf)

# 3. Draw "찬송가" (Bottom) - Malgun Gothic
$g.DrawString("찬송가", $fontHymn, $whiteBrush, (New-Object System.Drawing.RectangleF(0, 350, 512, 100)), $sf)

# Save as PNG
$outputPath = "c:\Users\Jay Jun\.gemini\antigravity\scratch\hymn-app\icon.png"
$bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

# Cleanup
$g.Dispose()
$bmp.Dispose()
$whiteBrush.Dispose()
$fontShalom.Dispose()
$fontHymn.Dispose()
Write-Host "Final Custom Font Icon generated successfully at $outputPath"
