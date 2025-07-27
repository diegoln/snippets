@echo off
REM Windows wrapper for the OAuth URI update script
REM This allows Windows users to run the script without WSL

echo Running OAuth URI update script...

REM Check if running in WSL
where wsl >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    REM Use WSL to run the bash script
    wsl bash ./scripts/update-oauth-uris.sh
) else (
    REM Try to run with Git Bash if available
    where bash >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
        bash ./scripts/update-oauth-uris.sh
    ) else (
        echo Error: Neither WSL nor Git Bash found.
        echo Please install one of them to run this script.
        echo.
        echo Alternatively, you can run the following commands manually:
        echo 1. Get your Cloud Run URL
        echo 2. Update OAuth redirect URIs in Google Cloud Console
        echo 3. Update NEXTAUTH_URL environment variable in Cloud Run
        exit /b 1
    )
)