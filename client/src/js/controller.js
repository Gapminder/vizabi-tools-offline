var Vizabi = require('vizabi');
var async = require('async');
var _ = require('lodash');

var ddfLib = require('./vizabi-ddf');
var Ddf = ddfLib.Ddf;
var queryTemplate = require('./templates/query').queryTemplate;
var queryForCsvReader = require('./templates/query-for-csv-reader').queryForCsvReader;

function safeApply(scope, fn) {
  var phase = scope.$root.$$phase;
  if (phase == '$apply' || phase == '$digest') {
    scope.$eval(fn);
  } else {
    scope.$apply(fn);
  }
}

module.exports = function (app) {
  app
    .controller('gapminderToolsCtrl', [
      '$scope', '$route', '$routeParams', '$location',
      'vizabiFactory', '$window', 'config', 'readerService', 'BookmarksService', '$timeout',
      function ($scope, $route, $routeParams, $location, vizabiFactory,
                $window, config, readerService, BookmarksService, $timeout) {
        var placeholder = document.getElementById('vizabi-placeholder1');
        var bookmarks = new BookmarksService(readerService);

        if (config.isChromeApp) {
          //request storage in chrome file system
          //@see: http://www.html5rocks.com/en/tutorials/file/filesystem/
          window.webkitRequestFileSystem(window.PERSISTEN, 1024, onInitFs, function (err) {
            if (err) {
              console.log(err)
            }
          });
        }

        var metadataContent = '';
        var translationsContent = '';

        //last tab created
        $scope.lastTab = -1;
        $scope.tabs = [];

        $scope.ddf = {
          url: 'https://raw.githubusercontent.com/buchslava/ddf--gapminder_world/master/output/ddf/',
          metadataUrl: 'https://raw.githubusercontent.com/semio/ddf--gapminder_world/master/output/vizabi/metadata.json',
          translationsUrl: 'https://raw.githubusercontent.com/semio/ddf--gapminder_world/master/output/vizabi/en.json',
          type: 'BubbleChart',
          types: [
            {value: 'BubbleChart', name: 'Bubble Chart'},
            {value: 'MountainChart', name: 'Mountain Chart'},
            {value: 'BubbleMap', name: 'Bubble Map'}
          ],
          measures: [],
          dimensions: [],
          popup: false,
          /*xAxis: 'gdppercapita_us_inflation_adjusted',
           yAxis: 'life_expectancy_at_birth_data_from_ihme',
           sizeAxis: 'population_total',
           xAxis: 'sg_gdp_p_cap_const_ppp2011_dollar',
           yAxis: 'sg_population',
           sizeAxis: 'sg_gini',*/
          xAxis: '',
          yAxis: '',
          sizeAxis: '',
          geoChart: 'geo.country',
          geoColors: 'geo.geographic_regions_in_4_colors',
          colorized: {},
          startTime: "1990",
          currentTime: '2009',
          endTime: '2015'
        };

        $scope.loadingError = false;
        //@todo: remove it
        $scope.tools = {};
        //@todo: remove it
        $scope.validTools = [];

        //favorites graphs
        $scope.favorites = {};
        $scope.selectedGraph = null;

        $scope.setTab = function (tabId) {
          //set current tab id and get current graph object
          $scope.currentTab = tabId;
          $scope.selectedGraph = _.findWhere($scope.tabs, {id: tabId}).graphName;
        };

        $scope.openGraph = function (graphName) {
          if ($scope.tabs.length === 0) {
            //if there are no tabs - create one
            $scope.newTab();
          }
          //render graph when tab is rendered
          $timeout(function () {
            var graph = $scope.graphs[graphName];
            var tabIndex = $scope.tabs.map(function (el) {
              return el.id;
            }).indexOf($scope.currentTab);
            $scope.tabs[tabIndex].graphName = graph.name;
            $scope.selectedGraph = graph.name;
            Vizabi._globals.gapminder_paths.baseUrl = '/';
            renderGraph(graph);
          }, 0);
        };

        $scope.loadDdf = function () {
          var query = {
            "select": ["geo", "geo.name", "geo.geographic_regions_in_4_colors"],
            "where": {"geo.is--country": true},
            "grouping": {},
            "orderBy": null
          };
          var ddf = new Ddf($scope.ddf.url);
          ddf.getIndex(function () {
            ddf.getConceptsAndEntities(query, function (concepts, entities) {
              $scope.ddf.dimensions = [];
              $scope.ddf.measures = [];

              concepts.forEach(function (concept) {
                if (concept.concept_type === 'measure') {
                  $scope.ddf.measures.push(concept);
                }

                if (concept.concept_type !== 'measure') {
                  $scope.ddf.dimensions.push(concept);
                }
              });

              xhrLoad($scope.ddf.metadataUrl, function (metadata) {
                xhrLoad($scope.ddf.translationsUrl, function (translations) {
                  metadataContent = JSON.parse(metadata);
                  translationsContent = JSON.parse(translations);

                  safeApply($scope, function () {
                    $scope.ddf.popup = true;
                  });
                });
              });
            });
          });
        };

        $scope.closeDdf = function () {
          $scope.ddf.popup = false;
        };

        function xhrLoad(path, cb) {
          var xhr = new XMLHttpRequest();
          xhr.open('GET', path, true);
          xhr.onload = function () {
            if (xhr.readyState === 4) {
              if (xhr.status === 200) {
                cb(xhr.responseText);
              }
            }
          };
          xhr.send(null);
        }

        $scope.openDdf = function () {
          var queryObj = queryTemplate[$scope.ddf.type];
          if ($scope.tabs.length === 0) {
            //if there are no tabs - create one
            $scope.newTab();
          }
          //render graph when tab is rendered
          $timeout(function () {
            var placeholder = document.getElementById('vizabi-placeholder' + $scope.lastTab);
            if ($scope.ddf.type === 'BubbleChart' || $scope.ddf.type === 'MountainChart') {
              queryObj.data.path = $scope.ddf.url;
              queryObj.state.marker.axis_y.which = $scope.ddf.yAxis;
              queryObj.state.marker.axis_x.which = $scope.ddf.xAxis;
              queryObj.state.marker.size.which = $scope.ddf.sizeAxis;
            }

            if ($scope.ddf.type === 'BubbleMap') {
              queryObj.data.path = $scope.ddf.url;
              queryObj.state.marker.size.which = $scope.ddf.sizeAxis;
            }

            queryObj.state.marker.color.which = $scope.ddf.geoColors;
            queryObj.state.time.start = $scope.ddf.startTime;
            queryObj.state.time.end = $scope.ddf.endTime;
            queryObj.state.time.value = $scope.ddf.currentTime;

            $scope.ddf.popup = false;

            Vizabi.Tool.define('preload', function (promise) {
              Vizabi._globals.metadata = metadataContent;
              this.model.language.strings.set(this.model.language.id, translationsContent);
              promise.resolve();
            });

            queryObj.data.ddfPath = $scope.ddf.url;
            vizabiFactory.render($scope.ddf.type, placeholder, queryObj);
          }, 0);
        };

        $scope.newTab = function () {
          //create new tab and set current tab
          ++$scope.lastTab;
          $scope.tabs.push({id: $scope.lastTab});
          $scope.setTab($scope.lastTab);
        };

        $scope.closeTab = function (tabId) {
          if (tabId === $scope.currentTab) {
            --$scope.currentTab;
          }
          $scope.tabs = _.without($scope.tabs, _.findWhere($scope.tabs, {id: tabId}));
        };

        $scope.addToFavorites = function (graphName) {
          $scope.favorites[graphName] = $scope.graphs[graphName];
          bookmarks.add($scope.graphs[graphName]);
        };

        $scope.removeFromFavorites = function (graphName) {
          delete $scope.favorites[graphName];
        };

        //change location for the chrome and the electron apps
        $scope.url = function (url) {
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

          readerService.getGraphsList(function (err, graphsList) {
            _.each(graphsList, function (graph) {
              // get it from file name - ugly hack
              if (!graph.name || !graph.name.match) {
                return;
              }

              var m = graph.name.match(/\d+/);
              if (!m || m.length < 1) {
                return;
              }

              var year = m[0];

              graphsHash[graph.name] = _.cloneDeep(queryForCsvReader);
              graphsHash[graph.name].name = graph.name;
              graphsHash[graph.name].opts.data.path = dataPath + graph.name;
              graphsHash[graph.name].opts.data.geoPath = geoPath;
              graphsHash[graph.name].opts.state.time.start = year;
              graphsHash[graph.name].opts.state.time.end = year;
              graphsHash[graph.name].opts.state.time.value = year;
            });
            cb(null, graphsHash);
          });
        }

        function onInitFs(fs) {
          config.fileSystem = fs;

          getAvailableGraphsList(function (err, graphs) {
            $scope.graphs = graphs;
            $scope.safeApply();
          });
          readBookmarks();
        }

        function readBookmarks() {
          bookmarks.getAll(function (err, bookmarks) {
            if (err) {
              return console.log('get bookmarks error', err);
            }
            $scope.favorites = bookmarks;
            $scope.safeApply();
          });
        }
      }]);
};
