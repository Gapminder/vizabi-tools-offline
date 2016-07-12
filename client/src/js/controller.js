var Vizabi = require('vizabi');
var Ddf = require('vizabi-ddfcsv-reader').Ddf;
var DDFCSVReader = require('vizabi-ddfcsv-reader').DDFCSVReader;
var ChromeFileReader = require('vizabi-ddfcsv-reader').ChromeFileReader;
var FrontendFileReader = require('vizabi-ddfcsv-reader').FrontendFileReader;
var async = require('async');
var _ = require('lodash');
var path = require('path');
var formatJson = require('format-json');
var WebFS = require('web-fs');
var MetadataGenerator = require('vizabi-metadata-generator').MetadataGenerator;

var mainQueryTemplate = require('./templates/query').mainQueryTemplate;
var entitiesQueryTemplate = require('./templates/query').entitiesQueryTemplate;
var ddfExtra = {
  chromeFs: null
};

function safeApply(scope, fn) {
  var phase = scope.$root.$$phase;
  if (phase == '$apply' || phase == '$digest') {
    scope.$eval(fn);
  } else {
    scope.$apply(fn);
  }
}

function prepareMetadataByFiles(metadataUrl, translationsUrl) {
  return function (cb) {
    var loader = ddfExtra.chromeFs ? chromeLoad : xhrLoad;

    loader(metadataUrl, function (metadata) {
      loader(translationsUrl, function (translations) {
        var ddfError = '';
        var metadataContent = null;
        var translationsContent = null;

        try {
          metadataContent = JSON.parse(metadata);
        } catch (e) {
          ddfError = 'Wrong JSON format for metadata: ' + e;
        }

        try {
          translationsContent = JSON.parse(translations);
        } catch (e) {
          ddfError += '\nWrong JSON format for translations: ' + e;
        }

        cb(ddfError, metadataContent, translationsContent);
      });
    });
  };
}

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
  ddfExtra.chromeFs.readFile(path, '', function (err, file) {
    if (err) {
      console.log(err);
    }

    cb(file);
  });
}

function prepareMetadataOnFly(ddfUrl) {
  return function (cb) {
    var metadataGenerator = new MetadataGenerator(ddfUrl.replace(/^file:/, ''));
    console.log(ddfUrl.replace(/^file:/, ''));

    metadataGenerator.generate(function (err, metadataDescriptor) {
      cb(err, metadataDescriptor.metadata, metadataDescriptor.translations);
    });
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
          diagnostic: false,
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
          ddfExtra.chromeFs = null;
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
                ddfExtra.chromeFs = WebFS(entry);

                safeApply($scope, function () {
                  // Ddf.reset();
                  $scope.chromeFsRootPath = path;
                  $scope.loadMeasures();
                });
              });
            });
          }
        };

        $scope.hasChromeFs = function () {
          return !!ddfExtra.chromeFs;
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

          var ddf = new Ddf($scope.ddf.url,
            ddfExtra.chromeFs ? new ChromeFileReader() : new FrontendFileReader());

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

              var metadataLoader =
                !$scope.ddf.metadataUrl.trim() ? prepareMetadataOnFly($scope.ddf.url) :
                  prepareMetadataByFiles($scope.ddf.metadataUrl, $scope.ddf.translationsUrl);

              $scope.ddf.progress = true;
              metadataLoader(function (error, metadata, translations) {
                safeApply($scope, function () {
                  $scope.ddf.progress = false;

                  if (error) {
                    $scope.ddfError = error;
                    return;
                  }

                  metadataContent = metadata;
                  translationsContent = translations;

                  if (cb) {
                    cb();
                  }
                });
              });
            });
          });
        };

        $scope.closeDdf = function () {
          $scope.ddf.popup = false;
        };

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


            var ddfCsvReader = new DDFCSVReader('ddf1-csv-ext').getDDFCsvReaderObject(ddfExtra.chromeFs);
            Vizabi.Reader.extend('ddf1-csv-ext', ddfCsvReader);

            if (config.isElectronApp) {
              Vizabi._globals.ext_resources.host = electronUrl;
              Vizabi._globals.ext_resources.preloadPath = '../../preview/data/';
            }

            Vizabi.Tool.define('preload', function (promise) {
              Vizabi._globals.metadata = metadataContent;
              this.model.language.strings.set(this.model.language.id, translationsContent);
              promise.resolve();
            });

            $scope.vizabiQuery = queryObj;
            $scope.metadata = metadataContent;
            $scope.translations = translationsContent;

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

        $scope.openDiagnostic = function () {
          $scope.navCollapsed = false;
          $scope.ddf.diagnostic = true;
        };

        $scope.closeDiagnostic = function () {
          $scope.ddf.diagnostic = false;
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
