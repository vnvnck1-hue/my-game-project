@echo off
rem First-time setup on a new PC: installs Godot 4.7 Standard via WinGet.
rem Exits early if Godot is already present. Afterwards use run.bat.
where godot >nul 2>nul && (echo [setup] Godot already on PATH & goto :done)
if exist "%LOCALAPPDATA%\Microsoft\WinGet\Links\godot.exe" (echo [setup] Godot already installed via WinGet & goto :done)
dir /b "%LOCALAPPDATA%\Microsoft\WinGet\Packages\GodotEngine.GodotEngine*" >nul 2>nul && (echo [setup] Godot already installed via WinGet & goto :done)

where winget >nul 2>nul || (
  echo [setup] winget not found. Download Godot 4.7.x Standard from
  echo         https://godotengine.org/download/windows/ and unzip it into C:\Godot
  echo         run.bat will find it there.
  pause
  exit /b 1
)

echo [setup] Installing Godot 4.7 Standard...
winget install --id GodotEngine.GodotEngine --exact --accept-source-agreements --accept-package-agreements --disable-interactivity
if errorlevel 1 (
  echo [setup] Install failed.
  pause
  exit /b 1
)

:done
echo [setup] Done. Run run.bat to start the project.
pause