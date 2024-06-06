@echo off

CALL rmdir /s /q out\Screen Time-win32-x64\python
CALL python3 -m PyInstaller --name "Screen Time Flask Server" --icon "./ressources/icon.ico" --onefile --noconfirm --windowed "./src/main.py"
CALL rmdir /s /q build
CALL move "./dist" "./out/Screen Time-win32-x64/python"