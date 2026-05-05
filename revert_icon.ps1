Add-Type -AssemblyName System.Drawing
$width = 512
$height = 512
$bmp = New-Object System.Drawing.Bitmap($width, $height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

# Colors (Based on app's dark theme)
$bgColor = [System.Drawing.ColorTranslator]::FromHtml("#121212")
$symbolColor = [System.Drawing.Color]::White

# Draw Background (Sharp Square)
$g.Clear($bgColor)

# Draw Musical Note (Eighth Note / Quaver)
$brush = New-Object System.Drawing.SolidBrush($symbolColor)
$pen = New-Object System.Drawing.Pen($symbolColor, 40)

# Note Head (Circle)
$g.FillEllipse($brush, 140, 320, 120, 100)

# Stem
$g.FillRectangle($brush, 235, 100, 25, 270)

# Flag (Top part of the note)
$points = @(
    (New-Object System.Drawing.Point(235, 100)),
    (New-Object System.Drawing.Point(360, 160)),
    (New-Object System.Drawing.Point(360, 240)),
    (New-Object System.Drawing.Point(235, 180))
)
$g.FillPolygon($brush, $points)

# Save as PNG
$outputPath = "c:\Users\Jay Jun\.gemini\antigravity\scratch\hymn-app\icon.png"
$bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$bmp.Dispose()
$brush.Dispose()
$pen.Dispose()
Write-Host "Reverted Icon generated successfully at $outputPath"
