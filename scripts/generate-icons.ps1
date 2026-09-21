Add-Type -AssemblyName System.Drawing

$srcPath = Join-Path $PSScriptRoot "..\resources\icon.png"
$pngPath = Join-Path $PSScriptRoot "..\resources\icon.png"
$icoPath = Join-Path $PSScriptRoot "..\resources\icon.ico"

Write-Host "Loading original image from $srcPath"
$src = [System.Drawing.Image]::FromFile($srcPath)
$sizes = @(256, 128, 64, 48, 32, 16)
$pngStreams = @()

foreach ($sz in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap($sz, $sz, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($src, 0, 0, $sz, $sz)
    $g.Dispose()

    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    $pngStreams += $ms
}

$src.Dispose()

# Save 256x256 as icon.png (REAL PNG)
[System.IO.File]::WriteAllBytes($pngPath, $pngStreams[0].ToArray())
Write-Host "Saved real PNG to $pngPath"

# Build ICO file with all sizes (PNG format per Vista+ spec)
$fs = [System.IO.File]::Create($icoPath)
$bw = New-Object System.IO.BinaryWriter($fs)

# ICO Header: 6 bytes
$bw.Write([UInt16]0) # Reserved
$bw.Write([UInt16]1) # Type: 1 = Icon
$bw.Write([UInt16]$sizes.Count) # Image count

# Calculate initial offset for image data
# Header (6 bytes) + Directory entries (16 bytes * count)
$dataOffset = 6 + (16 * $sizes.Count)

for ($i = 0; $i -lt $sizes.Count; $i++) {
    $sz = $sizes[$i]
    $pngBytes = $pngStreams[$i].ToArray()
    
    $wByte = if ($sz -ge 256) { [byte]0 } else { [byte]$sz }
    $hByte = if ($sz -ge 256) { [byte]0 } else { [byte]$sz }
    
    $bw.Write($wByte)       # Width
    $bw.Write($hByte)       # Height
    $bw.Write([byte]0)      # ColorCount
    $bw.Write([byte]0)      # Reserved
    $bw.Write([UInt16]1)    # ColorPlanes
    $bw.Write([UInt16]32)   # BitsPerPixel
    $bw.Write([UInt32]$pngBytes.Length) # ImageSize
    $bw.Write([UInt32]$dataOffset)      # ImageOffset
    
    $dataOffset += $pngBytes.Length
}

for ($i = 0; $i -lt $sizes.Count; $i++) {
    $pngBytes = $pngStreams[$i].ToArray()
    $bw.Write($pngBytes)
    $pngStreams[$i].Dispose()
}

$bw.Close()
$fs.Close()

Write-Host "Saved multi-resolution ICO to $icoPath"
