@echo off
cd /d "%~dp0deploy"
echo Starting frontend on HTTPS port 443...
node combined-server.js
