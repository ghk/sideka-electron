import { app, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as os from "os";

export default class AppUpdater {
  constructor(mainWindow) {
    if(os.platform() == "linux")
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
      log.info("update downloaded: "+updateInfo.releaseName);
      mainWindow.webContents.send("updater", "update-downloaded", updateInfo);
    });

    autoUpdater.on("error", (error) => {
      log.error(error)
    });

    autoUpdater.on("download-progress", (progress) => {
      log.info("download progress: "+progress.bytesPerSecond+" "+progress.percent);
    });


    autoUpdater.on("checking-for-update", (event) => {
      log.info("checking-for-update")
    });

    autoUpdater.on("update-not-available", () => {
      log.info("update-not-available")
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
