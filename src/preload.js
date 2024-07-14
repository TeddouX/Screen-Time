const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getAppsDisplayNames: () => ipcRenderer.invoke('getAppsDisplayNames'),

    addAppDisplayName: (app) => ipcRenderer.send('addAppDisplayName', app),

    getRunningApps: () => ipcRenderer.invoke('getRunningApps'),
    getNotRunningApps: () => ipcRenderer.invoke('getNotRunningApps'),
    getComputerUptime: () => ipcRenderer.invoke('getComputerUptime'),
});