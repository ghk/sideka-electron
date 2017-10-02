import { app, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as os from "os";

const log = console.log;

export default class AppUpdater {
  constructor(mainWindow) {
    const log = require("electron-log")
    log.transports.file.level = "info"
    const platform = os.platform() + '_' + os.arch();
    const version = app.getVersion()

    autoUpdater.logger = log;

    autoUpdater.on("update-available", (event) => {
      log("A new update is available")
    });

    autoUpdater.on("update-downloaded", (event, releaseNotes, releaseName, releaseDate, updateURL) => {
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
      autoUpdater.checkForUpdates();
    });
  }
}
