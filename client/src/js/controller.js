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
    .controller('gapminderToolsCtrl', ['$scope', 'config', '$timeout',
      function ($scope, config, $timeout) {
        var placeholder = document.getElementById('vizabi-placeholder1');
        var electronUrl = '';

        if (config.isElectronApp) {
          electronUrl = path.join('file://', config.electronPath, 'chrome-app/data/gw') + '/';
        }

        $scope.config = config;

        var metadataContent = '';
        var translationsContent = '';

        //last tab created
        $scope.lastTab = -1;
        $scope.tabs = [];
        $scope.expertMode = false;
        $scope.navCollapsed = false;

        $scope.ddf = {
          url: '',
          metadataUrl: '',
          translationsUrl: '',
          chromeExternalDdfPath: 'false',
          type: 'BubbleChart',
          types: [
            {value: 'BubbleChart', name: 'Bubble Chart'},
            {value: 'MountainChart', name: 'Mountain Chart'},
            {value: 'BubbleMap', name: 'Bubble Map'}
          ],
          measures: [],
          dimensions: [],
          popup: false,
          xAxis: 'income_per_person_gdppercapita_ppp_inflation_adjusted',
          yAxis: 'life_expectancy_years',
          sizeAxis: 'population_total',
          startTime: "1990",
          currentTime: '2015',
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

        $scope.defaults = function (cb) {
          Ddf.chromeFs = null;
          $scope.chromeFsRootPath = '';

          if (config.isElectronApp) {
            $scope.ddf.url = electronUrl + 'ddf';
            $scope.ddf.metadataUrl = electronUrl + 'vizabi/metadata.json';
            $scope.ddf.translationsUrl = electronUrl + 'vizabi/en.json';
          }

          if (config.isChromeApp && $scope.ddf.chromeExternalDdfPath === 'false') {
            $scope.ddf.url = '../data/gw/ddf';
            $scope.ddf.metadataUrl = '../data/gw/vizabi/metadata.json';
            $scope.ddf.translationsUrl = '../data/gw/vizabi/en.json';
          }

          if (config.isChromeApp && $scope.ddf.chromeExternalDdfPath === 'true') {
            $scope.ddf.url = 'ddf';
            $scope.ddf.metadataUrl = 'vizabi/metadata.json';
            $scope.ddf.translationsUrl = 'vizabi/en.json';
          }

          $scope.ddf.expectedMeasuresQuery = formatJson.plain(entitiesQueryTemplate);
          $scope.ddf.mainQuery = {};
          Object.keys(mainQueryTemplate).forEach(function (key) {
            $scope.ddf.mainQuery[key] = formatJson.plain(mainQueryTemplate[key]);
          });

          if (config.isElectronApp || (config.isChromeApp && $scope.ddf.chromeExternalDdfPath === 'false')) {
            $scope.loadMeasures();
          }
        };

        $scope.setTab = function (tabId) {
          //set current tab id and get current graph object
          $scope.currentTab = tabId;
          $scope.selectedGraph = _.findWhere($scope.tabs, {id: tabId}).graphName;
          forceResizeEvt();
        };

        function forceResizeEvt() {
          //force resize
          $timeout(function () {
            var event = document.createEvent("HTMLEvents");
            event.initEvent("resize", true, true);
            event.eventName = "resize";
            window.dispatchEvent(event);
          }, 0);
        }

        $scope.loadChromeFs = function () {
          if (config.isChromeApp && $scope.ddf.chromeExternalDdfPath) {
            chrome.fileSystem.chooseEntry({type: 'openDirectory'}, function (entry) {
              chrome.fileSystem.getDisplayPath(entry, function (path) {
                Ddf.chromeFs = WebFS(entry);

                safeApply($scope, function () {
                  Ddf.reset();
                  $scope.chromeFsRootPath = path;
                  $scope.loadMeasures();
                });
              });
            });
          }
        };

        $scope.hasChromeFs = function () {
          return !!Ddf.chromeFs;
        };

        function areMeasuresBadForGo() {
          function areMeasuresBadForGoForBubbleMap() {
            return $scope.ddf.type === 'BubbleMap' && !$scope.ddf.sizeAxis;
          }

          function areMeasuresBadForGoForBubbleAndMountainCharts() {
            return (($scope.ddf.type === 'BubbleChart' || $scope.ddf.type === 'MountainChart') &&
            (!$scope.ddf.xAxis || !$scope.ddf.yAxis || !$scope.ddf.sizeAxis));
          }

          return areMeasuresBadForGoForBubbleMap() || areMeasuresBadForGoForBubbleAndMountainCharts();
        }

        function chromeAppIsBadForGo() {
          return config.isChromeApp && $scope.ddf.chromeExternalDdfPath === 'true' && !$scope.hasChromeFs();
        }

        $scope.cantGo = function () {
          return $scope.ddfError || areMeasuresBadForGo() || chromeAppIsBadForGo();
        };

        $scope.loadMeasures = function (cb) {
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

                    if (cb) {
                      cb();
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
            $scope.newTab();
          }

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
              Vizabi._globals.ext_resources.host = electronUrl;
              Vizabi._globals.ext_resources.preloadPath = '../../preview/data/';
            }

            Vizabi.Tool.define('preload', function (promise) {
              Vizabi._globals.metadata = metadataContent;
              this.model.language.strings.set(this.model.language.id, translationsContent);
              promise.resolve();
            });

            queryObj.data.ddfPath = $scope.ddf.url;
            Vizabi($scope.ddf.type, placeholder, queryObj);
          }, 0);
        };

        $scope.newTab = function (withoutChart) {
          ++$scope.lastTab;

          var tabName = $scope.ddf.types.find(function (type) {
            return type.value === $scope.ddf.type;
          }).name;

          $scope.tabs.push({id: $scope.lastTab, tabName: tabName});
          $scope.setTab($scope.lastTab);

          if (withoutChart !== false) {
            $scope.loadMeasures(function () {
              $scope.openDdf();
            });
          }
        };

        $scope.loadFolderOptions = function () {
          $scope.navCollapsed = false;
          $scope.newTab(false);
          $scope.loadMeasures(function () {
            $scope.ddf.popup = true;
          });
        };

        $scope.closeTab = function (tabId) {
          if (tabId === $scope.currentTab) {
            --$scope.currentTab;
          }
          $scope.tabs = _.without($scope.tabs, _.findWhere($scope.tabs, {id: tabId}));
        };

        $scope.defaults();
        $scope.newTab();
      }]);
};
