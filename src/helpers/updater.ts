var { app, ipcMain } = require("electron")
import * as os from "os"
import env from '../env';

var log = console.log;

export default class AppUpdater {
  constructor(mainWindow) {
    var autoUpdater = require("electron-auto-updater").autoUpdater;
    var platform = os.platform() + '_' + os.arch();
    const version = app.getVersion()

    autoUpdater.on("update-available", (event) => {
      log("A new update is available")
    });

    autoUpdater.on("update-downloaded", (event, releaseNotes, releaseName, releaseDate, updateURL) => {
      console.log(arguments);
      mainWindow.webContents.send("updater", "update-downloaded", releaseName);
    });

    autoUpdater.on("error", (error) => {
      log(error)
    });

    autoUpdater.on("checking-for-update", (event) => {
      log("checking-for-update")
    });

    autoUpdater.on("update-not-available", () => {
      log("update-not-available")
    });

    ipcMain.on('updater', (event, arg) => {
        if(arg == "quitAndInstall")
          autoUpdater.quitAndInstall();
    });
    
    mainWindow.webContents.once("did-frame-finish-load", (event) => {
      autoUpdater.checkForUpdates()
    });
  }
}
