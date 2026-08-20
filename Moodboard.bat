@echo off
cd /d "C:\Dev\_Moodboard\MoodboardStudio"
netstat -ano | findstr ":8080" >nul
if errorlevel 1 (
    start "Moodboard-Server" /min python server.py
    timeout /t 2 /nobreak >nul
)
start "" "http://localhost:8080"
