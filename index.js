import electron from 'electron';
import express from "express";
import bodyParser from 'body-parser';

const { app, BrowserWindow } = electron;
const { urlencoded, json } = bodyParser;

const expressApp = express();
const port = 3030;

let currentlyRunningApps = [];
let notRunningApps = [];

const createWindow = () => {
    const win = new BrowserWindow({
        width: 500,
        minWidth: 500,
        height: 550
    });
  
    win.loadFile('./webpage/index.html');
};

expressApp.use(urlencoded({ extended: false })); 
expressApp.use(json());

expressApp.get("/", function(_req, res) {
    res.send("");
});

expressApp.post("/", function(req, res) {
    let data = req.body;
    let apps = data.apps;

    for(let i = 0; i < apps.length; i++) {
        let app = JSON.parse(apps[i]);
        
        if(app.paused) notRunningApps.push(app);
        else currentlyRunningApps.push(app);
    }

    /*setCurrentlyRunningApps(currentlyRunningApps);
    setNotRunningApps(notRunningApps);
    
    res.send({
        "trash_apps": getTrashApps(),
        "apps_display_names": getAppsDisplayNames()
    });*/
});

expressApp.listen(port, function() {
    console.log("App running on port " + port)
});

app.whenReady().then(() => {
    createWindow();
  
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    })
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
