@echo off
cd /d "%~dp0"
py -3 site_editor.py
if errorlevel 1 (
  echo Python 3 is required. If it is installed, try: python site_editor.py
  pause
)
