Add-Type -AssemblyName System.Drawing
$width = 512
$height = 512
$bmp = New-Object System.Drawing.Bitmap($width, $height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

# Colors (Based on the provided GodPeople image)
$bgColor = [System.Drawing.ColorTranslator]::FromHtml("#3A7CF0") # Bright Blue
$whiteColor = [System.Drawing.Color]::White

# Draw Background (Sharp Square, No Rounding, No Borders)
$g.Clear($bgColor)

# Brushes
$whiteBrush = New-Object System.Drawing.SolidBrush($whiteColor)

# Fonts (Serif for middle, Sans-serif for bottom)
# Batang is a standard Windows serif font
$fontSerif = New-Object System.Drawing.Font("Batang", 95, [System.Drawing.FontStyle]::Bold)
$fontSans = New-Object System.Drawing.Font("Malgun Gothic", 50, [System.Drawing.FontStyle]::Bold)

# 1. Draw Small White Cross (Top)
$g.FillRectangle($whiteBrush, 248, 45, 16, 80)
$g.FillRectangle($whiteBrush, 218, 65, 76, 16)

# 2. Draw "샬롬" (Middle) - Serif font
$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = [System.Drawing.StringAlignment]::Center
$sf.LineAlignment = [System.Drawing.StringAlignment]::Center
$g.DrawString("샬롬", $fontSerif, $whiteBrush, (New-Object System.Drawing.RectangleF(0, 160, 512, 180)), $sf)

# 3. Draw "찬송가" (Bottom) - Sans-serif font
$g.DrawString("찬송가", $fontSans, $whiteBrush, (New-Object System.Drawing.RectangleF(0, 350, 512, 100)), $sf)

# Save as PNG
$outputPath = "c:\Users\Jay Jun\.gemini\antigravity\scratch\hymn-app\icon.png"
$bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

# Cleanup
$g.Dispose()
$bmp.Dispose()
$whiteBrush.Dispose()
$fontSerif.Dispose()
$fontSans.Dispose()
Write-Host "Real GodPeople Style Icon generated successfully at $outputPath"
