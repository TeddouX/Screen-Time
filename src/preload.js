const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getHiddenApps: () => ipcRenderer.invoke('getHiddenApps'),
    getAppsDisplayNames: () => ipcRenderer.invoke('getAppsDisplayNames'),

    addAppDisplayName: (app) => ipcRenderer.send('addAppDisplayName', app),
    addHiddenApp: (app) => ipcRenderer.send('addHiddenApp', app),
    removeHiddenApp: (app) => ipcRenderer.send('removeHiddenApp', app),

    getRunningApps: () => ipcRenderer.invoke('getRunningApps'),
    getNotRunningApps: () => ipcRenderer.invoke('getNotRunningApps'),
    getComputerUptime: () => ipcRenderer.invoke('getComputerUptime'),
});