import requests
import time
import json

from pywinctl import getAllAppsNames
from os import path, environ, makedirs
from app import App, Timer

json_file_path = environ['APPDATA'] + '/Screen Time/saved'

currently_running_app: list[App] = []
not_running_apps: list[App] = []
apps_display_names = {}
hidden_apps: list[str] = []
computer_uptime = Timer()

url = "http://127.0.0.1:3030/"

def load():
    global apps_display_names
    global hidden_apps

    with open(f"{json_file_path}/saved.json", 'r') as f:
        json_str = f.read()

    try:
        json_dict = json.loads(json_str)
    except json.JSONDecodeError:
        return
    
    for i in json_dict['apps']:
        app = App.from_json(json.loads(i))
        app.start()
        currently_running_app.append(app)
    
    apps_display_names = json_dict['apps_display_names']
    hidden_apps = json_dict['hidden_apps']

def save():
    apps = currently_running_app + not_running_apps
    json_list: list[str] = []

    for i in apps:
        json_list.append(i.on_save())

    obj = {
        "apps": json_list,
        "apps_display_names": apps_display_names,
        "hidden_apps": hidden_apps,
    }
    json_str = json.dumps(obj)

    if not path.exists(json_file_path):
        makedirs(json_file_path)

    with open(f"{json_file_path}/saved.json", 'w') as f:
        f.write(json_str)

def update():
    apps = getAllAppsNames()
    apps_array = []

    for i in not_running_apps:
        if i.name in apps:
            currently_running_app.append(i)
            not_running_apps.remove(i)
            i.resume()
    
    for i in currently_running_app:
        if not i.name in apps:
            i.on_kill()
            currently_running_app.remove(i)
            not_running_apps.append(i)

        apps_array.append(json.dumps({
            "name": i.name,
            "total_uptime": i.total_time_running + i.timer.get(),
            "current_uptime": i.timer.get(),
            "paused": i.timer.paused,
        }))

    for i in apps:
        if (not i in ([j.name for j in currently_running_app] or [j.name for j in not_running_apps])):
            app = App(i)
            app.start()
            currently_running_app.append(app)

    payload = {
        "apps": apps_array,
        "computer_uptime": computer_uptime.get()
    }

    try:
        x = requests.post(url=url, data=payload)
        print(x.text)
    except requests.exceptions.ConnectionError:
        print('Cannot connect to', url)

    save()

if __name__ == '__main__':
    load()
    computer_uptime.start()

    try:
        while True:
            update()
            time.sleep(1)
    except KeyboardInterrupt:
        print('Saving data...')
        computer_uptime.reset()
        save()
