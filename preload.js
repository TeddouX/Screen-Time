const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    setHiddenApps: (apps) => ipcRenderer.send('set-hidden-apps', apps),
    setAppsDisplayNames: (apps) => ipcRenderer.send('set-apps-display-names', apps),

    getRunningApps: () => ipcRenderer.invoke('getRunningApps'),
    getNotRunningApps: () => ipcRenderer.invoke('getNotRunningApps'),
    getComputerUptime: () => ipcRenderer.invoke('getComputerUptime')
});