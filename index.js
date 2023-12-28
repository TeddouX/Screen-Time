import electron from 'electron';
import express from "express";
import bodyParser from 'body-parser';
import fs from 'fs'
import { log } from 'console';

// width: 500px fixed
// height: 550px not fixed

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
    })
  
    win.loadFile('./webpage/index.html')
}

// Use a custom json decodeer else it won't work
expressApp.use(urlencoded({ extended: false })); 
expressApp.use(json());

expressApp.get("/", function(_req, res) {
    res.send("");
});

expressApp.post("/", function(req, res) {
    let data = req.body;
    let apps = data.apps;
    let obj = {}

    // Iterate through the data sent by the python script
    for(let i = 0; i < apps.length; i++) {
        let app = JSON.parse(apps[i]);
        
        if(app.paused) notRunningApps.push(app);
        else currentlyRunningApps.push(app);
    }

    // Create the object
    obj = {
        notRunningApps,
        currentlyRunningApps
    }

    // Write to the common json files the data
    fs.writeFile('com.json', JSON.stringify(obj), (err) => {
        if (err) {
            console.log(err);
        } else {
            console.log("File written successfully!");
        };
    });

    // Clear the arrays
    notRunningApps = []
    currentlyRunningApps = []

    // Send a response to the python script
    res.send("Ok :)")
});

expressApp.listen(port, function() {
    console.log("App running on port " + port)
});

app.whenReady().then(() => {
    createWindow()
  
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})
