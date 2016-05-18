module.exports = function (app) {
  var isElectronApp = (typeof _isElectronApp !== 'undefined' && _isElectronApp === true);
  var isChromeApp = !!(typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest);
  var config = {
    isChromeApp: isChromeApp,
    isElectronApp: isElectronApp,
    apiUrl: (isChromeApp || isElectronApp) ? 'http://localhost:3001/tools/api' : 'http://localhost:8080/tools/api',
    fileSystem: null,
    graphsDir: 'data/graphs/'
  };

  if (isElectronApp) {
    //var remote = require('remote');
    //var electronApp = remote.require('app');
    //var remote = window.require('electron').remote;
    //var electronApp = remote.require('app');
    //config.electronPath = electronApp.getAppPath();
    //var electron = require('electron');
    //var app = electron.app;
    //console.log('!!!!!', app.getAppPath());
  }

  app
    .constant('config', config)
    .config(['$routeProvider', '$locationProvider', '$compileProvider', 'config',
    function ($routeProvider, $locationProvider, $compileProvider, config) {
      //add chrome-extension protocol to angular's images whitelist regular expression


      var currentImgSrcSanitizationWhitelist = $compileProvider.imgSrcSanitizationWhitelist();
      var newImgSrcSanitizationWhiteList = currentImgSrcSanitizationWhitelist.toString().slice(0,-1)
        + '|chrome-extension:'
        + '|filesystem:'
        + '|file:'
        +currentImgSrcSanitizationWhitelist.toString().slice(-1);

      $compileProvider.imgSrcSanitizationWhitelist(newImgSrcSanitizationWhiteList);
      $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|chrome-extension):/);

      $routeProvider
        .when('/:slug', {
          controller: 'gapminderToolsCtrl',
          reloadOnSearch: false
        })
        .otherwise({
          redirectTo: '/bubbles',
          reloadOnSearch: false
        });
    }])
    .run(['$rootScope', function($rootScope) {
      $rootScope.safeApply = function(){
        if (!$rootScope.$$phase){
          $rootScope.$apply.apply(this, arguments);
        }
      };
    }])

};
