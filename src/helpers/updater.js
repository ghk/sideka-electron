import { app, BrowserWindow as BrowserWindowElectron } from "electron"
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
    })
    autoUpdater.on("update-downloaded", (event, releaseNotes, releaseName, releaseDate, updateURL) => {
      log("Update downloaded");
      //notify("A new update is ready to install", `Version ${releaseName} is downloaded and will be automatically installed on Quit`)
    })
    autoUpdater.on("error", (error) => {
      log(error)
    })
    autoUpdater.on("checking-for-update", (event) => {
      log("checking-for-update")
    })
    autoUpdater.on("update-not-available", () => {
      log("update-not-available")
    })
    
    //autoUpdater.setFeedURL('http://download.sideka.id/update/'+platform+'/'+version);

    mainWindow.webContents.once("did-frame-finish-load", (event) => {
      autoUpdater.checkForUpdates()
    })
  }
}

function notify(title, message) {
  let windows = BrowserWindowElectron.getAllWindows()
  if (windows.length == 0) {
    return
  }

  windows[0].webContents.send("notify", title, message)
}