import { app, Menu } from 'electron';

import { devMenuTemplate } from './menu/dev_menu_template';
import { editMenuTemplate } from './menu/edit_menu_template';

import createWindow from './helpers/window';
import AppUpdater from './helpers/updater';

import * as os from 'os';
import env from './env';

var setApplicationMenu = function () {
    var menus: any = [editMenuTemplate];
    if (env.name !== 'production') {
        menus.push(devMenuTemplate);
    }
    Menu.setApplicationMenu(Menu.buildFromTemplate(menus));
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

    var mainWindow = createWindow('main', {
        //backgroundColor: '#3097d1',
        frame: false,
        //transparent: true
    });

    mainWindow.loadURL('file://' + __dirname + '/app.html');

    //if (env.name === 'development') {
    mainWindow.openDevTools();
    //}
    mainWindow.setAutoHideMenuBar(true)
    mainWindow.setMenuBarVisibility(false);
    if (env.name === "production") {
        var autoUpdater = new AppUpdater(mainWindow);
    }
});

app.on('window-all-closed', function () {
    app.quit();
});
