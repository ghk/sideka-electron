// This is main process of Electron, started as first thing when your
// app starts. This script is running through entire life of your application.
// It doesn't have any windows which you can see on screen, but we can open
// window from here.

import { app, Menu } from 'electron';
import { devMenuTemplate } from './menu/dev_menu_template';
import { editMenuTemplate } from './menu/edit_menu_template';
import createWindow from './helpers/window';
import os from 'os';
//import autoUpdater from 'auto-updater';
import env from './env';
import AppUpdater from './helpers/updater';


var mainWindow;
var autoUpdater;

var setApplicationMenu = function () {
    var menus = [editMenuTemplate];
    if (env.name !== 'production') {
        menus.push(devMenuTemplate);
    }
    Menu.setApplicationMenu(Menu.buildFromTemplate(menus));
    //Menu.setApplicationMenu(null);
};

// Save userData in separate folders for each environment.
// Thanks to this you can use production and development versions of the app
// on same machine like those are two separate apps.
if (env.name !== 'production') {
    var userDataPath = app.getPath('userData');
    app.setPath('userData', userDataPath + ' (' + env.name + ')');
}

app.on('ready', function () {
    setApplicationMenu();

    mainWindow = createWindow('main', {
        width: 1000,
        height: 600
    });
    mainWindow.maximize();

    mainWindow.loadURL('file://' + __dirname + '/app.html');

    if (env.name === 'development') {
        mainWindow.openDevTools();
    }
    mainWindow.setAutoHideMenuBar(true)
    mainWindow.setMenuBarVisibility(false);
    if(env.name === "production"){
        autoUpdater = new AppUpdater(mainWindow);
    }
});

app.on('window-all-closed', function () {
    app.quit();
});
