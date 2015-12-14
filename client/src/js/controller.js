var Vizabi = require('vizabi');
var async = require('async');

module.exports = function (app) {
  app
    .controller('gapminderToolsCtrl', [
      '$scope', '$route', '$routeParams', '$location', 'vizabiItems',
      'vizabiFactory', '$window', 'config', 'readerService', 'BookmarksService',
      function ($scope, $route, $routeParams, $location, vizabiItems, vizabiFactory,
                $window, config, readerService, BookmarksService) {
        console.log('start controller');
        console.log(config);
        var placeholder = document.getElementById('vizabi-placeholder1');
        var bookmarks = new BookmarksService(readerService);

        setTimeout(function(){
          bookmarks.getAll(function(err, bookmarks) {
            if(err) {
              console.log(err);
            }
            console.log('get all result');
            console.log(bookmarks);
            $scope.favorites = bookmarks;
            $scope.$apply();
          });
        }, 100);

        $scope.setTab = function(tabId) {
          $scope.currentTab = tabId;
          //set current graph
          $scope.selectedGraph = _.result(_.find($scope.tabs, { id: tabId}), 'graphName');
        };
        $scope.lastTab = 0;
        $scope.tabs = [];

        $scope.loadingError = false;
        $scope.tools = {};
        $scope.validTools = [];

        $scope.favorites = {};
        $scope.selectedGraph = null;

        $scope.addTab = function(graph) {
          graph = $scope.graphs[graph];
          ++$scope.lastTab;
          $scope.tabs.push({
            id: $scope.lastTab,
            graphName: graph.name
          });
          $scope.currentTab = $scope.lastTab;
          setTimeout(function(){
            addGraph(graph)
          }, 1);
        };

        $scope.addToFavorites = function(graphName) {
          $scope.favorites[graphName] = $scope.graphs[graphName];
          bookmarks.add($scope.graphs[graphName]);
        };

        $scope.removeFromFavorites = function(graphName) {
          delete $scope.favorites[graphName];
        };

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

        $scope.url = function(url) {
          if (config.isChromeApp || config.isElectronApp) {
            $location.path(url);
          } else {
            $window.location.href = url;
          }
        };

        function updateGraph() {
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

        function addGraph(graph) {
          var placeholder = document.getElementById('vizabi-placeholder' + $scope.lastTab);
          vizabiFactory.render(graph.tool, placeholder, graph.opts);
        }

        $scope.graphs = getAvailableGraphsList();

        function getAvailableGraphsList() {
          var graphsHash = {};
          var dataPath;
          var geoPath;
          if (config.isElectronApp) {
            var path = require('path');
            dataPath = path.join(config.electronPath, 'client/src/public/data/data.csv');
            geoPath = path.join(config.electronPath, 'client/src/public/data/geo.json');
          } else if (config.isChromeApp) {
            dataPath = chrome.runtime.getURL('data/data.csv');
            geoPath = chrome.runtime.getURL('data/geo.json');
          }
          for (var i=1; i<=10; i++) {
            graphsHash['test-graph-' + i] = {
              name: 'test-graph-' + i,
              tool: 'BubbleChart',
              opts: {
                data: {
                  path:dataPath,
                  geoPath: geoPath,
                  reader: 'safe-csv'
                },
                ui: {
                  "buttons":[
                    "find",
                    "axes",
                    "size",
                    "colors",
                    "trails",
                    "lock",
                    "moreoptions",
                    "fullscreen"
                  ],
                  "buttons_expand":[
                    "colors",
                    "find",
                    "size"
                  ]
                }
              }
            };
          }
          console.log('return;');
          console.log(graphsHash);
          return graphsHash;
        }
      }]);
};
