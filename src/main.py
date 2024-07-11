import logging
import threading
import json
import os
import sys
import time
import psutil

from flask import Flask
from app import App, Timer
from queue import Queue
from time import sleep
from click import unstyle

# Format for the logger
FORMAT = '%(asctime)s %(levelname)s: %(message)s'

# The update rate
UPDATE_RATE = 2

# The saving rate
SAVE_RATE = round(10 / UPDATE_RATE) # Every n seconds

# The app's name (maybe for later :shrug:)
APP_NAME = "Screen Time.exe"

# Save path in the appdata
SAVE_PATH = os.environ['APPDATA'] + "/Screen Time/python/"
# All the save paths
JSON_FILE_PATH = SAVE_PATH + 'saved.json'
LOCK_FILE_PATH = SAVE_PATH + 'lock.txt'
LOGS_FILE_PATH = SAVE_PATH + 'logs.log'

# Variables
computer_uptime = Timer()
currently_running_apps: list[App] = []
not_running_apps: list[App] = []
apps_array: list[dict] = []

# Create the Flask app
flask_app = Flask("Screen Time")
# The port for the Flask app
FLASK_PORT = 8080

# A queue yo use inter-thread communication
update_queue = Queue(1)

# A filter for the logger to remove the color from the logs
class RemoveColorFilter(logging.Filter):
    def filter(self, record) -> bool:
        if record and record.msg and isinstance(record.msg, str):
            # Remove any styling from the text
            record.msg = unstyle(record.msg) 
        return True
    
def checkIfScriptIsAlreadRunning() -> bool:
    for i in psutil.net_connections():
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
        with open(JSON_FILE_PATH, 'r+') as f:
            json_str = f.read()
    except FileNotFoundError:
        logger.info("The json save file doesn't exist. Creating it now and skipping the loading of the data.")
        # Create a new json file
        open(JSON_FILE_PATH, 'x')

        return []

    try:
        # Convert the data (string) to a python dict
        json_dict = json.loads(json_str)
    except json.JSONDecodeError as e:
        logger.error(f"An error occured whilst trying to load the json file: {e.__str__()}")
        return []
    
    # Create new apps from the data
    for i in json_dict['apps']:
        app = App.from_json(json.loads(i))
        app.start()
        apps.append(app)
    
    logger.info("Successfully loaded the json save file.")

    return apps

def save() -> None:
    apps = currently_running_apps + not_running_apps
    json_list: list[str] = [i.onSave() for i in apps]

    # Convert the dict to a string
    json_str = json.dumps({
        "apps": json_list,
    })

    # Write the data to the json file
    with open(JSON_FILE_PATH, 'w') as f:
        f.write(json_str)
        logger.info(f"Successfully saved the json data to: {JSON_FILE_PATH}")

def update(q: Queue) -> None:
    import pywinctl

    def getAllAppsNames() -> list[str]:
        # Get all running apps names
        apps_names = pywinctl.getAllAppsNames()

        # Remove the ".exe" from all apps names
        apps_names = [i.replace(".exe", "") for i in apps_names]

        return apps_names

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

        # Add a running app
        addAppToArray(i.name, i.total_time_running + i.timer.get(), i.timer.get(), True)

    j = 0
    while True:
        if j % SAVE_RATE == 0:
            save()
            j = 0

        q.queue.clear()

        apps = getAllAppsNames()
        # Clear the apps array
        apps_array = []

        try:
            # Apps that are neither in the currently running apps nor in the not running apps
            new_apps = [i for i in apps if (not i in ([j.name for j in currently_running_apps] or [j.name for j in not_running_apps]))]
        except TypeError:
            new_apps = apps

        # Create a new App class for all the new apps
        for i in new_apps:
            app = App(i)
            app.start()
            currently_running_apps.append(app)

        for i in currently_running_apps:
            # If the app doesn't exist anymore (it got closed) remove it from the currently running apps and add it to the not running apps
            if not i.name in apps:
                removeAppFromCurrrentlyRunningApps(i)

                # Add a not running app
                addAppToArray(i.name, i.total_time_running, i.timer.get(), False)
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
                addAppToArray(k.name, k.total_time_running, k.timer.get(), False)
    
        # Add the apps_aray to the queue
        q.put(apps_array)

        sleep(UPDATE_RATE)

        j += 1

@flask_app.route("/screen-time", methods=['POST'])
def home() -> dict:
    # While the update queue is empty, don't do anything
    while not update_queue.full():
        pass

    # Set the apps_array to the contents of the queue
    apps_array = update_queue.get()

    # Create the payload that gets sent back
    payload = {
        "apps": apps_array,
        "computer_uptime": computer_uptime.get()
    }

    return payload

if __name__ == '__main__':
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

    # Create a thread for the update
    threading.Thread(target=update, args=(update_queue,), daemon=True).start()
    # Run the flask app
    flask_app.run(port=FLASK_PORT)

    # Only used when testing when Ctrl+C is pressed
    save()
    sys.exit(0)
