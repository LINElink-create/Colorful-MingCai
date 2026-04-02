@echo off
setlocal
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\restart-dev.ps1" %*
endlocal