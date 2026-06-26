@echo off
setlocal
for %%I in ("%~f0") do set "SCRIPT_DIR=%%~dpI"
cd /d "%SCRIPT_DIR%.."

rem Parse arguments. The .cmd entry is meant for double-click use, so
rem rerunning it restarts project-owned services instead of reusing them.
set AUTO_INSTALL_ARG=
set START_LOCAL_ARGS=-Kill

:parse_args
if "%~1"=="" goto args_done
if /I "%~1"=="--auto-install" (
    set AUTO_INSTALL_ARG=-AutoInstall
    shift
    goto parse_args
)
if /I "%~1"=="-a" (
    set AUTO_INSTALL_ARG=-AutoInstall
    shift
    goto parse_args
)
set START_LOCAL_ARGS=%START_LOCAL_ARGS% "%~1"
shift
goto parse_args

:args_done

rem Check environment first
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%check-env.ps1" %AUTO_INSTALL_ARG%
if errorlevel 1 (
    echo.
    echo Environment check failed. Press any key to exit...
    pause >nul
    exit /b 1
)

rem Start the main script
set START_LOCAL_ENV_CHECKED=1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%start-local.ps1" %START_LOCAL_ARGS%

if errorlevel 1 (
    echo.
    echo Script execution error. Press any key to exit...
    pause >nul
) else (
    echo.
    echo Press any key to close this window...
    pause >nul
)
endlocal
