const currentlyRunningAppsContainer = document.getElementById("screenTimeWidgetsContainer");
const totalScreenTimeContainer = document.getElementById("totalScreenTimeWidgetsContainer");
const computerUptimeText = document.getElementById("computerUptime")

let hiddenApps = ["python.exe", "SystemPropertiesAdvanced.exe"];
let currentlyRunningApps = [];
let notRunningApps = [];
let appsDisplayNames = {};
let computerUptime = 0;
let scales = {
    115: 120,
    595: 600,
    1750: 1800,
    3550: 3600,
    7150: 7200
};
let currentScale = 120;
let totalScreenTimeScale = 120;

// Add a function to the String class
String.prototype.toHHMMSS = function () {
    var sec_num = parseInt(this, 10);
    var hours   = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours   < 10) hours   = "0" + hours;
    if (minutes < 10) minutes = "0" + minutes;
    if (seconds < 10) seconds = "0" + seconds;

    return hours + ':' + minutes + ':' + seconds;
}

window.onload = () => {
    const screenTimeButton = document.getElementById("screenTimeButton");
    const moreButton = document.getElementById("moreButton");
    const screenTimeTab = document.getElementById("screenTimeTab");
    const moreTab = document.getElementById("moreTab");

    // If the button is clicked put it to the opposite state
    screenTimeButton.addEventListener("click", () => {
        if (screenTimeButton.className === "tab-button-active") return;

        moreButton.className = getOppositeTabButtonClass(moreButton.className);
        screenTimeButton.className = getOppositeTabButtonClass(screenTimeButton.className);

        moreTab.style.display = "none";
        screenTimeTab.style.display = "flex";
    });

    moreButton.addEventListener("click", () => {
        if (moreButton.className === "tab-button-active") return;

        moreButton.className = getOppositeTabButtonClass(moreButton.className);
        screenTimeButton.className = getOppositeTabButtonClass(screenTimeButton.className);

        screenTimeTab.style.display = "none";
        moreTab.style.display = "flex";
    });

    update();
};

function getOppositeTabButtonClass(className) {
    if (className === "tab-button-active") return "tab-button-unactive"
    else if (className === "tab-button-unactive") return "tab-button-active"
}

function sort(a, b) {
    let keyA = a.current_uptime;
    let keyB = b.current_uptime;
    
    if(keyA > keyB) return -1;
    if(keyA < keyB) return 1;
    return 0;
}

function renameApp() {
    
}

function deleteApp() {
    
}

function createCurrentScreenTimeWidget(appName, time) {
    // This took me way too long to make but it's pretty self explanatory
    let screenTimeWidget = document.createElement('div');
    let appNameSpan = document.createElement('span');
    let renameButton = document.createElement('button');
    let deleteButton = document.createElement('button');
    let screenTimeProgressbarContainer = document.createElement('div');
    let screenTimeProgressbar = document.createElement('div');
    let breakDiv1 = document.createElement('div');
    let breakDiv2 = document.createElement('div');
    let screenTimeText = document.createElement('span');

    screenTimeWidget.className = 'screen-time-widget';
    appNameSpan.innerText = appName;
    appNameSpan.className = 'app-name';
    renameButton.innerHTML += '<img src="./assets/pencil.svg" alt="" width="20" height="20">';
    renameButton.className = 'rename-button';
    renameButton.onclick = () => {renameApp(appName)};
    deleteButton.innerHTML += '<img src="./assets/trash.svg" alt="" width="20" height="20">';
    deleteButton.className = 'delete-button';
    deleteButton.onclick = () => {deleteApp(appName)};
    screenTimeProgressbarContainer.className = 'screen-time-progressbar-container';

    // Don't know what this does but it works (DON'T TOUCH IT)
    for (const [key, value] of Object.entries(scales)) {
        if(key > time) {
            if(value > currentScale) currentScale = value;
            break;
        }
    }

    screenTimeProgressbar.style = `
        background-color: #2271AF;
        height: 12px;
        width: ${time * 100 / currentScale}%;
        border-radius: 3px;
    `;

    breakDiv1.className = 'break';
    breakDiv2.className = 'break';

    try {
        screenTimeText.innerText = time.toString().toHHMMSS();
    } catch(_e) { 
        return;
    }

    screenTimeText.className = 'screen-time-text';

    screenTimeProgressbarContainer.appendChild(screenTimeProgressbar);

    screenTimeWidget.appendChild(appNameSpan);
    screenTimeWidget.appendChild(renameButton);
    screenTimeWidget.appendChild(deleteButton);
    screenTimeWidget.appendChild(breakDiv1);
    screenTimeWidget.appendChild(screenTimeProgressbarContainer);
    screenTimeWidget.appendChild(breakDiv2);
    screenTimeWidget.appendChild(screenTimeText);

    return screenTimeWidget;
}

function createTotalScreenTimeWidget(appName, time, active) {
    // This took me way too long to make but it's pretty self explanatory
    let totalScreenTimeWidget = document.createElement('div');
    let appNameSpan = document.createElement('span');
    let renameButton = document.createElement('button');
    let deleteButton = document.createElement('button');
    let screenTimeProgressbarContainer = document.createElement('div');
    let screenTimeProgressbar = document.createElement('div');
    let breakDiv1 = document.createElement('div');
    let breakDiv2 = document.createElement('div');
    let breakDiv3 = document.createElement('div');
    let screenTimeText = document.createElement('span');
    let activeText = document.createElement('span');

    totalScreenTimeWidget.className = 'screen-time-widget';
    appNameSpan.innerText = appName;
    appNameSpan.className = 'app-name';
    renameButton.innerHTML += '<img src="./assets/pencil.svg" alt="" width="20" height="20">';
    renameButton.className = 'rename-button';
    renameButton.onclick = () => {renameApp(appName)};
    deleteButton.innerHTML += '<img src="./assets/trash.svg" alt="" width="20" height="20">';
    deleteButton.className = 'delete-button';
    deleteButton.onclick = () => {deleteApp(appName)};
    screenTimeProgressbarContainer.className = 'screen-time-progressbar-container';

    // Don't know what this does but it works (DON'T TOUCH IT)
    for (const [key, value] of Object.entries(scales)) {
        if(key > time) {
            if(value > totalScreenTimeScale) totalScreenTimeScale = value;
            break;
        }
    }

    screenTimeProgressbar.style = `
        background-color: #2271AF;
        height: 12px;
        width: ${time * 100 / totalScreenTimeScale}%;
        border-radius: 3px;
    `;

    breakDiv1.className = 'break';
    breakDiv2.className = 'break';
    breakDiv3.className = 'break';

    try {
        screenTimeText.innerText = time.toString().toHHMMSS();
    } catch(_e) { 
        return;
    }

    screenTimeText.className = 'screen-time-text';
    activeText.innerText = `Active: ${active}`
    activeText.className = `active-text-text`


    screenTimeProgressbarContainer.appendChild(screenTimeProgressbar);
    totalScreenTimeWidget.appendChild(appNameSpan);
    totalScreenTimeWidget.appendChild(renameButton);
    totalScreenTimeWidget.appendChild(deleteButton);
    totalScreenTimeWidget.appendChild(breakDiv1);
    totalScreenTimeWidget.appendChild(screenTimeProgressbarContainer);
    totalScreenTimeWidget.appendChild(breakDiv2);
    totalScreenTimeWidget.appendChild(screenTimeText);
    totalScreenTimeWidget.appendChild(breakDiv3);
    totalScreenTimeWidget.appendChild(activeText);

    return totalScreenTimeWidget;
}

async function update() {
    // Communicate with main by the electron API created in preload (go see docs: https://www.electronjs.org/docs/latest/tutorial/ipc)
    currentlyRunningApps = await window.electronAPI.getRunningApps();
    notRunningApps = await window.electronAPI.getNotRunningApps();
    notRunningApps.push(...currentlyRunningApps); // Add the running apps to the not running apps array
    computerUptime = await window.electronAPI.getComputerUptime();

    currentlyRunningApps.sort(sort);    
    notRunningApps.sort(sort);

    // Set the computer uptime text
    computerUptimeText.innerText = "Computer uptime: " + computerUptime.toString().toHHMMSS();
    // Clear the widgets containers
    currentlyRunningAppsContainer.innerHTML = "";
    totalScreenTimeContainer.innerHTML = "";


    for (let i = 0; i < currentlyRunningApps.length; i++) {
        const app = currentlyRunningApps[i];

        // Append a new screen time widget to the currentlyRunningAppsContainer
        currentlyRunningAppsContainer.appendChild(createCurrentScreenTimeWidget(app.name, app.current_uptime));
    }

    for (let i = 0; i < notRunningApps.length; i++) {
        const app = notRunningApps[i];

        if(app.paused) totalScreenTimeContainer.appendChild(createTotalScreenTimeWidget(app.name, app.total_uptime, false));
        else totalScreenTimeContainer.appendChild(createTotalScreenTimeWidget(app.name, app.current_uptime, true));
    }

    window.electronAPI.setHiddenApps(hiddenApps);
    window.electronAPI.setAppsDisplayNames(appsDisplayNames);
}

setInterval(update, 2000)