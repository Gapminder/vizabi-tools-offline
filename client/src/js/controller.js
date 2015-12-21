var Vizabi = require('vizabi');
var async = require('async');

module.exports = function (app) {
  app
    .controller('gapminderToolsCtrl', [
      '$scope', '$route', '$routeParams', '$location',
      'vizabiFactory', '$window', 'config', 'readerService', 'BookmarksService', 'ngDialog',
      function ($scope, $route, $routeParams, $location,  vizabiFactory,
                $window, config, readerService, BookmarksService, ngDialog) {
        var placeholder = document.getElementById('vizabi-placeholder1');
        var bookmarks = new BookmarksService(readerService);

        setTimeout(function() {
          bookmarks.getAll(function(err, bookmarks) {
            if(err) {
              console.log('get bookmarks error', err);
            }
            //$scope.favorites = bookmarks;
            //$scope.safeApply();
          });
        }, 500);


        $scope.lastTab = -1;
        $scope.tabs = [];

        $scope.loadingError = false;
        $scope.tools = {};
        $scope.validTools = [];

        $scope.favorites = [];
        $scope.selectedGraph = null;

        $scope.graphs = getAvailableGraphsList();

        $scope.setTab = function(tabId) {
          $scope.currentTab = tabId;
          $scope.selectedGraph = _.findWhere($scope.tabs, {id: tabId}).graphName;
        };

        $scope.openGraph = function(graphName) {
          if ($scope.tabs.length === 0) {
            $scope.newTab();
          }
          setTimeout(function(){
            var graph = $scope.graphs[graphName];
            var tabIndex = $scope.tabs.map(function(el) {
              return el.id;
            }).indexOf($scope.currentTab);
            $scope.tabs[tabIndex].graphName = graph.name;
            $scope.selectedGraph = graph.name;
            renderGraph(graph);
          }, 10);
        };

        $scope.newTab = function() {
          ++$scope.lastTab;
          $scope.tabs.push({id: $scope.lastTab});
          $scope.setTab($scope.lastTab);
        };

        $scope.closeTab = function(tabId) {
          if (tabId === $scope.currentTab) {
            --$scope.currentTab;
          }
          $scope.tabs = _.without($scope.tabs, _.findWhere($scope.tabs, {id: tabId}));
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

        $scope.clickToOpen = function (graphName) {
          $scope.newBookmark = {name: graphName};
          $scope.saveNewBookmark = function() {
            console.log($scope.newBookmark);
            $scope.favorites.push($scope.newBookmark);
            //bookmarks.add($scope.graphs[$scope.newBookmark]);
            return true;
          };
          ngDialog.open({
            template: 'newBookmark.html',
            scope: $scope
          });
        };


        $scope.addToFavorites = function(graphName) {
          $scope.favorites[graphName] = $scope.graphs[graphName];
          bookmarks.add($scope.graphs[graphName]);
        };

        $scope.removeFromFavorites = function(graphName) {
          delete $scope.favorites[graphName];
        };

        //change location for the chrome and the electron apps
        $scope.url = function(url) {
          $location.path(url);
        };

        function renderGraph(graph) {
          var placeholder = document.getElementById('vizabi-placeholder' + $scope.lastTab);
          vizabiFactory.render(graph.tool, placeholder, graph.opts);
        }

        //compose test data for graphs
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
          return graphsHash;
        }
      }]);
};
