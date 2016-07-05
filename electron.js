var app = require('app');  // Module to control application life.
var ElectronUpdateChecker = require('electron-update-checker');
var ipc = require('ipc');
var BrowserWindow = require('browser-window');  // Module to create native browser window.
var mainWindow = null;
var autoUpdateWindow = null;

app.on('window-all-closed', function () {
  if (process.platform != 'darwin') {
    app.quit();
  }
});

app.on('ready', function () {
  var ZIP_HOST = 'https://s3-eu-west-1.amazonaws.com/gapminder-offline/#version';
  var JSON_HOST = 'https://s3-eu-west-1.amazonaws.com/gapminder-offline';
  var electronUpdateChecker = new ElectronUpdateChecker({
    version: app.getVersion(),
    url: JSON_HOST,
    versionJsonFile: 'auto-update.json'
  });

  function createMainWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      icon: 'file://' + __dirname + '/client/dist/tools/favicon.ico',
      'min-width': 800,
      'min-height': 200,
      'accept-first-mouse': true
    });

    mainWindow.loadUrl('file://' + __dirname + '/client/dist/tools/index.html');

    //if (process.env.NODE_ENV === 'development') {
      mainWindow.openDevTools();
    //}

    mainWindow.focus();

    mainWindow.on('closed', function () {
      mainWindow = null;
    });

    if (autoUpdateWindow) {
      autoUpdateWindow.close();
    }
  }

  function createAutoUpdateWindowWindow(version) {
    autoUpdateWindow = new BrowserWindow({
      width: 400,
      height: 400,
      'accept-first-mouse': true
    });

    autoUpdateWindow.loadUrl('file://' + __dirname + '/client/dist/tools/autoupdate.html');
    autoUpdateWindow.webContents.on('did-finish-load', () => {
      autoUpdateWindow.webContents.send('show-version', {
        current: app.getVersion(),
        latest: version
      });
    });
    autoUpdateWindow.focus();
  }

  electronUpdateChecker.checkVersion((err, version) => {
    if (err) {
      console.log(err);
      createMainWindow();
      return;
    }

    if (version) {
      createAutoUpdateWindowWindow(version);

      var childProcess = require('child_process');
      var spawn = childProcess.spawn;
      var dirs = {
        linux: './',
        darwin: __dirname + '/../../../../',
        win32: '.\\'
      };

      ipc.on('update-no', createMainWindow);
      ipc.on('update-yes', function () {
        var updateCommand = dirs[process.platform] + 'updater-' + process.platform;

        if (process.platform === 'win32') {
          updateCommand = updateCommand + '.exe';
        }

        var child = spawn(
          updateCommand,
          [
            version,
            process.platform,
            ZIP_HOST,
            'GapminderOffline-#platform.zip',
            'Gapminder Offline-#platform-x64',
            './cache'
          ],
          {cwd: dirs[process.platform]});

        child.stdout.on('data', function (data) {
          autoUpdateWindow.webContents.send('update-data', data);
        });
        child.stderr.on('data', function (data) {
          autoUpdateWindow.webContents.send('update-data', data);
        });
        child.on('close', function (code) {
          if (code === 0) {
            autoUpdateWindow.webContents.send('show-restart');
          }
        });
      });
      ipc.on('restart', function () {
        if (process.platform !== 'win32') {
          var runCommand = dirs[process.platform] + 'run-' + process.platform;

          spawn(
            runCommand,
            [],
            {
              cwd: dirs[process.platform],
              stdio: 'ignore',
              detached: true
            }
          ).unref();
        }

        if (process.platform === 'win32') {
          spawn(
            'cmd.exe',
            ['/s', '/c', '"run-win32.bat"'],
            {
              windowsVerbatimArguments: true,
              stdio: 'ignore',
              detached: true
            }
          ).unref();
        }

        app.quit();
      });
      ipc.on('restart-prev', function () {
        createMainWindow();
      });
    }

    if (!version) {
      createMainWindow();
    }
  });
});
