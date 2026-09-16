param(
    [string]$WorkspaceRoot = (Split-Path -Parent $PSScriptRoot)
)

Add-Type -AssemblyName System.Drawing

$sourcePath = Join-Path $WorkspaceRoot 'Assets\Generated\CharacterAnimation\HoodedMechanic\hooded_mechanic_animation_sheet_source_v1.png'
$outputRoot = Join-Path $WorkspaceRoot 'Assets\GameReady\Characters\HoodedMechanic'
$sheetRoot = Join-Path $outputRoot 'Sheets'
$frameRoot = Join-Path $outputRoot 'Frames'

$clips = @('idle', 'walk', 'shoot', 'crouch')
$cellWidth = 320
$cellHeight = 320
$columns = 4
$rows = 4

New-Item -ItemType Directory -Force -Path $sheetRoot | Out-Null
foreach ($clip in $clips) {
    New-Item -ItemType Directory -Force -Path (Join-Path $frameRoot $clip) | Out-Null
}

$source = New-Object System.Drawing.Bitmap($sourcePath)
$keyed = New-Object System.Drawing.Bitmap($source.Width, $source.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

for ($y = 0; $y -lt $source.Height; $y++) {
    for ($x = 0; $x -lt $source.Width; $x++) {
        $pixel = $source.GetPixel($x, $y)
        $maximum = [Math]::Max($pixel.R, [Math]::Max($pixel.G, $pixel.B))
        $minimum = [Math]::Min($pixel.R, [Math]::Min($pixel.G, $pixel.B))
        $isLightNeutral = ($minimum -ge 180) -and (($maximum - $minimum) -le 10)
        if ($isLightNeutral) {
            $keyed.SetPixel($x, $y, [System.Drawing.Color]::Transparent)
        }
        else {
            $keyed.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(255, $pixel.R, $pixel.G, $pixel.B))
        }
    }
}

function Get-AlphaBounds {
    param([System.Drawing.Bitmap]$Bitmap)

    $minX = $Bitmap.Width
    $minY = $Bitmap.Height
    $maxX = -1
    $maxY = -1

    for ($y = 0; $y -lt $Bitmap.Height; $y++) {
        for ($x = 0; $x -lt $Bitmap.Width; $x++) {
            if ($Bitmap.GetPixel($x, $y).A -gt 0) {
                if ($x -lt $minX) { $minX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }

    if ($maxX -lt 0) {
        return [System.Drawing.Rectangle]::Empty
    }

    return New-Object System.Drawing.Rectangle($minX, $minY, ($maxX - $minX + 1), ($maxY - $minY + 1))
}

function Remove-IsolatedPixels {
    param([System.Drawing.Bitmap]$Bitmap)

    $pixelsToClear = New-Object 'System.Collections.Generic.List[System.Drawing.Point]'
    for ($y = 0; $y -lt $Bitmap.Height; $y++) {
        for ($x = 0; $x -lt $Bitmap.Width; $x++) {
            if ($Bitmap.GetPixel($x, $y).A -eq 0) { continue }

            $hasOpaqueNeighbor = $false
            for ($offsetY = -1; $offsetY -le 1 -and -not $hasOpaqueNeighbor; $offsetY++) {
                for ($offsetX = -1; $offsetX -le 1; $offsetX++) {
                    if ($offsetX -eq 0 -and $offsetY -eq 0) { continue }
                    $neighborX = $x + $offsetX
                    $neighborY = $y + $offsetY
                    if ($neighborX -lt 0 -or $neighborY -lt 0 -or $neighborX -ge $Bitmap.Width -or $neighborY -ge $Bitmap.Height) { continue }
                    if ($Bitmap.GetPixel($neighborX, $neighborY).A -gt 0) {
                        $hasOpaqueNeighbor = $true
                        break
                    }
                }
            }

            if (-not $hasOpaqueNeighbor) {
                $pixelsToClear.Add((New-Object System.Drawing.Point($x, $y)))
            }
        }
    }

    foreach ($point in $pixelsToClear) {
        $Bitmap.SetPixel($point.X, $point.Y, [System.Drawing.Color]::Transparent)
    }
}

$master = New-Object System.Drawing.Bitmap(($cellWidth * $columns), ($cellHeight * $rows), [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$masterGraphics = [System.Drawing.Graphics]::FromImage($master)
$masterGraphics.Clear([System.Drawing.Color]::Transparent)
$masterGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$masterGraphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half

$metadataFrames = @()

for ($row = 0; $row -lt $rows; $row++) {
    $clip = $clips[$row]
    $clipSheet = New-Object System.Drawing.Bitmap(($cellWidth * $columns), $cellHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $clipGraphics = [System.Drawing.Graphics]::FromImage($clipSheet)
    $clipGraphics.Clear([System.Drawing.Color]::Transparent)
    $clipGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
    $clipGraphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half

    $sourceTop = [int][Math]::Round(($row * $source.Height) / $rows)
    $sourceBottom = [int][Math]::Round((($row + 1) * $source.Height) / $rows)
    $sourceCellHeight = $sourceBottom - $sourceTop

    for ($column = 0; $column -lt $columns; $column++) {
        $sourceLeft = [int][Math]::Round(($column * $source.Width) / $columns)
        $sourceRight = [int][Math]::Round((($column + 1) * $source.Width) / $columns)
        $sourceCellWidth = $sourceRight - $sourceLeft
        $sourceRect = New-Object System.Drawing.Rectangle($sourceLeft, $sourceTop, $sourceCellWidth, $sourceCellHeight)

        $rawFrame = New-Object System.Drawing.Bitmap($sourceCellWidth, $sourceCellHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $rawGraphics = [System.Drawing.Graphics]::FromImage($rawFrame)
        $rawGraphics.Clear([System.Drawing.Color]::Transparent)
        $rawGraphics.DrawImage($keyed, (New-Object System.Drawing.Rectangle(0, 0, $sourceCellWidth, $sourceCellHeight)), $sourceRect, [System.Drawing.GraphicsUnit]::Pixel)
        $rawGraphics.Dispose()

        $bounds = Get-AlphaBounds -Bitmap $rawFrame
        $xOffset = [int][Math]::Floor(($cellWidth - $sourceCellWidth) / 2)
        $yOffset = $cellHeight - $bounds.Bottom

        $frame = New-Object System.Drawing.Bitmap($cellWidth, $cellHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $frameGraphics = [System.Drawing.Graphics]::FromImage($frame)
        $frameGraphics.Clear([System.Drawing.Color]::Transparent)
        $frameGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
        $frameGraphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
        $frameGraphics.DrawImageUnscaled($rawFrame, $xOffset, $yOffset)
        $frameGraphics.Dispose()
        Remove-IsolatedPixels -Bitmap $frame

        $frameNumber = $column + 1
        $frameName = '{0}_{1:d2}.png' -f $clip, $frameNumber
        $framePath = Join-Path (Join-Path $frameRoot $clip) $frameName
        $frame.Save($framePath, [System.Drawing.Imaging.ImageFormat]::Png)

        $clipGraphics.DrawImageUnscaled($frame, ($column * $cellWidth), 0)
        $masterGraphics.DrawImageUnscaled($frame, ($column * $cellWidth), ($row * $cellHeight))

        $metadataFrames += [ordered]@{
            clip = $clip
            frame = $frameNumber
            file = "Frames/$clip/$frameName"
            rect = [ordered]@{
                x = $column * $cellWidth
                y = $row * $cellHeight
                width = $cellWidth
                height = $cellHeight
            }
            pivot = [ordered]@{ x = 0.5; y = 0.0 }
            baselineY = $cellHeight - 1
        }

        $frame.Dispose()
        $rawFrame.Dispose()
    }

    $clipSheetPath = Join-Path $sheetRoot ("hooded_mechanic_{0}_4f_v1.png" -f $clip)
    $clipSheet.Save($clipSheetPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $clipGraphics.Dispose()
    $clipSheet.Dispose()
}

$masterPath = Join-Path $sheetRoot 'hooded_mechanic_all_4x4_v1.png'
$master.Save($masterPath, [System.Drawing.Imaging.ImageFormat]::Png)

$metadata = [ordered]@{
    formatVersion = 1
    character = 'hooded_mechanic'
    facing = 'right'
    sheet = 'Sheets/hooded_mechanic_all_4x4_v1.png'
    layout = [ordered]@{ columns = $columns; rows = $rows; cellWidth = $cellWidth; cellHeight = $cellHeight }
    commonPivot = [ordered]@{ x = 0.5; y = 0.0; description = 'bottom-center ground pivot' }
    clips = @(
        [ordered]@{ name = 'idle'; frames = 4; suggestedFps = 4; loop = $true },
        [ordered]@{ name = 'walk'; frames = 4; suggestedFps = 8; loop = $true },
        [ordered]@{ name = 'shoot'; frames = 4; suggestedFps = 10; loop = $false },
        [ordered]@{ name = 'crouch'; frames = 4; suggestedFps = 6; loop = $false }
    )
    frames = $metadataFrames
}

$metadataPath = Join-Path $outputRoot 'hooded_mechanic_animation_v1.json'
$metadata | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $metadataPath -Encoding UTF8

$masterGraphics.Dispose()
$master.Dispose()
$keyed.Dispose()
$source.Dispose()

Write-Output "Master sheet: $masterPath"
Write-Output "Metadata: $metadataPath"
