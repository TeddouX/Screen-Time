from json import dumps
from time import time

class Timer():
    time_started: float
    time_paused: float
    paused: bool

    def __init__(self) -> None:
        self.time_started = 0
        self.time_paused = 0
        self.paused = False

    def start(self) -> None:
        self.time_started = time()

    def pause(self) -> None:
        if self.time_started is None:
            return
        if self.paused:
            return

        self.time_paused = time()
        self.paused = True

    def resume(self) -> None:
        if self.time_started is None:
            return
        if not self.paused:
            return

        pause_time = time() - self.time_paused
        self.time_started = self.time_started + pause_time
        self.paused = False

    def reset(self) -> None:
        self.paused = True
        self.time_started = 0
        self.time_paused = 0

    def get(self) -> float:
        if self.time_started is None:
            return 0
        if self.paused:
            return self.time_paused - self.time_started
        else:
            return time() - self.time_started

class App:
    name: str
    timer: Timer
    total_time_running: float

    def __init__(self, name) -> None:
        self.name = name
        self.total_time_running = 0.0
        self.timer = Timer()
    
    def start(self) -> None:
        self.timer.start()

    def onKill(self) -> None:
        self.total_time_running += self.timer.get()
        self.timer.pause()

    def resume(self) -> None:
        self.timer.resume()

    def onSave(self) -> str:
        # Save the total time running
        if self.timer.paused:
            total_time_running = self.total_time_running
        else:
            total_time_running = self.total_time_running + self.timer.get()

        return self.__json__(total_time_running)

    def __json__(self, total_time_running) -> str:
        json_dict = {
            "name": self.name,
            "total_time_running": total_time_running
        }

        return dumps(json_dict)

    @staticmethod
    def from_json(json_dict: dict):
        # Create an app from a dict
        app = App(json_dict['name'])
        app.total_time_running = json_dict['total_time_running']
        # Create a new empty timer
        app.timer = Timer()
        app.timer.start()
        
        return app