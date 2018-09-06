import { app, BrowserWindow, Menu } from 'electron';
import { devMenuTemplate } from './src/app/menu/dev_menu_template';
import { editMenuTemplate } from './src/app/menu/edit_menu_template';
import { AppUpdater } from './src/app/helpers/updater';
import * as path from 'path';
import * as url from 'url';

const windowStateKeeper = require('electron-window-state');

const setApplicationMenu = () => {
    let menus: any = [editMenuTemplate, devMenuTemplate];
    Menu.setApplicationMenu(Menu.buildFromTemplate(menus));
};

let win, serve;
const args = process.argv.slice(1);
serve = args.some(val => val === '--serve');

function createWindow() {
    setApplicationMenu();

    let mainWindowState = windowStateKeeper({
        defaultWidth: 1024,
        defaultHeight: 768,
    });

    // Create the browser window.
    win = new BrowserWindow({
        'x': mainWindowState.x,
        'y': mainWindowState.y,
        'width': mainWindowState.width,
        'height': mainWindowState.height,
        'hasShadow': true,
        'frame': false
    });

    win.setAutoHideMenuBar(true)
    win.setMenuBarVisibility(false);
    mainWindowState.manage(win);

    if (serve) {
        require('electron-reload')(__dirname, {
            electron: path.join(__dirname, 'node_modules', '.bin', 'electron')
        });
        win.loadURL(url.format({
            pathname: path.join(__dirname, 'dist/index.html'),
            protocol: 'file:',
            slashes: true
        }));
    } else {
        win.loadURL(url.format({
            pathname: path.join(__dirname, 'dist/index.html'),
            protocol: 'file:',
            slashes: true
        }));
    }

    if (process.env.NODE_ENV !== 'production') {
        let userDataPath = app.getPath('userData');
        app.setPath('userData', `${userDataPath} (development)`);
        win.webContents.openDevTools();
    } else {
        let autoUpdater = new AppUpdater(win);
    }

    // Emitted when the window is closed.
    win.on('closed', () => {
        // Dereference the window object, usually you would store window
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        win = null;
    });

}

try {

    // This method will be called when Electron has finished
    // initialization and is ready to create browser windows.
    // Some APIs can only be used after this event occurs.
    app.on('ready', createWindow);

    // Quit when all windows are closed.
    app.on('window-all-closed', () => {
        // On OS X it is common for applications and their menu bar
        // to stay active until the user quits explicitly with Cmd + Q
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });

    app.on('activate', () => {
        // On OS X it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (win === null) {
            createWindow();
        }
    });

} catch (e) {
    // Catch Error
    // throw e;
}
