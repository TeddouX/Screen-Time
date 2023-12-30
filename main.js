const { app, BrowserWindow, ipcMain } = require('electron');
const express = require('express');
const { urlencoded, json } = require('body-parser');
const path = require('node:path');
const { log } = require('console');

const expressApp = express();
const port = 3030;

let currentlyRunningApps = [];
let notRunningApps = [];
let hiddenApps = [];
let appsDisplayNames = {};
let computerUptime = 0;

const createWindow = () => {
    const win = new BrowserWindow({
        width: 500,
        minWidth: 500,
        height: 550,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    })
  
    win.loadFile('./webpage/index.html');
};

// Use a custom json decoder or else decoding json files won't work
expressApp.use(urlencoded({ extended: false })); 
expressApp.use(json());

expressApp.get("/", function(_req, res) {
    res.send("");
});

expressApp.post("/", function(req, res) {
    let data = req.body;
    let apps = data.apps;
    
    // Clear the arrays
    currentlyRunningApps = [];
    notRunningApps = [];

    computerUptime = data.computer_uptime;

    // Iterate through the data sent by the python script
    for(let i = 0; i < apps.length; i++) {
        let app = JSON.parse(apps[i]);

        if(app.paused) notRunningApps.push(app);
        else currentlyRunningApps.push(app);
    }

    // Send a response to the python script
    res.send("Ok :)");
});

expressApp.listen(port, function() {
    console.log("Express app running on port " + port);
});

app.whenReady().then(() => {
    ipcMain.on('set-hidden-apps', setHiddenApps);
    ipcMain.on('set-apps-display-names', setAppsDisplayNames);

    ipcMain.handle('getRunningApps', getRunningApps);
    ipcMain.handle('getNotRunningApps', getNotRunningApps);
    ipcMain.handle('getComputerUptime', getComputerUptime);

    createWindow();
  
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
})

function setHiddenApps(_event, apps) {
    hiddenApps = apps;
}

function setAppsDisplayNames(_event, apps) {
    appsDisplayNames = apps;
}

async function getRunningApps() {
    return currentlyRunningApps;
}

async function getNotRunningApps() {
    return notRunningApps;
}

async function getComputerUptime() {
    return computerUptime;
}