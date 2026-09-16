param(
    [string]$WorkspaceRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$generatedRoot = Join-Path $WorkspaceRoot 'Assets\Generated'
$gameRoot = Join-Path $WorkspaceRoot 'Assets\GameReady'
$tileRoot = Join-Path $gameRoot 'Tiles\Workshop'
$propRoot = Join-Path $gameRoot 'Props\Workshop'
$connectorRoot = Join-Path $gameRoot 'Connectors'
$validationRoot = Join-Path $gameRoot 'Validation'

@($tileRoot, $propRoot, $connectorRoot, $validationRoot) | ForEach-Object {
    New-Item -ItemType Directory -Force -Path $_ | Out-Null
}

function New-ArgbBitmap {
    param([int]$Width, [int]$Height)
    return [System.Drawing.Bitmap]::new(
        $Width,
        $Height,
        [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
    )
}

function Load-BitmapCopy {
    param([string]$Path)
    $source = [System.Drawing.Bitmap]::FromFile($Path)
    try {
        $copy = New-ArgbBitmap -Width $source.Width -Height $source.Height
        $graphics = [System.Drawing.Graphics]::FromImage($copy)
        try {
            $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
            $graphics.DrawImageUnscaled($source, 0, 0)
        }
        finally {
            $graphics.Dispose()
        }
        return $copy
    }
    finally {
        $source.Dispose()
    }
}

function Export-LightNeutralKeyedImage {
    param(
        [string]$SourcePath,
        [string]$OutputPath
    )

    $bitmap = Load-BitmapCopy -Path $SourcePath
    try {
        $rect = [System.Drawing.Rectangle]::new(0, 0, $bitmap.Width, $bitmap.Height)
        $data = $bitmap.LockBits(
            $rect,
            [System.Drawing.Imaging.ImageLockMode]::ReadWrite,
            [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
        )
        try {
            $stride = [Math]::Abs($data.Stride)
            $bytes = [byte[]]::new($stride * $bitmap.Height)
            [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)

            for ($y = 0; $y -lt $bitmap.Height; $y++) {
                $row = $y * $stride
                for ($x = 0; $x -lt $bitmap.Width; $x++) {
                    $index = $row + ($x * 4)
                    $blue = [int]$bytes[$index]
                    $green = [int]$bytes[$index + 1]
                    $red = [int]$bytes[$index + 2]
                    $minimum = [Math]::Min($red, [Math]::Min($green, $blue))
                    $maximum = [Math]::Max($red, [Math]::Max($green, $blue))

                    # The failed extraction background is a bright, nearly neutral checker pattern.
                    # Warm metal highlights remain because their channel spread is much larger.
                    if (($minimum -ge 155) -and (($maximum - $minimum) -le 34)) {
                        $bytes[$index + 3] = 0
                    }
                }
            }

            [System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $data.Scan0, $bytes.Length)
        }
        finally {
            $bitmap.UnlockBits($data)
        }

        $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    }
    finally {
        $bitmap.Dispose()
    }
}

function Crop-Bitmap {
    param(
        [System.Drawing.Bitmap]$Source,
        [System.Drawing.Rectangle]$Bounds
    )
    $cropped = New-ArgbBitmap -Width $Bounds.Width -Height $Bounds.Height
    $graphics = [System.Drawing.Graphics]::FromImage($cropped)
    try {
        $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
        $destination = [System.Drawing.Rectangle]::new(0, 0, $Bounds.Width, $Bounds.Height)
        $graphics.DrawImage($Source, $destination, $Bounds, [System.Drawing.GraphicsUnit]::Pixel)
    }
    finally {
        $graphics.Dispose()
    }
    return $cropped
}

function Get-AlphaBounds {
    param([System.Drawing.Bitmap]$Bitmap)

    $rect = [System.Drawing.Rectangle]::new(0, 0, $Bitmap.Width, $Bitmap.Height)
    $data = $Bitmap.LockBits(
        $rect,
        [System.Drawing.Imaging.ImageLockMode]::ReadOnly,
        [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
    )
    try {
        $stride = [Math]::Abs($data.Stride)
        $bytes = [byte[]]::new($stride * $Bitmap.Height)
        [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)

        $minX = $Bitmap.Width
        $minY = $Bitmap.Height
        $maxX = -1
        $maxY = -1

        for ($y = 0; $y -lt $Bitmap.Height; $y++) {
            $row = $y * $stride
            for ($x = 0; $x -lt $Bitmap.Width; $x++) {
                if ($bytes[$row + ($x * 4) + 3] -gt 0) {
                    if ($x -lt $minX) { $minX = $x }
                    if ($x -gt $maxX) { $maxX = $x }
                    if ($y -lt $minY) { $minY = $y }
                    if ($y -gt $maxY) { $maxY = $y }
                }
            }
        }
    }
    finally {
        $Bitmap.UnlockBits($data)
    }

    if ($maxX -lt 0) {
        throw 'The sprite contains no non-transparent pixels.'
    }

    return [System.Drawing.Rectangle]::new(
        $minX,
        $minY,
        ($maxX - $minX + 1),
        ($maxY - $minY + 1)
    )
}

function Resize-Nearest {
    param(
        [System.Drawing.Bitmap]$Source,
        [int]$TargetHeight
    )
    $targetWidth = [Math]::Max(1, [int][Math]::Round($Source.Width * ($TargetHeight / [double]$Source.Height)))
    $resized = New-ArgbBitmap -Width $targetWidth -Height $TargetHeight
    $graphics = [System.Drawing.Graphics]::FromImage($resized)
    try {
        $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighSpeed
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None
        $graphics.DrawImage(
            $Source,
            [System.Drawing.Rectangle]::new(0, 0, $targetWidth, $TargetHeight),
            0,
            0,
            $Source.Width,
            $Source.Height,
            [System.Drawing.GraphicsUnit]::Pixel
        )
    }
    finally {
        $graphics.Dispose()
    }
    return $resized
}

function Export-CroppedSprite {
    param(
        [string]$SourcePath,
        [string]$OutputPath,
        [int]$TargetHeight
    )
    $source = Load-BitmapCopy -Path $SourcePath
    try {
        $bounds = Get-AlphaBounds -Bitmap $source
        $cropped = Crop-Bitmap -Source $source -Bounds $bounds
        try {
            $resized = Resize-Nearest -Source $cropped -TargetHeight $TargetHeight
            try {
                $resized.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
                return [pscustomobject]@{
                    Path = $OutputPath
                    Width = $resized.Width
                    Height = $resized.Height
                }
            }
            finally {
                $resized.Dispose()
            }
        }
        finally {
            $cropped.Dispose()
        }
    }
    finally {
        $source.Dispose()
    }
}

function Export-Tile {
    param(
        [System.Drawing.Bitmap]$Source,
        [string]$Name,
        [System.Drawing.Rectangle]$Bounds
    )
    $tile = Crop-Bitmap -Source $Source -Bounds $Bounds
    try {
        $path = Join-Path $tileRoot ($Name + '.png')
        $tile.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
        return [pscustomobject]@{
            Name = $Name
            Path = $path
            Width = $tile.Width
            Height = $tile.Height
        }
    }
    finally {
        $tile.Dispose()
    }
}

function Export-MirroredTile {
    param(
        [string]$SourcePath,
        [string]$Name
    )
    $tile = Load-BitmapCopy -Path $SourcePath
    try {
        $tile.RotateFlip([System.Drawing.RotateFlipType]::RotateNoneFlipX)
        $path = Join-Path $tileRoot ($Name + '.png')
        $tile.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
        return [pscustomobject]@{
            Name = $Name
            Path = $path
            Width = $tile.Width
            Height = $tile.Height
        }
    }
    finally {
        $tile.Dispose()
    }
}

function Draw-ImageUnscaledAtFloor {
    param(
        [System.Drawing.Graphics]$Graphics,
        [string]$Path,
        [int]$X,
        [int]$FloorY
    )
    $image = Load-BitmapCopy -Path $Path
    try {
        $Graphics.DrawImageUnscaled($image, $X, ($FloorY - $image.Height))
        return [pscustomobject]@{
            X = $X
            Y = $FloorY - $image.Height
            Width = $image.Width
            Height = $image.Height
        }
    }
    finally {
        $image.Dispose()
    }
}

function Draw-PixelContactShadow {
    param(
        [System.Drawing.Graphics]$Graphics,
        [int]$X,
        [int]$Width,
        [int]$FloorY,
        [int]$Inset
    )

    $shadowWidth = [Math]::Max(12, $Width - ($Inset * 2))
    $innerWidth = [Math]::Max(8, $shadowWidth - 24)
    $brush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(155, 4, 3, 10))
    try {
        # Hard rectangular clusters provide contact without introducing a soft ellipse or blur.
        $Graphics.FillRectangle($brush, ($X + $Inset), ($FloorY - 3), $shadowWidth, 7)
        $Graphics.FillRectangle($brush, ($X + $Inset + 12), ($FloorY - 6), $innerWidth, 4)
    }
    finally {
        $brush.Dispose()
    }
}

$backgroundPath = Join-Path $generatedRoot 'Environments\workshop_empty_background_plate_v1.png'
$background = Load-BitmapCopy -Path $backgroundPath

try {
    # Full-height construction tiles. All share the same ceiling-to-foundation span.
    $tileY = 184
    $tileHeight = 560
    $tiles = @(
        Export-Tile -Source $background -Name 'workshop_cap_left' -Bounds ([System.Drawing.Rectangle]::new(144, $tileY, 160, $tileHeight))
        Export-Tile -Source $background -Name 'workshop_wall_a' -Bounds ([System.Drawing.Rectangle]::new(304, $tileY, 256, $tileHeight))
        Export-Tile -Source $background -Name 'workshop_wall_b' -Bounds ([System.Drawing.Rectangle]::new(560, $tileY, 256, $tileHeight))
        Export-Tile -Source $background -Name 'workshop_wall_repeat' -Bounds ([System.Drawing.Rectangle]::new(704, $tileY, 256, $tileHeight))
        Export-Tile -Source $background -Name 'workshop_wall_c' -Bounds ([System.Drawing.Rectangle]::new(816, $tileY, 256, $tileHeight))
        Export-Tile -Source $background -Name 'workshop_wall_d' -Bounds ([System.Drawing.Rectangle]::new(1072, $tileY, 256, $tileHeight))
        Export-Tile -Source $background -Name 'workshop_cap_right' -Bounds ([System.Drawing.Rectangle]::new(1360, $tileY, 160, $tileHeight))
    )
}
finally {
    $background.Dispose()
}

$tiles += Export-MirroredTile -SourcePath (Join-Path $tileRoot 'workshop_wall_c.png') -Name 'workshop_wall_c_mirror'
$tiles += Export-MirroredTile -SourcePath (Join-Path $tileRoot 'workshop_wall_d.png') -Name 'workshop_wall_d_mirror'

$sourceProps = Join-Path $generatedRoot 'ChunkyPixelSet'
$canonicalProps = Join-Path $generatedRoot 'CanonicalProps'
$workbenchAlphaSource = Join-Path $canonicalProps 'workshop_workbench_corrected_projection_v2.png'
Export-LightNeutralKeyedImage -SourcePath (Join-Path $canonicalProps 'workshop_workbench_corrected_projection_rgb_v2.png') -OutputPath $workbenchAlphaSource

$locker = Export-CroppedSprite -SourcePath (Join-Path $canonicalProps 'workshop_cabinet_reference_projection_v2.png') -OutputPath (Join-Path $propRoot 'workshop_locker_game_scale.png') -TargetHeight 315
$workbench = Export-CroppedSprite -SourcePath $workbenchAlphaSource -OutputPath (Join-Path $propRoot 'workshop_workbench_game_scale.png') -TargetHeight 235
$armchair = Export-CroppedSprite -SourcePath (Join-Path $canonicalProps 'workshop_armchair_reference_projection_v2.png') -OutputPath (Join-Path $propRoot 'workshop_armchair_game_scale.png') -TargetHeight 240
$character = Export-CroppedSprite -SourcePath (Join-Path $sourceProps 'character_hooded_mechanic.png') -OutputPath (Join-Path $propRoot 'mechanic_character_game_scale.png') -TargetHeight 245
$frontDoor = Export-CroppedSprite -SourcePath (Join-Path $generatedRoot 'Connectors\bulkhead_sliding_door_closed_v1.png') -OutputPath (Join-Path $connectorRoot 'front_bulkhead_door_game_scale.png') -TargetHeight 330
$sideDoorClosed = Export-CroppedSprite -SourcePath (Join-Path $generatedRoot 'Connectors\sidewall_shutter_closed_edge_v2.png') -OutputPath (Join-Path $connectorRoot 'sidewall_shutter_closed_edge_game_scale.png') -TargetHeight 480
$sideDoorOpen = Export-CroppedSprite -SourcePath (Join-Path $generatedRoot 'Connectors\sidewall_shutter_open_frame_v2.png') -OutputPath (Join-Path $connectorRoot 'sidewall_shutter_open_frame_game_scale.png') -TargetHeight 480

$canvasWidth = 2304
$canvasHeight = 941
$roomX = 96
$roomY = 184
$floorY = 670
$roomBackground = New-ArgbBitmap -Width $canvasWidth -Height $canvasHeight
$graphics = [System.Drawing.Graphics]::FromImage($roomBackground)

try {
    $graphics.Clear([System.Drawing.Color]::FromArgb(255, 7, 9, 20))
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None

    $sequence = @(
        'workshop_cap_left',
        'workshop_wall_a',
        'workshop_wall_b',
        'workshop_wall_c',
        'workshop_wall_d',
        'workshop_wall_c_mirror',
        'workshop_wall_d_mirror',
        'workshop_wall_c',
        'workshop_cap_right'
    )

    $cursorX = $roomX
    foreach ($name in $sequence) {
        $path = Join-Path $tileRoot ($name + '.png')
        $tile = Load-BitmapCopy -Path $path
        try {
            $graphics.DrawImageUnscaled($tile, $cursorX, $roomY)
            $cursorX += $tile.Width
        }
        finally {
            $tile.Dispose()
        }
    }
}
finally {
    $graphics.Dispose()
}

$backgroundOutput = Join-Path $validationRoot 'workshop_long_room_background_tiles_only.png'
$roomBackground.Save($backgroundOutput, [System.Drawing.Imaging.ImageFormat]::Png)

$scene = New-ArgbBitmap -Width $canvasWidth -Height $canvasHeight
$sceneGraphics = [System.Drawing.Graphics]::FromImage($scene)
try {
    $sceneGraphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
    $sceneGraphics.DrawImageUnscaled($roomBackground, 0, 0)
    $sceneGraphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
    $sceneGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
    $sceneGraphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
    $sceneGraphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None

    # The front door is a back-wall destination. Draw it before floor-standing props.
    $frontDoorPlacement = Draw-ImageUnscaledAtFloor -Graphics $sceneGraphics -Path $frontDoor.Path -X 1120 -FloorY ($floorY + 24)

    # Separate hard-edged contact shadows restore the grounding that was present in the original diorama.
    Draw-PixelContactShadow -Graphics $sceneGraphics -X 250 -Width $locker.Width -FloorY $floorY -Inset 34
    Draw-PixelContactShadow -Graphics $sceneGraphics -X 650 -Width $workbench.Width -FloorY $floorY -Inset 36
    Draw-PixelContactShadow -Graphics $sceneGraphics -X 1510 -Width $armchair.Width -FloorY $floorY -Inset 28
    Draw-PixelContactShadow -Graphics $sceneGraphics -X 1840 -Width $character.Width -FloorY $floorY -Inset 54

    $lockerPlacement = Draw-ImageUnscaledAtFloor -Graphics $sceneGraphics -Path $locker.Path -X 250 -FloorY ($floorY + 3)
    $workbenchPlacement = Draw-ImageUnscaledAtFloor -Graphics $sceneGraphics -Path $workbench.Path -X 650 -FloorY ($floorY + 3)
    $armchairPlacement = Draw-ImageUnscaledAtFloor -Graphics $sceneGraphics -Path $armchair.Path -X 1510 -FloorY ($floorY + 3)
    $characterPlacement = Draw-ImageUnscaledAtFloor -Graphics $sceneGraphics -Path $character.Path -X 1840 -FloorY ($floorY + 6)

    $roomRight = $roomX + 2112
    $sideDoorX = $roomRight - [int][Math]::Floor($sideDoorClosed.Width / 2)
    $sideDoorPlacement = Draw-ImageUnscaledAtFloor -Graphics $sceneGraphics -Path $sideDoorClosed.Path -X $sideDoorX -FloorY ($floorY + 8)
}
finally {
    $sceneGraphics.Dispose()
    $roomBackground.Dispose()
}

$sceneOutput = Join-Path $validationRoot 'workshop_long_room_tile_prop_validation.png'
$scene.Save($sceneOutput, [System.Drawing.Imaging.ImageFormat]::Png)
$scene.Dispose()

$metadata = [ordered]@{
    formatVersion = 1
    sourceBackground = 'Assets/Generated/Environments/workshop_empty_background_plate_v1.png'
    canvas = [ordered]@{ width = $canvasWidth; height = $canvasHeight }
    roomOrigin = [ordered]@{ x = $roomX; y = $roomY }
    floorY = $floorY
    constructionTileHeight = $tileHeight
    tileSequence = $sequence
    connectorTypes = [ordered]@{
        frontDoor = 'Assets/GameReady/Connectors/front_bulkhead_door_game_scale.png'
        sideWallDoorClosed = 'Assets/GameReady/Connectors/sidewall_shutter_closed_edge_game_scale.png'
        sideWallDoorOpen = 'Assets/GameReady/Connectors/sidewall_shutter_open_frame_game_scale.png'
    }
    placements = [ordered]@{
        frontDoor = $frontDoorPlacement
        locker = $lockerPlacement
        workbench = $workbenchPlacement
        armchair = $armchairPlacement
        character = $characterPlacement
        sideWallDoor = $sideDoorPlacement
    }
}

$metadataPath = Join-Path $validationRoot 'workshop_long_room_tile_prop_validation.json'
$metadata | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $metadataPath -Encoding UTF8

Write-Output "Tiles: $tileRoot"
Write-Output "Props: $propRoot"
Write-Output "Connectors: $connectorRoot"
Write-Output "Background validation: $backgroundOutput"
Write-Output "Placement validation: $sceneOutput"
Write-Output "Metadata: $metadataPath"
