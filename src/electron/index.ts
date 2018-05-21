import { app, BrowserWindow, Menu, ipcMain, dialog } from 'electron';
import path from 'path';
import url from 'url';
import './dev-extensions';

import { devMenuTemplate } from '../app/menu/dev_menu_template';
import { editMenuTemplate } from '../app/menu/edit_menu_template';
import AppUpdater from '../app/helpers/updater';

const windowStateKeeper = require('electron-window-state');

declare const DEV_SERVER: boolean;
declare const ENV: string;

const indexUrl = url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
});
 
const setApplicationMenu = () => {
    let menus: any = [editMenuTemplate, devMenuTemplate];
    if (ENV !== 'production') {
        menus.push(devMenuTemplate);
    }
    Menu.setApplicationMenu(Menu.buildFromTemplate(menus));
};

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;

function createWindow() {
  setApplicationMenu();

  let mainWindowState = windowStateKeeper({
      defaultWidth: 1024,
      defaultHeight: 768,
  })
  
  // Create the browser window.
  let win = new BrowserWindow({
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

  // and load the index.html of the app.
  win.loadURL(indexUrl);

  // Open the DevTools.
  if (DEV_SERVER) {
    win.webContents.openDevTools();
  }

  if (!DEV_SERVER) {
    let autoUpdater = new AppUpdater(win);
  }

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null;
  });
}

if (DEV_SERVER) {
  let userDataPath = app.getPath('userData');
  app.setPath('userData', `${userDataPath} (${ENV})`);
}
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

ipcMain.on('show-dialog', (event, arg) => {
  dialog.showMessageBox(win, {
    type: 'info',
    buttons: ['OK'],
    title: 'Native Dialog',
    message: 'I\'m a native dialog!',
    detail: 'It\'s my pleasure to make your life better.'
  });

  window['win'] = win;
  console.log(win);
});
