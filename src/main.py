import logging
import json
import os
import sys
import time
import psutil
import threading
import win32gui, win32con, win32api, win32process

from typing import Callable
from flask import Flask
from app import App, Timer
from queue import Queue
from click import unstyle

# Format for the logger
FORMAT = "%(asctime)s %(levelname)s: %(message)s"

# The saving rate
SAVE_RATE = 20.0 # In seconds

# The app's name (maybe for later :shrug:)
APP_NAME = "Screen Time.exe"

# Save path in the appdata
SAVE_PATH = os.environ["APPDATA"] + "/Screen Time/python/"
# All the save paths
JSON_FILE_PATH = SAVE_PATH + "saved.json"
LOGS_FILE_PATH = SAVE_PATH + "logs.log"

# Variables
computer_uptime = Timer()
currently_running_apps: list[App] = []
not_running_apps: list[App] = []
apps_array: list[dict] = []

# Create the Flask app
flask_app = Flask("Screen Time")
# The port for the Flask app
FLASK_PORT = 8080

# A filter for the logger to remove the color from the logs
class RemoveColorFilter(logging.Filter):
    def filter(self, record) -> bool:
        if record and record.msg and isinstance(record.msg, str):
            # Remove any styling from the text
            record.msg = unstyle(record.msg) 
        return True
    
def checkIfScriptIsAlreadRunning() -> bool:
    for i in psutil.net_connections("inet4"):
        # Check if the port is already in use
        if i.laddr.ip == "127.0.0.1" and i.laddr.port == FLASK_PORT:
            return True
    return False

def createLogger() -> logging.Logger:
    # Create a conole logger
    stdout_handler = logging.StreamHandler(stream=sys.stdout)
    file_handler = logging.FileHandler(LOGS_FILE_PATH)
    
    # Add the remove color filter to the fil logger
    file_handler.addFilter(RemoveColorFilter())

    # Configurate the logging library
    logging.basicConfig(format=FORMAT, handlers=[stdout_handler, file_handler], level=logging.DEBUG)
    # Create a new logger for this python script
    return logging.getLogger(__name__)

def checkSavePath() -> None:
    # If the save directory doesn't exist, create it
    if not os.path.exists(SAVE_PATH):
        logger.info("The save folder doesn't exist. Creating it now...")
        os.makedirs(SAVE_PATH)

def load() -> list[App]:
    json_str = ""
    apps = []

    try:
        # Get data from json file
        with open(JSON_FILE_PATH, "r+") as f:
            json_str = f.read()
    except FileNotFoundError:
        logger.info("The json save file doesn't exist. Creating it now and skipping the loading of the data.")
        # Create a new json file
        open(JSON_FILE_PATH, "x")

        return []

    try:
        # Convert the data (string) to a python dict
        json_dict = json.loads(json_str)
    except json.JSONDecodeError as e:
        logger.error(f"An error occured whilst trying to load the json file: {e.__str__()}")
        return []
    
    # Create new apps from the data
    for i in json_dict["apps"]:
        app = App.from_json(json.loads(i))
        app.start()
        apps.append(app)
    
    logger.info("Successfully loaded the json save file.")

    return apps

def test(func: Callable):
    t0 = time.time()

    try: result = func()
    except TypeError: 
        func()
        result = None

    t1 = time.time()

    print(t1 - t0)

    return result

def getFriendlyName(path: str) -> str:
    # https://stackoverflow.com/a/14822821
    try:
        language, codepage = win32api.GetFileVersionInfo(path, '\\VarFileInfo\\Translation')[0]
        file_desc = win32api.GetFileVersionInfo(path, fr'\StringFileInfo\{language:04X}{codepage:04X}\FileDescription')
    except Exception as _:
        file_desc = None
        
    if file_desc == None:
        exe_name = os.path.split(path)[1] # Get the exe name
        file_desc = os.path.splitext(exe_name)[0] # Get the exe without it's extension

    return file_desc

def getAppNameAndPid(hwnd):
    try:
        _, pid = win32process.GetWindowThreadProcessId(hwnd)
        name = psutil.Process(pid).name()

        return name, pid
    except Exception as e:
        return None, None

def isRealWindow(hwnd):
    if not win32gui.IsWindowVisible(hwnd):
        return False
    if win32gui.GetParent(hwnd) != 0:
        return False
    if win32gui.GetWindowText(hwnd) == "":
        return False
    if win32gui.GetWindow(hwnd, win32con.GW_OWNER) != 0:
        return False
    if (win32gui.GetWindowLong(hwnd, win32con.GWL_EXSTYLE) & win32con.WS_EX_TOOLWINDOW):
        return False
    if (win32gui.GetWindowLong(hwnd, win32con.GWL_STYLE) & win32con.WS_POPUP):
        return False
    return True

def getVisibleWindows():
    def callback(hwnd, windows):
        if isRealWindow(hwnd):
            windows.append(hwnd)

        return True

    windows = []

    # Get all the hwnd (handle to a window)
    win32gui.EnumWindows(callback, windows)

    return windows

def getAllAppsNames():
    visible_windows = getVisibleWindows()
    apps: list[str] = []

    for hwnd in visible_windows:
        app_name, pid = getAppNameAndPid(hwnd)

        if app_name:
            exe_path = psutil.Process(pid).exe()
            real_app_name = getFriendlyName(exe_path)

            apps.append(real_app_name)

    return apps 

def save() -> None:
    global save_timer

    apps = currently_running_apps + not_running_apps
    json_list: list[str] = [i.onSave() for i in apps]

    # Convert the dict to a string
    json_str = json.dumps({
        "apps": json_list,
    })

    # Write the data to the json file
    with open(JSON_FILE_PATH, "w") as f:
        f.write(json_str)
        logger.info(f"Successfully saved the json data to: {JSON_FILE_PATH}")

    save_timer = threading.Timer(SAVE_RATE, save)
    save_timer.daemon = True
    save_timer.start()

def update() -> None:
    global apps_array

    def addAppToArray(name: str, total_uptime: float, current_uptime: float, running: bool) -> None:
        apps_array.append(json.dumps({
            "name": name,
            "total_uptime": total_uptime,
            "current_uptime": current_uptime,
            "running": running,
        }))

    def removeAppFromCurrrentlyRunningApps(i: App) -> None:
        i.onKill()

        currently_running_apps.remove(i)
        not_running_apps.append(i)

    def removeAppFromNotRunningApps(i: App) -> None:
        currently_running_apps.append(i)
        not_running_apps.remove(i)

        i.resume()

    apps = getAllAppsNames()
    
    # Clear the apps array
    apps_array = []

    for i in apps:
        if not (i in [i.name for i in currently_running_apps]) and not (i in [i.name for i in not_running_apps]):
            app = App(i)
            app.start()

            currently_running_apps.append(app)

    for i in currently_running_apps:
        # If the app doesn't exist anymore (it got closed) remove it from the currently running apps and add it to the not running apps
        if not i.name in apps:
            removeAppFromCurrrentlyRunningApps(i)

            # Don't need to add it to the apps_array because it will get added by the next for loop
        else:
            # Add a running app
            addAppToArray(i.name, i.total_time_running + i.timer.get(), i.timer.get(), True)

    for k in not_running_apps:
        # If the app exists in apps (it has been reopened) remove it from the not running apps and add it to the currently running apps
        if k.name in apps:
            removeAppFromNotRunningApps(k)

            # Add a running app
            addAppToArray(k.name, k.total_time_running + k.timer.get(), k.timer.get(), True)
        else:
            # Add a not running app
            addAppToArray(k.name, k.total_time_running, 0, False)

@flask_app.route("/screen-time", methods=["POST"])
def home() -> dict:
    update()

    # Create the payload that gets sent back
    payload = {
        "apps": apps_array,
        "computer_uptime": computer_uptime.get()
    }

    return payload

def main() -> None:
    global logger
    global currently_running_apps
    global save_timer

    # Check if the save path exists
    checkSavePath()
    # Create the logger
    logger = createLogger()

    if checkIfScriptIsAlreadRunning(): 
        logger.error("Script is already running. Exitting now")
        sys.exit(0)

    # Load data from the json file
    currently_running_apps = load()

    # Start the computer uptime time
    computer_uptime.start()

    save_timer = threading.Timer(SAVE_RATE, save)
    save_timer.daemon = True
    save_timer.start()

    # Run the flask app
    flask_app.run(port=FLASK_PORT)

    # Only used when testing when Ctrl+C is pressed
    save()

    sys.exit(0)

if __name__ == "__main__":
    main()
