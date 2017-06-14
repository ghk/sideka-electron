import { app, Menu } from 'electron';
import { devMenuTemplate } from './menu/dev_menu_template';
import { editMenuTemplate } from './menu/edit_menu_template';
import createWindow from './helpers/window';
import * as os from 'os';
//import autoUpdater from 'auto-updater';
import env from './env';
import AppUpdater from './helpers/updater';

var mainWindow;
var autoUpdater;

var setApplicationMenu = function () {
    var menus: any = [editMenuTemplate];
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
        //backgroundColor: '#3097d1',
        frame: false,
        transparent: true
    });

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
