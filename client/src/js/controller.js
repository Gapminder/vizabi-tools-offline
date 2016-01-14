var Vizabi = require('vizabi');
var async = require('async');

module.exports = function (app) {
  app
    .controller('gapminderToolsCtrl', [
      '$scope', '$route', '$routeParams', '$location',
      'vizabiFactory', '$window', 'config', 'readerService', 'BookmarksService', '$timeout',
      function ($scope, $route, $routeParams, $location,  vizabiFactory,
                $window, config, readerService, BookmarksService, $timeout) {
        var placeholder = document.getElementById('vizabi-placeholder1');
        var bookmarks = new BookmarksService(readerService);

        if (config.isChromeApp) {
          //request storage in chrome file system
          //@see: http://www.html5rocks.com/en/tutorials/file/filesystem/
          window.webkitRequestFileSystem(window.PERSISTEN, 1024, onInitFs, function(err) {
            if(err) {
              console.log(err)
            }
          });
        }

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
                //set indicators
                Vizabi._globals.metadata.indicatorsArray = ["gini", "gdp_per_cap", "u5mr"];
                promise.resolve();
              });
            return promise;
          });
        }

        //last tab created
        $scope.lastTab = -1;
        $scope.tabs = [];

        $scope.mode = 'default';
        $scope.ddf = {
          url: 'https://raw.githubusercontent.com/buchslava/ddf--gapminder--systema_globalis/master',
          type: 'BubbleChart',
          types: [
            {value: 'BubbleChart', name: 'Bubble Chart'},
            {value: 'MountainChart', name: 'Mountain Chart'}
          ]
        };

        $scope.loadingError = false;
        //@todo: remove it
        $scope.tools = {};
        //@todo: remove it
        $scope.validTools = [];

        //favorites graphs
        $scope.favorites = {};
        $scope.selectedGraph = null;

        $scope.setTab = function(tabId) {
          //set current tab id and get current graph object
          $scope.currentTab = tabId;
          $scope.selectedGraph = _.findWhere($scope.tabs, {id: tabId}).graphName;
        };

        $scope.openGraph = function(graphName) {
          if ($scope.tabs.length === 0) {
            //if there are no tabs - create one
            $scope.newTab();
          }
          //render graph when tab is rendered
          $timeout(function(){
            var graph = $scope.graphs[graphName];
            var tabIndex = $scope.tabs.map(function(el) {
              return el.id;
            }).indexOf($scope.currentTab);
            $scope.tabs[tabIndex].graphName = graph.name;
            $scope.selectedGraph = graph.name;
            Vizabi._globals.gapminder_paths.baseUrl = '/';
            renderGraph(graph);
          }, 0);
        };

        $scope.openDdf = function () {
          if ($scope.tabs.length === 0) {
            //if there are no tabs - create one
            $scope.newTab();
          }
          //render graph when tab is rendered
          $timeout(function () {
            var placeholder = document.getElementById('vizabi-placeholder' + $scope.lastTab);
            var opts = {
              data: {
                path: $scope.ddf.url,
                reader: 'ddfcsv',
                splash: false
              },
              ui: {
                buttons: ['colors', 'find', 'trails', 'lock', 'size', 'moreoptions', 'fullscreen'],
                dialogs: {
                  'popup': ['colors', 'find', 'size', 'moreoptions'],
                  'sidebar': ['colors', 'find', 'size'],
                  'moreoptions': ['opacity', 'speed', 'axes', 'size', 'colors', 'presentation']
                }
              },
              state: {
                time: {
                  start: "1800",
                  end: "2015",
                  value: "2015",
                  step: 1,
                  formatInput: "%Y",
                  trails: true,
                  lockNonSelected: 0,
                  adaptMinMaxZoom: false
                },
                entities: {
                  dim: "geo",
                  show: {
                    "geo.cat": ["country"]
                  }
                },
                marker: {
                  space: ["entities", "time"],
                  type: "geometry",
                  shape: "circle",
                  label: {
                    use: "property",
                    which: "geo.name"
                  },
                  axis_y: {
                    use: "indicator",
                    which: "fertility_rate",
                    scaleType: "linear",
                    allow: {
                      scales: ["linear", "log"]
                    }
                  },
                  axis_x: {
                    use: "indicator",
                    which: "life_expectancy",
                    scaleType: "log",
                    allow: {
                      scales: ["linear", "log"]
                    }
                  },
                  color: {
                    use: "property",
                    which: "geo.region",
                    scaleType: "ordinal",
                    allow: {
                      names: ["!geo.name"]
                    },
                    palette: {
                      asia: "#FF5872",
                      europe: "#FFE700",
                      americas: "#7FEB00",
                      africa: "#00D5E9",
                      _default: "#ffb600"
                    }
                  },
                  size: {
                    use: "indicator",
                    which: "population",
                    scaleType: "linear",
                    allow: {
                      scales: ["linear", "log"]
                    },
                    min: .04,
                    max: .90
                  }
                }
              }
            };

            Vizabi._globals.gapminder_paths.baseUrl = '/ddf/';
            vizabiFactory.render($scope.ddf.type, placeholder, opts);
          }, 0);
        };

        $scope.newTab = function() {
          //create new tab and set current tab
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
        function getAvailableGraphsList(cb) {
          var graphsHash = {};
          var dataPath;
          var geoPath;

          //@todo: set paths to config
          if (config.isElectronApp) {
            var path = require('path');
            dataPath = path.join(config.electronPath, 'client/src/public/data/data.csv');
            geoPath = path.join(config.electronPath, 'client/src/public/data/geo.json');
          } else if (config.isChromeApp) {
            dataPath = chrome.runtime.getURL('data/graphs/');
            geoPath = chrome.runtime.getURL('data/geo.json');
          }

          readerService.getGraphsList(function(err, graphsList) {
            _.each(graphsList, function(graph) {
              graphsHash[graph.name] = {
                name: graph.name,
                tool: 'BubbleChart',
                opts: {
                  data: {
                    path:dataPath + graph.name,
                    geoPath: geoPath,
                    reader: 'safe-csv',
                    splash: true
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
            });
            cb(null,graphsHash);
          });
        }

        function onInitFs(fs) {
          config.fileSystem = fs;

          getAvailableGraphsList(function(err, graphs){
            $scope.graphs = graphs;
            $scope.safeApply();
          });
          readBookmarks();
        }

        function readBookmarks() {
          bookmarks.getAll(function(err, bookmarks) {
            if(err) {
              return console.log('get bookmarks error', err);
            }
            $scope.favorites = bookmarks;
            $scope.safeApply();
          });
        }
      }]);
};
