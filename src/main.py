import logging, threading, json

from flask import Flask
from os import path, environ, makedirs
from app import App, Timer
from sys import stdout, exit
from queue import Queue
from time import sleep
from click import unstyle

# Format for the logger
FORMAT = '%(asctime)s %(levelname)s: %(message)s'

# The update rate
UPDATE_RATE = 0.5

# Save path in the appdata
SAVE_PATH = environ['APPDATA'] + "/Screen Time/python/"
# All the save paths
JSON_FILE_PATH = SAVE_PATH + 'saved.json'
LOCK_FILE_PATH = SAVE_PATH + 'lock.txt'
LOGS_FILE_PATH = SAVE_PATH + 'logs.log'

# Variables
currently_running_apps: list[App] = []
not_running_apps: list[App] = []
computer_uptime = Timer()
apps_array: list[dict] = []

# Create the Flask app
flask_app = Flask("Hello, World!")
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


def checkIfScriptIsAlreadRunning() -> None:
    try:
        with open(LOCK_FILE_PATH, 'r') as f:
            # Read the contents of the file
            lock = f.read()
            if lock == 'Locked':
                logger.warning('Script is already running, exitting now.')

                # Exit the program because another instance of this script is running
                exit(0)
            else:
                # Prevents other instances of this script from running
                with open(LOCK_FILE_PATH, 'w') as f:
                    f.write('Locked')   

    except FileNotFoundError:
                # Prevents other instances of this script from running
        with open(LOCK_FILE_PATH, 'x') as f:
            f.write('Locked')

def removeScriptLock() -> None:
    with open(LOCK_FILE_PATH, 'w') as f:
        # Clear the lock file
        f.write('')

        logger.info('Removed the lock.')

def createLogger() -> logging.Logger:
    # Create a conole logger
    stdout_handler = logging.StreamHandler(stream=stdout)

    try:
        file_handler = logging.FileHandler(LOGS_FILE_PATH)
    except FileNotFoundError:
        # Create a new log file
        open(LOGS_FILE_PATH, "x")

        # Create a new file logger
        file_handler = logging.FileHandler(LOGS_FILE_PATH)
    
    # Add the remove color filter to the fil logger
    file_handler.addFilter(RemoveColorFilter())

    # Configurate the logging library
    logging.basicConfig(format=FORMAT, handlers=[stdout_handler, file_handler], level=logging.DEBUG)
    # Create a new logger for this python script
    return logging.getLogger(__name__)

def checkSavePath() -> None:
    # If the save directory doesn't exist, create it
    if not path.exists(SAVE_PATH):
        makedirs(SAVE_PATH)

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

        # Exit because the script cannot load an empty file
        return

    try:
        # Convert the data (string) to a python dict
        json_dict = json.loads(json_str)
    except json.JSONDecodeError as e:
        logger.error(f"An error occured whilst trying to load the json file: {e.__str__()}")
        return
    
    # Create new apps from the data
    for i in json_dict['apps']:
        app = App.from_json(json.loads(i))
        app.start()
        apps.append(app)
    
    logger.info("Successfully loaded the json save file.")

    return apps

def save() -> None:
    apps = currently_running_apps + not_running_apps
    json_list: list[str] = []

    for i in apps:
        json_list.append(i.onSave())

    obj = {
        "apps": json_list,
    }
    # Convert the sict to a string
    json_str = json.dumps(obj)

    # Write the data to the json file
    with open(JSON_FILE_PATH, 'w') as f:
        f.write(json_str)
        logger.info(f"Successfully saved the json data to: {JSON_FILE_PATH}")

def update(q: Queue) -> None:
    import pywinctl

    def getAllAppsNames():
        # Get all running apps names
        apps_names = pywinctl.getAllAppsNames()

        # Remove the .exe from the apps
        for i in range(len(apps_names)):
            apps_names[i] = apps_names[i].replace(".exe", "")

        return apps_names

    def addAppToArray(name: str, total_uptime: float, current_uptime: float, running: bool) -> None:
        apps_array.append(json.dumps({
            "name": name,
            "total_uptime": total_uptime,
            "current_uptime": current_uptime,
            "running": running,
        }))

    while True:
        q.queue.clear()

        apps = getAllAppsNames()
        # Clear the apps array
        apps_array = []

        for i in currently_running_apps:
            # If the app doesn't exist anymore (it got closed) remove it from the currently running apps and add it to the not running apps
            if not i.name in apps:
                i.onKill()
                currently_running_apps.remove(i)
                not_running_apps.append(i)

                # Add a not running app
                addAppToArray(i.name, i.total_time_running, i.timer.get(), False)
            else:
                # Add a running app
                addAppToArray(i.name, i.total_time_running + i.timer.get(), i.timer.get(), True)

        for i in not_running_apps:
            # If the app exists in apps (it has been reopened) remove it from the not running apps and add it to the currently running apps
            if i.name in apps:
                currently_running_apps.append(i)
                not_running_apps.remove(i)
                i.resume()

                # Add a running app
                addAppToArray(i.name, i.total_time_running + i.timer.get(), i.timer.get(), True)

            else:
                # Add a not running app
                addAppToArray(i.name, i.total_time_running, i.timer.get(), False)

        # If it's a completly new app that is neither in the currently running apps nor in the not running apps, create a new app for it
        for i in apps:
            if (not i in ([j.name for j in currently_running_apps] or [j.name for j in not_running_apps])):
                app = App(i)
                app.start()
                currently_running_apps.append(app)
        
        # Add the apps_aray to the queue
        q.put(apps_array)

        sleep(UPDATE_RATE)
        
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

    checkIfScriptIsAlreadRunning()

    # Load data from the json file
    currently_running_apps = load()

    # Start the computer uptime time
    computer_uptime.start()

    # Create a thread for the update
    update_thread = threading.Thread(target=update, args=(update_queue,), daemon=True)
    # Start the thread
    update_thread.start()

    # Start the Flask app
    flask_app.run(port=FLASK_PORT)

    # Save the data to the json file
    save()

    # Remove the lock that prevents other scripts from running
    removeScriptLock()
    
    # Run sys.exit() after 1.0 seconds
    threading.Timer(1.0, exit()).start()
