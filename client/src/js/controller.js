var Vizabi = require('vizabi');
var async = require('async');

module.exports = function (app) {
  app
    .controller('gapminderToolsCtrl', [
      '$scope', '$route', '$routeParams', '$location', 'vizabiItems', 'vizabiFactory', '$window', 'config', 'readerService',
      function ($scope, $route, $routeParams, $location, vizabiItems, vizabiFactory, $window, config, readerService) {
        console.log('start controller');
        console.log(config);

        var placeholder = document.getElementById('vizabi-placeholder1');
        var prevSlug = null;

        $scope.tab = 1;
        $scope.setTab = function(newTab){
          $scope.tab = newTab;
        };

        //init();

        if (config.isElectronApp) {
          console.log('is electron app');
          var path = require('path');
          var remote = require('remote');
          var app = remote.require('app');
          var electronPath = app.getAppPath();

          Vizabi._globals.gapminder_paths.baseUrl = path.join(electronPath, 'client/dist/tools/public/fixtures/');

          Vizabi.Tool.define("preload", function(promise) {
            console.log('preload start');
            var vizabiContext = this;
            async.parallel([
                function(callback){
                  readerService.getFile({
                    path: path.join(electronPath, 'client/dist/tools/public/fixtures/waffles/metadata.json'),
                    type: 'json'
                  }, callback);
                },
                function(callback){
                  readerService.getFile({
                    path: path.join(electronPath, 'client/src/public/fixtures/translation/en.json'),
                    type: 'json'
                  }, callback);
                }
              ],
              function(err, results){
                // the results array will equal ['one','two'] even though
                if (err) {
                  return console.log('load vizabi config files failed');
                }
                Vizabi._globals.metadata = JSON.parse(results[0]);
                vizabiContext.model.language.strings.set(vizabiContext.model.language.id, JSON.parse(results[1]));
                Vizabi._globals.metadata.indicatorsArray = ["gini", "gdp_per_cap", "u5mr"];
                promise.resolve();
              });
            return promise;
          });
        }

        function init() {
          $scope.loadingError = false;
          $scope.tools = {};
          $scope.validTools = [];
          $scope.isWeb = !config.isElectronApp && !config.isChromeApp;

          //start off by getting all items
          vizabiItems.getItems().then(function (items) {
            $scope.tools = items;
            $scope.validTools = Object.keys($scope.tools);
            updateGraph();
          });
        }

        //$scope.$root.$on('$routeChangeStart', function(event, state, current){
        //  var newSlug = state.params.slug;
        //  if (!prevSlug) {
        //    prevSlug = newSlug;
        //    return;
        //  }
        //  if (prevSlug !== newSlug) {
        //    prevSlug = newSlug;
        //    // and here we go, one more hack
        //    if (config.isChromeApp || config.isElectronApp) {
        //      init();
        //    } else {
        //      setTimeout(function () {
        //        window.location.reload();
        //      }, 1);
        //    }
        //    return;
        //  }
        //  console.log(window.location.hash);
        //});
        //$scope.$root.$on('$routeUpdate', function(event, state){
        //  var newSlug = state.params.slug;
        //  if (!prevSlug) {
        //    prevSlug = newSlug;
        //    return;
        //  }
        //  if (prevSlug !== newSlug) {
        //    prevSlug = newSlug;
        //    // and here we go, one more hack
        //    if (config.isChromeApp || config.isElectronApp) {
        //      init();
        //    } else {
        //      setTimeout(function () {
        //        window.location.reload();
        //      }, 1);
        //    }
        //    return;
        //  }
        //  console.log(window.location.hash);
        //});

        $scope.url = function(url) {
          if (config.isChromeApp || config.isElectronApp) {
            $location.path(url);
          } else {
            $window.location.href = url;
          }
        };

        function updateGraph() {
          debugger;
          //var validTools = $scope.validTools;
          //if (validTools.length === 0) return;
          //if (validTools.indexOf($routeParams.slug) === -1) {
          //  //redirect
          //  $location.path('/' + validTools[0]);
          //  return;
          //}
          //$scope.activeTool = $routeParams.slug;
          $scope.activeTool = 'bubbles';
          // do not put data in $scope
          var tool = angular.copy($scope.tools[$scope.activeTool]);
          //Vizabi.clearInstances();
          $scope.viz = vizabiFactory.render(tool.tool, placeholder, tool.opts);
          //$scope.$apply();
        }

        $scope.addGraph1 = addGraph1;
        $scope.addGraph2 = addGraph2;
        $scope.loadingError = false;
        $scope.tools = {};
        $scope.validTools = [];

        function addGraph1() {
          debugger;
          console.log('add graph');
          $scope.loadingError = false;
          //$scope.tools = {};
          //$scope.validTools = [];
          placeholder = document.getElementById('vizabi-placeholder1');

          //updateGraph();
          vizabiItems.getItems().then(function (items) {
            $scope.tools = items;
            $scope.validTools = Object.keys($scope.tools);
            updateGraph();
          });
        }

        function addGraph2() {
          debugger;
          console.log('add graph');
          $scope.loadingError = false;
          //$scope.tools = {};
          //$scope.validTools = [];
          placeholder = document.getElementById('vizabi-placeholder2');

          //updateGraph();
          vizabiItems.getItems().then(function (items) {
            $scope.tools = items;
            $scope.validTools = Object.keys($scope.tools);
            updateGraph();
          });
        }
      }]);
};
