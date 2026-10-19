@echo off
chcp 65001 >nul
title 备考题本 - 请勿关闭此窗口
cd /d "%~dp0"
echo.
echo   正在启动备考题本...
echo.
where node >nul 2>nul
if %errorlevel%==0 (
    node server.js
    goto :end
)
where python >nul 2>nul
if %errorlevel%==0 (
    echo   （未检测到 Node，改用 Python 启动）
    echo   本机打开： http://localhost:8765/
    echo   手机打开： http://你的电脑IP:8765/  （用 ipconfig 查看 IPv4 地址）
    echo.
    start "" http://localhost:8765/
    python -m http.server 8765
    goto :end
)
echo   没有找到 Node 或 Python，无法启动本地服务器。
echo   你仍然可以直接双击打开： 备考题本-单文件版.html
echo.
pause
:end
