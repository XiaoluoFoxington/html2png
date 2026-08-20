@echo off
rem HTML → PNG 一键启动（Windows）
cd /d "%~dp0"
node tools/serve.mjs %*
pause
