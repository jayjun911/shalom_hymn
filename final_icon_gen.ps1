Add-Type -AssemblyName System.Drawing
$width = 512
$height = 512
$bmp = New-Object System.Drawing.Bitmap($width, $height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

# Colors (Classic Hymn Book Style)
$bgColor = [System.Drawing.ColorTranslator]::FromHtml("#800000") # Deep Maroon/Wine
$goldColor = [System.Drawing.ColorTranslator]::FromHtml("#FFD700") # Gold

# Draw Background (Sharp Square, Full Bleed)
$g.Clear($bgColor)

# Brushes and Fonts
$goldBrush = New-Object System.Drawing.SolidBrush($goldColor)
$fontLarge = New-Object System.Drawing.Font("Malgun Gothic", 80, [System.Drawing.FontStyle]::Bold)
$fontSmall = New-Object System.Drawing.Font("Malgun Gothic", 50, [System.Drawing.FontStyle]::Bold)

# 1. Draw Cross (Top)
# Vertical bar
$g.FillRectangle($goldBrush, 241, 50, 30, 120)
# Horizontal bar
$g.FillRectangle($goldBrush, 206, 80, 100, 30)

# 2. Draw "샬롬" (Middle)
$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = [System.Drawing.StringAlignment]::Center
$sf.LineAlignment = [System.Drawing.StringAlignment]::Center
$g.DrawString("샬롬", $fontLarge, $goldBrush, (New-Object System.Drawing.RectangleF(0, 180, 512, 150)), $sf)

# 3. Draw "찬송가" (Bottom)
$g.DrawString("찬송가", $fontSmall, $goldBrush, (New-Object System.Drawing.RectangleF(0, 340, 512, 100)), $sf)

# Save as PNG
$outputPath = "c:\Users\Jay Jun\.gemini\antigravity\scratch\hymn-app\icon.png"
$bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

# Cleanup
$g.Dispose()
$bmp.Dispose()
$goldBrush.Dispose()
$fontLarge.Dispose()
$fontSmall.Dispose()
Write-Host "True Reverted Icon generated successfully at $outputPath"
