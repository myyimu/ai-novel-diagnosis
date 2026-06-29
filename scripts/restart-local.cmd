@echo off
call "%~dp0start-local.cmd" --Kill
exit /b %ERRORLEVEL%
