// Get all the HTML elements
const currentlyRunningAppsContainer = document.getElementById("screenTimeWidgetsContainer");
const totalScreenTimeContainer = document.getElementById("totalScreenTimeWidgetsContainer");
const computerUptimeText = document.getElementById("computerUptime");
const screenTimeButton = document.getElementById("screenTimeButton");
const moreButton = document.getElementById("moreButton");
const screenTimeTab = document.getElementById("screenTimeTab");
const promptContainer = document.getElementById("promptContainer");
const promptBackground = document.getElementById("promptBackground");
const confirmPrompt = document.getElementById("confirmPrompt");
const textPrompt = document.getElementById("textPrompt");
const hiddenWidgetsContainer = document.getElementById("hiddenWidgetsContainer");

// Variables
let appsDisplayNames = {};
let hiddenApps = [];
let currentlyRunningApps = [];
let notRunningApps = [];
let computerUptime = 0;
let biggestTotalScreenTime = 0;
let biggestCurrentScreenTime = 0;
let supportsPassive = false;

// Test if the browser supports passive
try {
    window.addEventListener("test", null, Object.defineProperty({}, 'passive', {
        get: function () { supportsPassive = true; } 
    }));
} catch(e) {}

// To deactivate scrolling
let wheelOpt = supportsPassive ? { passive: false } : false;
let wheelEvent = 'onwheel' in document.createElement('div') ? 'wheel' : 'mousewheel';


// If the button is clicked set it to the opposite state
screenTimeButton.addEventListener("click", () => {
    if (screenTimeButton.className === "tab-button-active") return;

    moreButton.className = getOppositeTabButtonClass(moreButton.className);
    screenTimeButton.className = getOppositeTabButtonClass(screenTimeButton.className);

    moreTab.style.display = "none";
    screenTimeTab.style.display = "flex";
});

// If the button is clicked set it to the opposite state
moreButton.addEventListener("click", () => {
    if (moreButton.className === "tab-button-active") return;

    moreButton.className = getOppositeTabButtonClass(moreButton.className);
    screenTimeButton.className = getOppositeTabButtonClass(screenTimeButton.className);

    screenTimeTab.style.display = "none";
    moreTab.style.display = "flex";
});


// Add a function to the String class
String.prototype.toHHMMSS = function() {
    var sec_num = parseInt(this, 10);
    var hours   = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours   < 10) hours   = "0" + hours;
    if (minutes < 10) minutes = "0" + minutes;
    if (seconds < 10) seconds = "0" + seconds;

    return hours + ':' + minutes + ':' + seconds;
};

// left: 37, up: 38, right: 39, down: 40,
// spacebar: 32, pageup: 33, pagedown: 34, end: 35, home: 36
var keys = {37: 1, 38: 1, 39: 1, 40: 1};


function preventDefault(e) {
    e.preventDefault();
}

function preventDefaultForScrollKeys(e) {
    if (keys[e.keyCode]) {
        preventDefault(e);
        return false;
    }
}

// Call this to deactivate scrolling
function disableScroll() {
    window.addEventListener('DOMMouseScroll', preventDefault, false); // older FF
    window.addEventListener(wheelEvent, preventDefault, wheelOpt); // modern desktop
    window.addEventListener('touchmove', preventDefault, wheelOpt); // mobile
    window.addEventListener('keydown', preventDefaultForScrollKeys, false);

    // Disable scrollbar
    document.documentElement.style.overflow = 'hidden';
}

// Call this to re-enable scrolling
function enableScroll() {
    window.removeEventListener('DOMMouseScroll', preventDefault, false);
    window.removeEventListener(wheelEvent, preventDefault, wheelOpt); 
    window.removeEventListener('touchmove', preventDefault, wheelOpt);
    window.removeEventListener('keydown', preventDefaultForScrollKeys, false);

    document.documentElement.style.overflow = 'auto';
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function getOppositeTabButtonClass(className) {
    if (className === "tab-button-active") return "tab-button-unactive"
    else if (className === "tab-button-unactive") return "tab-button-active"
}

// Used to sort the currentlyRunningApps array
function sortByCurrentUptime(a, b) {
    let keyA = a.current_uptime;
    let keyB = b.current_uptime;
    
    if(keyA > keyB) return -1;
    if(keyA < keyB) return 1;
    return 0;
}

// Used to sort the notRunningApps array
function sortByTotalUptime(a, b) {
    let keyA = a.total_uptime;
    let keyB = b.total_uptime;
    
    if(keyA > keyB) return -1;
    if(keyA < keyB) return 1;
    return 0;
}

function updateHiddenApps() {
    // Iterate through the hidddenApps
    for (let i = 0; i < hiddenApps.length; i++) {
        const appName = hiddenApps[i];
        let displayName = capitalizeFirstLetter(appName);

        // If the app has a display name, set it
        for(let i = 0; i < appsDisplayNames.length; i++) {
            if(appsDisplayNames[i].appName == appName) displayName = appsDisplayNames[i].displayName;
        }

        // Add a new hidden widget to the hiddenWidgetsContainer element
        hiddenWidgetsContainer.appendChild(createHiddenWidget(appName, displayName));
    }
}

function promptText(title) {
    // Used querySelector() to get the element under (in the html hierarchy) the textPrompt
    const confirmButton = textPrompt.querySelector(".confirm-button");
    const cancelButton = textPrompt.querySelector(".cancel-button");
    const input = textPrompt.querySelector("#textPromptTextInput");

    disableScroll();
    window.scrollTo(0, 0); // Scroll to the top

    // Un-hide everything
    promptBackground.hidden = false;
    promptContainer.style = "display: flex;";
    textPrompt.style = "display: flex;";

    // Set the prompt title
    textPrompt.querySelector(".prompt-title").innerText = title;

    confirmButton.onclick = () => { 
        // Can't confirm if the text is empty (maybe add something to indicate that later)
        if(input.value == "") return;

        // Hide everything
        promptBackground.hidden = true;
        textPrompt.style = "display: none;";
        promptContainer.style = "display: none;";
        
        enableScroll();
    };
    
    cancelButton.onclick = () => { 
        // Hide everything
        promptBackground.hidden = true;
        textPrompt.style = "display: none;";
        promptContainer.style = "display: none;";
        
        enableScroll();
    };

    // Create a new promise that returns the text that was given by the user
    return new Promise((res, _rej) => {
        let confirmButtonListener = _e => {
            if(input.value === "") return;

            res(input.value);
        }

        let cancelButtonListener = _e => {
            res("");
        }

        confirmButton.addEventListener("click", confirmButtonListener);
        cancelButton.addEventListener("click", cancelButtonListener);
    })
}   

function promptConfirm(title) {
    // Used querySelector() to get the element under (in the html hierarchy) the confirmPrompt
    const confirmButton = confirmPrompt.querySelector(".confirm-button");
    const cancelButton = confirmPrompt.querySelector(".cancel-button");

    disableScroll();
    window.scrollTo(0, 0); // Scroll to the top

    // Un-hide everything
    promptBackground.hidden = false;
    promptContainer.style = "display: flex;";
    confirmPrompt.style = "display: flex;";

    // Set the prompt title
    confirmPrompt.querySelector(".prompt-title").innerText = title;

    confirmButton.onclick = () => { 
        // Hide everything
        promptBackground.hidden = true;
        confirmPrompt.style = "display: none;";
        promptContainer.style = "display: none;";

        enableScroll();
    };
    
    cancelButton.onclick = () => { 
        // Hide everything
        promptBackground.hidden = true;
        confirmPrompt.style = "display: none;";
        promptContainer.style = "display: none;";
    
        enableScroll();
    };

    // Create a new promise that returns if the user confirmed (true) or canceled (false)
    return new Promise((res, _rej) => {
        let confirmButtonListener = _e => {
            res(true);
        }

        let cancelButtonListener = _e => {
            res(false);
        }

        confirmButton.addEventListener("click", confirmButtonListener);
        cancelButton.addEventListener("click", cancelButtonListener);
    })
}

async function renameApp(appName) {
    let res = await promptText(`Type in a new name for ${appName}`);

    // If the res is nothing (the user canceled), return
    if(res === "") {
        return;
    }

    // Add the new app display name to the array
    appsDisplayNames[appName] = res;

    // Send the new app display name
    window.electronAPI.addAppDisplayName({ 
        "appName": appName,
        "displayName": res    
    });
}

async function deleteApp(appName) {
    let res = await promptConfirm(`Are you sure that you want to hide ${appName}`);

    // If the user confirmed
    if(res) {
        // Add the app to the hidden apps
        hiddenApps.push(appName)
        // Send the new hidden app to the index.js
        window.electronAPI.addHiddenApp(appName);
    }
}

async function restoreApp(appName) {
    let res = await promptConfirm(`Are you sure that you want to restore ${appName}`);
    
    // If the user confirmed
    if(res) {
        // Remove the app from the hidden apps array
        hiddenApps.splice(hiddenApps.indexOf(appName), 1);
        window.electronAPI.removeHiddenApp(appName);
    }
}

function createCurrentScreenTimeWidget(appName, appDisplayName, time) {
    // Create a container div
    let currentScreenTimeWidget = document.createElement("div");
    currentScreenTimeWidget.className = 'screen-time-widget';

    // If the time is bigger than the biggest, set the biggest to the time
    if(time > biggestCurrentScreenTime)
        biggestCurrentScreenTime = time;

    // HTML for the widget (filled in with the data)
    let currentScreenTimeWidgetHTML = `
        <span class="app-name">${appDisplayName}</span>

        <button class="rename-button" onclick="renameApp('${appName}')"><img src="./assets/pencil.svg" alt="" width="20" height="20"></button>
        <button class="delete-button" onclick="deleteApp('${appName}')"><img src="./assets/trash.svg" alt="" width="20" height="20"></button>
        <div class="break"></div>

        <div class="screen-time-progressbar-container">
            <div style="background-color: rgb(34, 113, 175); height: 12px; width: ${time * 100 / biggestCurrentScreenTime}%; border-radius: 3px;"></div>
        </div>
        <div class="break"></div>

        <span class="screen-time-text">${time.toString().toHHMMSS()}</span>
    `;

    // Set the innerHTML to the HTML created for the widget
    currentScreenTimeWidget.innerHTML = currentScreenTimeWidgetHTML;

    return currentScreenTimeWidget;
}

function createTotalScreenTimeWidget(appName, appDisplayName, time, active) {
    // Create a container div
    let totalScreenTimeWidget = document.createElement('div');
    totalScreenTimeWidget.className = 'screen-time-widget';

    // Cross product to find the percentage that the progressbar should be set to
    // ?    | 100%
    // time | biggestTotalScreenTime

    // If the time is bigger than the biggest, set the biggest to the time
    if(time > biggestTotalScreenTime)
        biggestTotalScreenTime = time;

    // HTML for the widget (filled in with the data)
    let totalScreenTimeWidgetHTML = `
        <span class="app-name">${appDisplayName}</span>

        <button class="rename-button" onclick="renameApp('${appName}')"><img src="./assets/pencil.svg" alt="" width="20" height="20"></button>
        <button class="delete-button" onclick="deleteApp('${appName}')"><img src="./assets/trash.svg" alt="" width="20" height="20"></button>
        <div class="break"></div>

        <div class="screen-time-progressbar-container">
            <div style="background-color: rgb(34, 113, 175); height: 12px; width: ${time * 100 / biggestTotalScreenTime}%; border-radius: 3px;"></div>
        </div>
        <div class="break"></div>

        <span class="screen-time-text">${time.toString().toHHMMSS()}</span>
        <div class="break"></div>

        <span class="active-text-text">Active: ${active ? "Yes" : "No"}</span>
    `;

    // Set the innerHTML to the HTML created for the widget
    totalScreenTimeWidget.innerHTML = totalScreenTimeWidgetHTML;

    return totalScreenTimeWidget;
}

function createHiddenWidget(name, appDisplayName) {
    // Create a container div
    let deletedWidget = document.createElement("div");
    deletedWidget.className = 'deleted-widget';

    // HTML for the widget (filled in with the data)
    let deletedWidgetHTML = `
        <span class="app-name">${appDisplayName}</span>
        <button class="restore-button" onclick="restoreApp('${name}')"><span>Restore</span></button>
    `;

    // Set the innerHTML to the HTML created for the widget
    deletedWidget.innerHTML = deletedWidgetHTML;

    return deletedWidget;
}

async function update() {
    // Get all the data from the index.js using the electron api (go see docs: https://www.electronjs.org/docs/latest/tutorial/ipc)
    hiddenApps = await window.electronAPI.getHiddenApps();
    appsDisplayNames = await window.electronAPI.getAppsDisplayNames();
    currentlyRunningApps = await window.electronAPI.getRunningApps();
    notRunningApps = await window.electronAPI.getNotRunningApps();
    computerUptime = await window.electronAPI.getComputerUptime();

    // Add the currentlyRunningApps to the notRunningApps
    notRunningApps.push(...currentlyRunningApps);

    // Sort the arrays
    currentlyRunningApps.sort(sortByCurrentUptime);    
    notRunningApps.sort(sortByTotalUptime);

    // Set the computer uptime text
    computerUptimeText.innerText = "Computer uptime: " + computerUptime.toString().toHHMMSS();
    
    // Clear the widgets containers
    currentlyRunningAppsContainer.innerHTML = "";
    totalScreenTimeContainer.innerHTML = "";
    hiddenWidgetsContainer.innerHTML = "";

    updateHiddenApps();

    // Iterate through all the currrently running apps
    for (let i = 0; i < currentlyRunningApps.length; i++) {
        const app = currentlyRunningApps[i];
        let displayName = capitalizeFirstLetter(app.name);

        // If the app is in the hidden apps, skip it
        if(hiddenApps.includes(app.name)) continue;

        // If the app has a custom display name, set it
        for(let i = 0; i < appsDisplayNames.length; i++) {
            if(appsDisplayNames[i].appName == app.name) displayName = appsDisplayNames[i].displayName;
        }

        // Add a new current screen time widget to the currentlyRunningAppsContainer element
        currentlyRunningAppsContainer.appendChild(createCurrentScreenTimeWidget(app.name, displayName, app.current_uptime));
    }

    // Iterate through all the not running apps
    for (let i = 0; i < notRunningApps.length; i++) {
        const app = notRunningApps[i];
        let displayName = capitalizeFirstLetter(app.name);

        // If the app is in the hidden apps, skip it
        if(hiddenApps.includes(app.name)) continue;

        // If the app has a custom display name, set it
        for(let i = 0; i < appsDisplayNames.length; i++) {
            if(appsDisplayNames[i].appName == app.name) displayName = appsDisplayNames[i].displayName;
        }

        // Add a new total screen time widget to the totalScreenTimeContainer element
        totalScreenTimeContainer.appendChild(createTotalScreenTimeWidget(app.name, displayName, app.total_uptime, app.running));
    }
}

setInterval(update, 1000);
