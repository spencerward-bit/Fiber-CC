Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$androidRes = Join-Path $projectRoot "android\app\src\main\res"
$iconSourcePath = Join-Path $PSScriptRoot "android-icon-source.png"

function New-Color($hex) {
    return [System.Drawing.ColorTranslator]::FromHtml($hex)
}

function New-RoundedRectPath {
    param(
        [float]$X,
        [float]$Y,
        [float]$Width,
        [float]$Height,
        [float]$Radius
    )

    $diameter = $Radius * 2
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
    $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
    $path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
    $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
    $path.CloseFigure()
    return $path
}

function Draw-BrandMark {
    param(
        [System.Drawing.Graphics]$Graphics,
        [float]$CanvasSize,
        [System.Drawing.Color]$Color
    )

    $Graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $Graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $pen = New-Object System.Drawing.Pen($Color, [math]::Max(6, $CanvasSize * 0.12))
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

    $accentPen = New-Object System.Drawing.Pen($Color, [math]::Max(5, $CanvasSize * 0.105))
    $accentPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $accentPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $accentPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

    $points = @{
        MainA1 = [System.Drawing.PointF]::new($CanvasSize * 0.27, $CanvasSize * 0.68)
        MainA2 = [System.Drawing.PointF]::new($CanvasSize * 0.68, $CanvasSize * 0.27)
        MainB1 = [System.Drawing.PointF]::new($CanvasSize * 0.41, $CanvasSize * 0.82)
        MainB2 = [System.Drawing.PointF]::new($CanvasSize * 0.82, $CanvasSize * 0.41)
        AccentA1 = [System.Drawing.PointF]::new($CanvasSize * 0.24, $CanvasSize * 0.54)
        AccentA2 = [System.Drawing.PointF]::new($CanvasSize * 0.42, $CanvasSize * 0.72)
        AccentB1 = [System.Drawing.PointF]::new($CanvasSize * 0.58, $CanvasSize * 0.24)
        AccentB2 = [System.Drawing.PointF]::new($CanvasSize * 0.76, $CanvasSize * 0.42)
    }

    $Graphics.DrawLine($pen, $points.MainA1, $points.MainA2)
    $Graphics.DrawLine($pen, $points.MainB1, $points.MainB2)
    $Graphics.DrawLine($accentPen, $points.AccentA1, $points.AccentA2)
    $Graphics.DrawLine($accentPen, $points.AccentB1, $points.AccentB2)

    $pen.Dispose()
    $accentPen.Dispose()
}

function Get-SourceBitmap {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Icon source image not found: $Path"
    }

    $image = [System.Drawing.Image]::FromFile($Path)
    try {
        return New-Object System.Drawing.Bitmap($image)
    } finally {
        $image.Dispose()
    }
}

function Draw-CoverImage {
    param(
        [System.Drawing.Graphics]$Graphics,
        [System.Drawing.Image]$Image,
        [System.Drawing.RectangleF]$DestinationRect
    )

    $Graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $Graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $Graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $destinationRatio = $DestinationRect.Width / $DestinationRect.Height
    $sourceRatio = $Image.Width / $Image.Height

    if ($sourceRatio -gt $destinationRatio) {
        $sourceHeight = [double]$Image.Height
        $sourceWidth = $sourceHeight * $destinationRatio
        $sourceX = ([double]$Image.Width - $sourceWidth) / 2
        $sourceY = 0
    } else {
        $sourceWidth = [double]$Image.Width
        $sourceHeight = $sourceWidth / $destinationRatio
        $sourceX = 0
        $sourceY = ([double]$Image.Height - $sourceHeight) / 2
    }

    $sourceRect = [System.Drawing.RectangleF]::new($sourceX, $sourceY, $sourceWidth, $sourceHeight)
    $Graphics.DrawImage($Image, $DestinationRect, $sourceRect, [System.Drawing.GraphicsUnit]::Pixel)
}

function New-IconBitmap {
    param(
        [int]$Size,
        [bool]$Round = $false,
        [System.Drawing.Bitmap]$SourceBitmap
    )

    $bitmap = New-Object System.Drawing.Bitmap($Size, $Size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.Clear([System.Drawing.Color]::Transparent)

    if ($Round) {
        $ellipseRect = [System.Drawing.RectangleF]::new($Size * 0.06, $Size * 0.06, $Size * 0.88, $Size * 0.88)
        $path = New-Object System.Drawing.Drawing2D.GraphicsPath
        $path.AddEllipse($ellipseRect)
        $graphics.SetClip($path)
        Draw-CoverImage -Graphics $graphics -Image $SourceBitmap -DestinationRect $ellipseRect
        $graphics.ResetClip()
        $path.Dispose()
    } else {
        $cardPath = New-RoundedRectPath ($Size * 0.09) ($Size * 0.09) ($Size * 0.82) ($Size * 0.82) ($Size * 0.18)
        $graphics.SetClip($cardPath)
        Draw-CoverImage -Graphics $graphics -Image $SourceBitmap -DestinationRect ([System.Drawing.RectangleF]::new($Size * 0.09, $Size * 0.09, $Size * 0.82, $Size * 0.82))
        $graphics.ResetClip()
        $cardPath.Dispose()
    }

    $graphics.Dispose()
    return $bitmap
}

function New-ForegroundBitmap {
    param(
        [int]$Size,
        [System.Drawing.Bitmap]$SourceBitmap
    )

    $bitmap = New-Object System.Drawing.Bitmap($Size, $Size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $safeInset = $Size * 0.14
    Draw-CoverImage -Graphics $graphics -Image $SourceBitmap -DestinationRect ([System.Drawing.RectangleF]::new($safeInset, $safeInset, $Size - ($safeInset * 2), $Size - ($safeInset * 2)))
    $graphics.Dispose()
    return $bitmap
}

function New-SplashBitmap {
    param(
        [int]$Width,
        [int]$Height,
        [System.Drawing.Bitmap]$SourceBitmap
    )

    $bitmap = New-Object System.Drawing.Bitmap($Width, $Height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.Clear((New-Color "#081116"))

    $backgroundRect = [System.Drawing.Rectangle]::new(0, 0, $Width, $Height)
    $gradient = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $backgroundRect,
        (New-Color "#0E1B23"),
        (New-Color "#050A0E"),
        90
    )
    $graphics.FillRectangle($gradient, $backgroundRect)
    $gradient.Dispose()

    $glowPoints = [System.Drawing.PointF[]]@(
        [System.Drawing.PointF]::new($Width * 0.5, $Height * 0.18),
        [System.Drawing.PointF]::new($Width * 0.82, $Height * 0.34),
        [System.Drawing.PointF]::new($Width * 0.18, $Height * 0.34)
    )
    $glowPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $glowPath.AddPolygon($glowPoints)
    $glowBrush = New-Object System.Drawing.Drawing2D.PathGradientBrush($glowPath)
    $glowBrush.CenterColor = [System.Drawing.Color]::FromArgb(38, 0, 229, 255)
    $glowBrush.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 0, 229, 255))
    $graphics.FillEllipse($glowBrush, $Width * 0.1, $Height * 0.02, $Width * 0.8, $Height * 0.38)
    $glowBrush.Dispose()
    $glowPath.Dispose()

    $isLandscape = $Width -gt $Height
    $iconSize = if ($isLandscape) { [int]($Height * 0.22) } else { [int]($Width * 0.28) }
    $iconBitmap = New-IconBitmap -Size $iconSize -SourceBitmap $SourceBitmap
    $iconX = [int](($Width - $iconSize) / 2)
    $iconY = if ($isLandscape) { [int]($Height * 0.22) } else { [int]($Height * 0.33) }
    $graphics.DrawImage($iconBitmap, $iconX, $iconY, $iconSize, $iconSize)
    $iconBitmap.Dispose()

    $titleSize = if ($isLandscape) { [math]::Max(22, [int]($Height * 0.08)) } else { [math]::Max(24, [int]($Width * 0.08)) }
    $subtitleSize = if ($isLandscape) { [math]::Max(10, [int]($Height * 0.032)) } else { [math]::Max(12, [int]($Width * 0.033)) }

    $titleFont = New-Object System.Drawing.Font("Segoe UI", $titleSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $subtitleFont = New-Object System.Drawing.Font("Segoe UI", $subtitleSize, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
    $titleBrush = New-Object System.Drawing.SolidBrush((New-Color "#FFFFFF"))
    $subtitleBrush = New-Object System.Drawing.SolidBrush((New-Color "#7EF2FF"))

    $format = New-Object System.Drawing.StringFormat
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center

    $titleRectY = $iconY + $iconSize + [int]($Height * 0.05)
    $subtitleRectY = $titleRectY + [int]($titleSize * 1.1)
    $graphics.DrawString("Color Optics", $titleFont, $titleBrush, [System.Drawing.RectangleF]::new(0, $titleRectY, $Width, $titleSize * 1.3), $format)
    $graphics.DrawString("Field Reference Suite", $subtitleFont, $subtitleBrush, [System.Drawing.RectangleF]::new(0, $subtitleRectY, $Width, $subtitleSize * 1.4), $format)

    $titleFont.Dispose()
    $subtitleFont.Dispose()
    $titleBrush.Dispose()
    $subtitleBrush.Dispose()
    $format.Dispose()
    $graphics.Dispose()

    return $bitmap
}

function Save-Png {
    param(
        [System.Drawing.Bitmap]$Bitmap,
        [string]$Path
    )

    $directory = Split-Path -Parent $Path
    if (-not (Test-Path $directory)) {
        New-Item -ItemType Directory -Path $directory | Out-Null
    }

    $Bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $Bitmap.Dispose()
}

$iconTargets = @(
    @{ Path = "mipmap-mdpi\ic_launcher.png"; Size = 48; Round = $false; Foreground = $false },
    @{ Path = "mipmap-hdpi\ic_launcher.png"; Size = 72; Round = $false; Foreground = $false },
    @{ Path = "mipmap-xhdpi\ic_launcher.png"; Size = 96; Round = $false; Foreground = $false },
    @{ Path = "mipmap-xxhdpi\ic_launcher.png"; Size = 144; Round = $false; Foreground = $false },
    @{ Path = "mipmap-xxxhdpi\ic_launcher.png"; Size = 192; Round = $false; Foreground = $false },
    @{ Path = "mipmap-mdpi\ic_launcher_round.png"; Size = 48; Round = $true; Foreground = $false },
    @{ Path = "mipmap-hdpi\ic_launcher_round.png"; Size = 72; Round = $true; Foreground = $false },
    @{ Path = "mipmap-xhdpi\ic_launcher_round.png"; Size = 96; Round = $true; Foreground = $false },
    @{ Path = "mipmap-xxhdpi\ic_launcher_round.png"; Size = 144; Round = $true; Foreground = $false },
    @{ Path = "mipmap-xxxhdpi\ic_launcher_round.png"; Size = 192; Round = $true; Foreground = $false },
    @{ Path = "mipmap-mdpi\ic_launcher_foreground.png"; Size = 108; Round = $false; Foreground = $true },
    @{ Path = "mipmap-hdpi\ic_launcher_foreground.png"; Size = 162; Round = $false; Foreground = $true },
    @{ Path = "mipmap-xhdpi\ic_launcher_foreground.png"; Size = 216; Round = $false; Foreground = $true },
    @{ Path = "mipmap-xxhdpi\ic_launcher_foreground.png"; Size = 324; Round = $false; Foreground = $true },
    @{ Path = "mipmap-xxxhdpi\ic_launcher_foreground.png"; Size = 432; Round = $false; Foreground = $true }
)

try {
    $sourceBitmap = Get-SourceBitmap -Path $iconSourcePath

    foreach ($target in $iconTargets) {
        $bitmap = if ($target.Foreground) {
            New-ForegroundBitmap -Size $target.Size -SourceBitmap $sourceBitmap
        } else {
            New-IconBitmap -Size $target.Size -Round $target.Round -SourceBitmap $sourceBitmap
        }

        Save-Png -Bitmap $bitmap -Path (Join-Path $androidRes $target.Path)
    }
} finally {
    if ($sourceBitmap) {
        $sourceBitmap.Dispose()
    }
}

$splashTargets = @(
    @{ Path = "drawable\splash.png"; Width = 480; Height = 320 },
    @{ Path = "drawable-land-hdpi\splash.png"; Width = 800; Height = 480 },
    @{ Path = "drawable-land-mdpi\splash.png"; Width = 480; Height = 320 },
    @{ Path = "drawable-land-xhdpi\splash.png"; Width = 1280; Height = 720 },
    @{ Path = "drawable-land-xxhdpi\splash.png"; Width = 1600; Height = 960 },
    @{ Path = "drawable-land-xxxhdpi\splash.png"; Width = 1920; Height = 1280 },
    @{ Path = "drawable-port-hdpi\splash.png"; Width = 480; Height = 800 },
    @{ Path = "drawable-port-mdpi\splash.png"; Width = 320; Height = 480 },
    @{ Path = "drawable-port-xhdpi\splash.png"; Width = 720; Height = 1280 },
    @{ Path = "drawable-port-xxhdpi\splash.png"; Width = 960; Height = 1600 },
    @{ Path = "drawable-port-xxxhdpi\splash.png"; Width = 1280; Height = 1920 }
)

foreach ($target in $splashTargets) {
    $sourceBitmap = Get-SourceBitmap -Path $iconSourcePath
    try {
        $bitmap = New-SplashBitmap -Width $target.Width -Height $target.Height -SourceBitmap $sourceBitmap
    } finally {
        $sourceBitmap.Dispose()
    }
    Save-Png -Bitmap $bitmap -Path (Join-Path $androidRes $target.Path)
}
