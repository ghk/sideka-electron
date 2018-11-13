import { app, BrowserWindow, Menu, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as os from "os";
import * as path from 'path';
import * as url from 'url';

const windowStateKeeper = require('electron-window-state');

const setApplicationMenu = () => {
    let menus: any = [editMenuTemplate, devMenuTemplate];
    Menu.setApplicationMenu(Menu.buildFromTemplate(menus));
};

let devMenuTemplate = {
    label: 'Development',
    submenu: [{
        label: 'Reload',
        accelerator: 'CmdOrCtrl+R',
        click: function () {
            BrowserWindow.getFocusedWindow().webContents.reloadIgnoringCache();
        }
    }, {
        label: 'Toggle DevTools',
        accelerator: 'Alt+CmdOrCtrl+I',
        click: function () {
            BrowserWindow.getFocusedWindow()['toggleDevTools']();
        }
    }, {
        label: 'Quit',
        accelerator: 'CmdOrCtrl+Q',
        click: function () {
            app.quit();
        }
    }]
};

let editMenuTemplate = {
    label: 'Edit',
    submenu: [
        { label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:", role: "undo" },
        { label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:", role: "redo" },
        { type: "separator" },
        { label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:", role: "cut" },
        { label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:", role: "copy" },
        { label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:", role: "paste" },
        { label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:", role: "selectall" }
    ]
};

class AppUpdater {
    constructor(mainWindow) {
        if (os.platform() == "linux")
            return;

        const log = require("electron-log")
        log.transports.file.level = "info"
        const platform = os.platform() + '_' + os.arch();
        const version = app.getVersion()

        autoUpdater.logger = log;

        autoUpdater.on("update-available", (event) => {
            log.info("A new update is available")
        });

        autoUpdater.on("update-downloaded", (updateInfo) => {
            log.info("update downloaded: " + updateInfo.releaseName);
            mainWindow.webContents.send("updater", "update-downloaded", updateInfo);
        });

        autoUpdater.on("error", (error) => {
            log.error(error)
        });

        autoUpdater.on("download-progress", (progress) => {
            log.info("download progress: " + progress.bytesPerSecond + " " + progress.percent);
        });


        autoUpdater.on("checking-for-update", (event) => {
            log.info("checking-for-update")
        });

        autoUpdater.on("update-not-available", () => {
            log.info("update-not-available")
        });

        ipcMain.on('updater', (event, arg) => {
            if (arg == "quitAndInstall")
                autoUpdater.quitAndInstall();
        });

        mainWindow.webContents.once("did-frame-finish-load", (event) => {
            autoUpdater.checkForUpdates();
        });
    }
}

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
