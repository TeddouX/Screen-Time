@echo off

CALL move "out/Screen Time-win32-x64/python" "python"
CALL npm run package
CALL move "python" "out/Screen Time-win32-x64/python"