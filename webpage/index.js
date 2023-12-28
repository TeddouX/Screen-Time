let trashApps = ["python.exe", "SystemPropertiesAdvanced.exe"];
let currentlyRunningApps = [];
let notRunningApps = [];
let appsDisplayNames = {}

function createCurrentScreenTimeWidget(appName, time) {
    
}

function update() {
    for (let i = 0; i < currentlyRunningApps.length; i++) {
        const app = currentlyRunningApps[i];
        
        createCurrentScreenTimeWidget(app.name, app.current_uptime)
    }

    setInterval(update, .5);
}

update();
