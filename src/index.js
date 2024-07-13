const { app, BrowserWindow, ipcMain } = require('electron');
const { log } = require('console');
const fs = require("fs")
const http = require('http');
const path = require('path');

// Logger module
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf } = format;


const url = '127.0.0.1';
const port = 8080;
const urlPath = '/screen-time';
const jsonFilePath = process.env.APPDATA + "/Screen Time/js/"
const updateRate = 4000;

let currentlyRunningApps = [];
let notRunningApps = [];
let hiddenApps = [];
let appsDisplayNames = [];
let computerUptime = 0;

// A format for the logger
const myFormat = printf(({ level, message, timestamp }) => {
    return `${timestamp} ${level.toUpperCase()}: ${message}`;
});
  
// Create a logger to have some logs
const logger = createLogger({
    level: 'info',
    format: combine(
        timestamp(),
        myFormat
    ),
    transports: [
        new transports.File({ filename: jsonFilePath + 'logs.log' }),
        new transports.Console()
    ]
});

// Create the electron window
const createWindow = () => {
    const win = new BrowserWindow({
        width: 500,
        minWidth: 500,
        height: 550,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    });
  
    win.loadFile('./webpage/index.html');
};

function getApps() {
    // The data that is sent to the Flask server
    const data = JSON.stringify({
        hiddenApps: [hiddenApps],
        appsDisplayNames: JSON.stringify(appsDisplayNames)
    });

    // The options with the url, etc...
    const options = {
        hostname: url,
        port: port,
        path: urlPath,
        method: 'POST',
    };

    // Make a request with the options
    let req = http.request(options, (resp) => {
        let data = '';

        // Each time we reiceive a chunk of the data add it to the data variable
        resp.on('data', (chunk) => {
            data += chunk;
        });

        resp.on('end', () => {
            // If the data is empty
            if(data === '') {
                logger.error("The Flask server has sent incorrrect data");
            }

            // Convert the data (str) to an object
            let parsedData = JSON.parse(data);
            let appsArray = parsedData.apps;

            // Set the computer uptime
            computerUptime = parsedData.computer_uptime;

            // Clear the arrays
            currentlyRunningApps = [];
            notRunningApps = [];

            // Iterate through the data received from the Flask server
            for(let i = 0; i < appsArray.length; i++) {
                // Parse the app data to a JS object
                let app = JSON.parse(appsArray[i]);
        
                // Check if the app is running and if yes, add it to the currentlyRunningApps array else add it to the notRunningApps array
                if(app.running) currentlyRunningApps.push(app);
                else notRunningApps.push(app);
            }
        });
    })
    
    // Catch any errors
    req.on('error', (err) => {
        logger.error(`An error occured whilst trying to connect to the Flask server: ${err.message}.`);
    });
    
    // Send the renamed apps and the hidden apps to the Flask server
    req.write(data);
    // Close the request
    req.end();
}

function quit() {
    // "Kill" the electron app
    app.quit();

    logger.info("Window closed successfully. See you next time!");

    // Kill the Node process
    process.exit();
}

function saveData() {
    // Create an object to save
    let obj = {
        hiddenApps,
        appsDisplayNames,
    }

    // Write to the JSON file the object
    fs.writeFile(jsonFilePath + "saved.json", JSON.stringify(obj), (err) => {
        if (err) {
            logger.error(`Couldn't save data because an error occured whilst trying to access ${jsonFilePath}: ${err.name}: ${err.message}`);

            quit();
        } else {
            logger.info("Data saved successfully.");
        
            quit();
        };
    });
}

function loadData() {
    // If the JSON file doesn't exist create one
    if (!fs.existsSync(jsonFilePath + "saved.json")) {
        fs.open(jsonFilePath, "w", (err, file) => {
            if (err) {
                logger.error(`An error occured whilst trying to access ${jsonFilePath}: ${err.name}: ${err.message}`);
            } else {
                logger.info("Data saved successfully.")
            };
        })
    }

    // Load the data from the JSON file
    fs.readFile(jsonFilePath + "saved.json", (err, data) => {
        if (err) {
            logger.error(`An error occured whilst trying to access ${jsonFilePath}: ${err.name}: ${err.message}`);
            return;
        }

        if(data == "") {
            logger.info("JSON file was empty. Skipping the loading of the data.")
            return;
        }

        let parsedData = JSON.parse(data)

        hiddenApps = parsedData.hiddenApps;
        appsDisplayNames = parsedData.appsDisplayNames;

        logger.info("JSON file loaded succesfully.");
    });
}

function update() {
    getApps();

    setTimeout(update, updateRate);
};

app.whenReady().then(() => {
    // Handle all the calls made from the renderer
    ipcMain.handle('getHiddenApps', getHiddenApps);
    ipcMain.handle('getAppsDisplayNames', getAppsDisplayNames);

    ipcMain.on('addAppDisplayName', addAppDisplayName);
    ipcMain.on('addHiddenApp', addHiddenApp);
    ipcMain.on('removeHiddenApp', removeHiddenApp);

    ipcMain.handle('getRunningApps', getRunningApps);
    ipcMain.handle('getNotRunningApps', getNotRunningApps);
    ipcMain.handle('getComputerUptime', getComputerUptime);

    // Create the electron window
    createWindow();

    // Load the data from the JSON file
    loadData();

    // Start the update loop
    update();
  
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        saveData();
    }
})

function removeHiddenApp(_event, app) {
    // Remove the app from the hiddenApps array
    hiddenApps.splice(hiddenApps.indexOf(app), 1);

    logger.info(`Removed ${app} from the hiddenApps`);
}

function addHiddenApp(_event, app) {
    // If the app already exists in the hiddenApps array return
    if(hiddenApps.includes(app)) return;

    // Add the app to the hiddenApps array
    hiddenApps.push(app);

    logger.info(`Added ${app} to the hiddenApps`);
}

function addAppDisplayName(_event, app) {
    for (let i = 0; i < appsDisplayNames.length; i++) {  
        if(appsDisplayNames[i].appName == app.appName) {
            if(appsDisplayNames[i].displayName == app.displayName) return;

            // Set the displayName if the app already exists
            appsDisplayNames[i].displayName = app.displayName;
            
            logger.info(`Re-renamed ${app.appName} to ${app.displayName}`);

            return;
        }
    }

    // Add the app to the appsDisplayNames array
    appsDisplayNames.push(app);

    logger.info(`Renamed ${app.appName} to ${app.displayName}`);
}

async function getHiddenApps() {
    return hiddenApps;
}

async function getAppsDisplayNames() {
    return appsDisplayNames;
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
