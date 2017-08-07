import { app, Menu, BrowserWindow } from 'electron';

import * as os from 'os';

import { devMenuTemplate } from './menu/dev_menu_template';
import { editMenuTemplate } from './menu/edit_menu_template';
import AppUpdater from './helpers/updater';
import env from './env';

var windowStateKeeper = require('electron-window-state');

var setApplicationMenu = () => {
    let menus: any = [editMenuTemplate, devMenuTemplate];
    if (env.name !== 'production') {
        menus.push(devMenuTemplate);
    }
    Menu.setApplicationMenu(Menu.buildFromTemplate(menus));
};

// Save userData in separate folders for each environment.
// Thanks to this you can use production and development versions of the app
// on same machine like those are two separate apps.
if (env.name !== 'production') {
    let userDataPath = app.getPath('userData');
    app.setPath('userData', `${userDataPath} (${env.name})`);
}

app.on('ready', () => {
    setApplicationMenu();

    let mainWindowState = windowStateKeeper({
        defaultWidth: 1024,
        defaultHeight: 768,
    })
    
    let mainWindow = new BrowserWindow({
        'x': mainWindowState.x,
        'y': mainWindowState.y,
        'width': mainWindowState.width,
        'height': mainWindowState.height,
        'frame': false
    });
    
    mainWindow.setAutoHideMenuBar(true)
    mainWindow.setMenuBarVisibility(false);
    mainWindowState.manage(mainWindow);
    mainWindow.loadURL('file://' + __dirname + '/app.html');
    
    if (env.name === 'development') {
        mainWindow.webContents.openDevTools();
    }

    if (env.name === "production") {
        var autoUpdater = new AppUpdater(mainWindow);
    }   
});

app.on('window-all-closed', () => {
    app.quit();
});
