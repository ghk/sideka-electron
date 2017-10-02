const path = require('path');
const electron = require('electron');
const Application = require('spectron').Application

const appPath = path.join(__dirname, '..', 'dist');

let app = new Application({
  path: electron,
  args: [appPath]
});

app.start().then(function() {
  return app.client.debug();
}).then(function() {
  return app.stop();
});
