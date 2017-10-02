/*
 * Delete your the user data from your app, resets LocalStorage, IndexedDB etc.
 */
const path = require('path');
const app = require('electron').app;
const rimraf = require('rimraf');

const package = require(path.join(process.cwd(), 'package.json'));
const productName = package.productName || 'Electron';

app.once('ready', () => {

  const appDataPath = app.getPath('appData');
  const userDataPath = path.join(appDataPath, productName);

  rimraf(userDataPath, (err) => {
    if(err) {
      throw err;
    }
    console.log('Successfully deleted data from: ' + userDataPath);
    app.quit();
  });

});
