var Vizabi = require('vizabi');
var async = require('async');
var _ = require('lodash');
var path = require('path');
var formatJson = require('format-json');
var WebFS = require('web-fs');

var ddfLib = require('./vizabi-ddf');
var Ddf = ddfLib.Ddf;
var mainQueryTemplate = require('./templates/query').mainQueryTemplate;
var entitiesQueryTemplate = require('./templates/query').entitiesQueryTemplate;

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
        var url = '';

        if (config.isElectronApp) {
          url = path.join('file://', config.electronPath, 'chrome-app/data/gw') + '/';
        }

        var metadataContent = '';
        var translationsContent = '';

        //last tab created
        $scope.lastTab = -1;
        $scope.tabs = [];
        $scope.expertMode = false;

        $scope.ddf = {
          url: '',
          metadataUrl: '',
          translationsUrl: '',
          /*url: 'https://raw.githubusercontent.com/buchslava/ddf--gapminder_world/master/output/ddf/',
           metadataUrl: 'https://raw.githubusercontent.com/semio/ddf--gapminder_world/master/output/vizabi/metadata.json',
           translationsUrl: 'https://raw.githubusercontent.com/semio/ddf--gapminder_world/master/output/vizabi/en.json',*/
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
          startTime: "1990",
          currentTime: '2009',
          endTime: '2015',
          expectedMeasuresQuery: '',
          mainQuery: {}
        };

        $scope.loadingError = false;
        //@todo: remove it
        $scope.tools = {};
        //@todo: remove it
        $scope.validTools = [];

        //favorites graphs
        $scope.favorites = {};
        $scope.selectedGraph = null;

        $scope.defaults = function () {
          $scope.ddf.url = url + 'ddf';
          $scope.ddf.metadataUrl = url + 'vizabi/metadata.json';
          $scope.ddf.translationsUrl = url + 'vizabi/en.json';
          $scope.ddf.expectedMeasuresQuery = formatJson.plain(entitiesQueryTemplate);
          $scope.ddf.mainQuery = {};
          Object.keys(mainQueryTemplate).forEach(function (key) {
            $scope.ddf.mainQuery[key] = formatJson.plain(mainQueryTemplate[key]);
          });
        };

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

        $scope.loadChromeFs = function () {
          if (config.isChromeApp) {
            chrome.fileSystem.chooseEntry({type: 'openDirectory'}, function (entry) {
              chrome.fileSystem.getDisplayPath(entry, function (path) {
                Ddf.chromeFs = WebFS(entry);

                safeApply($scope, function () {
                  Ddf.reset();
                  $scope.chromeFsRootPath = path;
                });
              });
            });
          }
        };

        $scope.hasChromeFs = function () {
          return !!Ddf.chromeFs;
        };

        $scope.loadMeasures = function () {
          $scope.ddfError = '';
          $scope.ddf.dimensions = [];
          $scope.ddf.measures = [];

          var query = {};
          try {
            query = JSON.parse($scope.ddf.expectedMeasuresQuery);
          } catch (e) {
            $scope.ddfError = e;
          }

          if ($scope.ddfError) {
            return;
          }

          var ddf = new Ddf($scope.ddf.url);

          ddf.getIndex(function (err) {
            if (err) {
              safeApply($scope, function () {
                $scope.ddfError = 'Wrong DDF index: ' + err;
              });

              return;
            }

            ddf.getConceptsAndEntities(query, function (err, concepts) {
              if (err) {
                safeApply($scope, function () {
                  $scope.ddfError = 'Wrong DDF concepts: ' + err;
                });

                return;
              }

              concepts.forEach(function (concept) {
                if (concept.concept_type === 'measure') {
                  $scope.ddf.measures.push(concept);
                }

                if (concept.concept_type !== 'measure') {
                  $scope.ddf.dimensions.push(concept);
                }
              });

              var loader = Ddf.chromeFs ? chromeLoad : xhrLoad;

              loader($scope.ddf.metadataUrl, function (metadata) {
                loader($scope.ddf.translationsUrl, function (translations) {
                  safeApply($scope, function () {
                    $scope.ddfError = '';

                    try {
                      metadataContent = JSON.parse(metadata);
                    } catch (e) {
                      $scope.ddfError = 'Wrong JSON format for metadata: ' + e;
                    }

                    try {
                      translationsContent = JSON.parse(translations);
                    } catch (e) {
                      $scope.ddfError += '\nWrong JSON format for translations: ' + e;
                    }
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

        function chromeLoad(path, cb) {
          Ddf.chromeFs.readFile(path, '', function (err, file) {
            if (err) {
              console.log(err);
            }

            cb(file);
          });
        }

        $scope.openDdf = function () {
          var queryObj = {};
          $scope.ddfError = '';

          try {
            queryObj = JSON.parse($scope.ddf.mainQuery[$scope.ddf.type]);
          } catch (e) {
            $scope.ddfError = 'Wrong JSON format for main query';
          }

          if ($scope.ddfError) {
            return;
          }

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

            queryObj.state.time.start = $scope.ddf.startTime;
            queryObj.state.time.end = $scope.ddf.endTime;
            queryObj.state.time.value = $scope.ddf.currentTime;

            $scope.ddf.popup = false;

            if (config.isElectronApp) {
              Vizabi._globals.ext_resources.host = url;
              Vizabi._globals.ext_resources.preloadPath = '../../preview/data/';
            }

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

        $scope.defaults();
      }]);
};
