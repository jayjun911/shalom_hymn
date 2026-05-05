Add-Type -AssemblyName System.Drawing
$width = 512
$height = 512
$bmp = New-Object System.Drawing.Bitmap($width, $height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

# Colors (GodPeople Bible App Style)
$bgColor = [System.Drawing.ColorTranslator]::FromHtml("#FF4D00") # GodPeople Signature Orange-Red
$whiteColor = [System.Drawing.Color]::White

# Draw Background (Sharp Square, No Rounding, No White Margins)
$g.Clear($bgColor)

# Brushes and Fonts (Modern Sans-Serif)
$whiteBrush = New-Object System.Drawing.SolidBrush($whiteColor)
$fontMain = New-Object System.Drawing.Font("Malgun Gothic", 90, [System.Drawing.FontStyle]::Bold)
$fontSub = New-Object System.Drawing.Font("Malgun Gothic", 45, [System.Drawing.FontStyle]::Bold)

# 1. Draw Thin Modern Cross (Top)
# Vertical bar
$g.FillRectangle($whiteBrush, 246, 40, 20, 130)
# Horizontal bar
$g.FillRectangle($whiteBrush, 211, 75, 90, 20)

# 2. Draw "샬롬" (Middle) - Centered
$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = [System.Drawing.StringAlignment]::Center
$sf.LineAlignment = [System.Drawing.StringAlignment]::Center
$g.DrawString("샬롬", $fontMain, $whiteBrush, (New-Object System.Drawing.RectangleF(0, 180, 512, 180)), $sf)

# 3. Draw "찬송가" (Bottom)
$g.DrawString("찬송가", $fontSub, $whiteBrush, (New-Object System.Drawing.RectangleF(0, 360, 512, 100)), $sf)

# Save as PNG
$outputPath = "c:\Users\Jay Jun\.gemini\antigravity\scratch\hymn-app\icon.png"
$bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

# Cleanup
$g.Dispose()
$bmp.Dispose()
$whiteBrush.Dispose()
$fontMain.Dispose()
$fontSub.Dispose()
Write-Host "GodPeople Style Icon generated successfully at $outputPath"
