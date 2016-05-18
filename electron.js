var electron = require('electron');
var fs = require('fs');
var app = electron.app;
var autoUpdater = electron.autoUpdater;
var BrowserWindow = electron.BrowserWindow;
var ipc = electron.ipcMain;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: 'file://' + __dirname + '/client/dist/tools/favicon.ico',
    minWidth: 800,
    minHeight: 200,
    acceptFirstMouse: true
  });

  mainWindow.loadURL('file://' + __dirname + '/client/dist/tools/index.html');

  //if (process.env.NODE_ENV === 'development') {
    mainWindow.openDevTools();
  //}

  //mainWindow.focus();

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

function notify(title, message) {
  var windows = BrowserWindowElectron.getAllWindows();

  if (windows.length == 0) {
    return
  }

  windows[0].webContents.send("notify", title, message);
}

var mainWindow = null;

app.on('ready', createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit()
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});

const version = app.getVersion();

autoUpdater.addListener("update-available", function () {
  console.log("A new update is available");
});

autoUpdater.addListener("update-downloaded", function (event, releaseNotes, releaseName, releaseDate, updateURL) {
  notify("A new update is ready to install", 'Version '+releaseName+' is downloaded and will be automatically installed on Quit');
});

autoUpdater.addListener("error", function (error) {
  console.log(error);
});

autoUpdater.addListener("checking-for-update", function (event) {
  console.log("checking-for-update");
});

autoUpdater.addListener("update-not-available", function () {
  console.log("update-not-available");
});

autoUpdater.setFeedURL('http://127.0.0.1:8080/Vizabi Offline-linux-x64.zip');

autoUpdater.quitAndInstall();