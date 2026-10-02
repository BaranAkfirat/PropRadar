const { app, BrowserWindow } = require('electron');
const path = require('path');
const LocalWSServer = require('./src/webSocketServer');
const setupIpcHandlers = require('./src/ipcHandlers');

let mainWindow;
let wsServer;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        webPreferences: {
            nodeIntegration: true, 
            contextIsolation: false
        },
        autoHideMenuBar: true, 
        title: "Prop Radar - Control Panel"
    });
    
    mainWindow.maximize(); 
    mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));
}

app.whenReady().then(() => {
    createWindow();

    wsServer = new LocalWSServer(
        8080, 
        (data) => {
            if (mainWindow) mainWindow.webContents.send('ws-message', data);
        },
        (isConnected, clientCount) => {
            if (mainWindow) mainWindow.webContents.send('ws-status', { isConnected, clientCount });
        }
    );
    
    wsServer.start();
    setupIpcHandlers(mainWindow, wsServer);

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});