@echo off

CALL ./BuildElectron.bat
CALL ./BuildPython.bat
CALL powershell "Compress-Archive -Path 'out/Screen Time-win32-x64' -DestinationPath 'out/Screen Time.zip' -Force"