var Vizabi = require('vizabi');
var async = require('async');
var _ = require('lodash');

var ddfUtils = require('./vizabi-ddf-utils');
var queryTemplate = require('./templates/query').queryTemplate;
var metadataTemplate = require('./templates/metadata').metadataTemplate;
var translationsTemplate = require('./templates/translations').translationsTemplate;
var queryForCsvReader = require('./templates/query-for-csv-reader').queryForCsvReader;

function safeApply(scope, fn) {
  var phase = scope.$root.$$phase;
  if (phase == '$apply' || phase == '$digest') {
    scope.$eval(fn);
  } else {
    scope.$apply(fn);
  }
}

function getRandomColor() {
  var letters = '0123456789ABCDEF'.split('');
  var color = '#';
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

function getColorized(what, index) {
  var options = ['#ff5872', '#ffe700', '#7feb00', '#00d5e9', '#ffb600', '#ff5178', '#fbdd00',
    '#5de200', '#00c8ec', '#ffaa14', '#ff658a', '#fff400', '#81f201', '#00e1ec', '#ffc500',
    '#da0025', '#fbaf09', '#00b900', '#0098df', '#fb6d19', '#fa4e73', '#ffe700', '#b5ea32',
    '#77dff7', '#ffb600', '#b2043a', '#b17f4a', '#008d36', '#0586c6', '#9b4838'
  ];
  var color = index < options.length ? options[index] : getRandomColor();
  return {
    key: what,
    value: color
  };
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

        if (config.isElectronApp) {
          console.log('is electron app');
          var path = require('path');
          var remote = require('remote');
          var app = remote.require('app');
          var electronPath = app.getAppPath();

          Vizabi._globals.gapminder_paths.baseUrl = path.join(electronPath, 'client/dist/tools/public/fixtures/');

          Vizabi.Tool.define("preload", function (promise) {
            console.log('preload start');
            var vizabiContext = this;
            async.parallel([
                function (callback) {
                  readerService.getFile({
                    path: path.join(electronPath, 'client/dist/tools/public/fixtures/waffles/metadata.json'),
                    type: 'json'
                  }, callback);
                },
                function (callback) {
                  readerService.getFile({
                    path: path.join(electronPath, 'client/src/public/fixtures/translation/en.json'),
                    type: 'json'
                  }, callback);
                }
              ],
              function (err, results) {
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
          url: 'https://raw.githubusercontent.com/valor-software/ddf--gapminder--systema_globalis/master',
          // url: 'http://localhost:2000/ddf--sodertornsmodellen--testing2016',
          type: 'BubbleChart',
          types: [
            {value: 'BubbleChart', name: 'Bubble Chart'},
            {value: 'MountainChart', name: 'Mountain Chart'},
            {value: 'BubbleMap', name: 'Bubble Map'}
          ],
          measures: [],
          dimensions: [],
          popup: false,
          xAxis: '',
          yAxis: '',
          sizeAxis: '',
          geoChart: 'geo.country',
          geoColors: 'geo.world_4region',
          // geoChart: 'geo.basomrade',
          // geoColors: 'geo.kommun',
          colorized: {},
          currentTime: '2012',
          endTime: '2017'
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
          ddfUtils.getDimensions($scope.ddf.url, function (err, result) {
            if (err) {
              console.log(err);
              return;
            }

            $scope.ddf.dimensions = result;

            ddfUtils.getMeasures($scope.ddf.url, function (err, result) {
              if (err) {
                console.log(err);
                return;
              }

              $scope.ddf.measures = result.filter(function (v) {
                return !!v.measure;
              });

              var s = $scope.ddf.geoColors.split('.');
              ddfUtils.getData($scope.ddf.url, s[0], s[1], function (err, result) {
                if (err) {
                  console.log(err);
                  return;
                }

                safeApply($scope, function () {
                  $scope.ddf.colorized = {};
                  result.forEach(function (r, i) {
                    var c = getColorized(r[s[0]], i);
                    $scope.ddf.colorized[c.key] = c.value;
                  });
                  $scope.ddf.colorized['_default'] = "#ffb600";
                  $scope.ddf.popup = true;
                });
              });
            });
          });
        };

        $scope.closeDdf = function () {
          $scope.ddf.popup = false;
        };

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
              queryObj.state.marker.size.which = $scope.ddf.sizeAxis;
            }

            var s = $scope.ddf.geoChart.split('.');
            queryObj.state.entities.show['geo.cat'] = [s[1]];
            queryObj.state.marker.color.palette = $scope.ddf.colorized;
            queryObj.state.marker.color.which = $scope.ddf.geoColors;
            queryObj.state.time.end = $scope.ddf.endTime;
            queryObj.state.time.value = $scope.ddf.currentTime;

            $scope.ddf.dimensions.forEach(function (dimension) {
              var name = dimension.type === 'dimension' ?
                dimension.concept : dimension.subdim_of + '.' + dimension.concept;
              metadataTemplate.indicatorsDB[name] = {
                allowCharts: ['*'],
                use: 'property',
                unit: '',
                scales: ['ordinal'],
                sourceLink: dimension.link || ''
              };
            });

            var measuresPlain = [];
            $scope.ddf.measures.forEach(function (measure) {
              measuresPlain.push(measure.measure);
              metadataTemplate.indicatorsDB[measure.measure] = {
                allowCharts: ['mountainchart', 'bubblechart', 'bubblemap'],
                use: 'indicator',
                unit: measure.unit,
                scales: ['linear'],
                sourceLink: ''
              };
              // todo: temporary solution: consider real
              metadataTemplate.indicatorsTree.children[2].children.push({
                id: measure.measure
              });

              translationsTemplate['indicator/' + measure.measure] = measure.name;
              translationsTemplate['unit/' + measure.unit] = measure.unit;
            });

            metadataTemplate.indicatorsDB._default = {
              allowCharts: ['*'],
              use: 'constant',
              unit: '',
              scales: ['ordinal'],
              sourceLink: ''
            };

            var colorContains = [
              {
                obj: metadataTemplate.color.shades,
                content: {
                  "fill1": 0,
                  "fill2": 1,
                  "fill3": 2,
                  "shade": 3,
                  "print_fill": 4,
                  "print_stroke": 5,
                  "_default": 0
                }
              },
              {
                obj: metadataTemplate.color.selectable,
                content: false
              },
              {
                obj: metadataTemplate.indicatorsDB,
                content: {
                  "allowCharts": ["*"],
                  "use": "property",
                  "unit": "",
                  "scales": ["ordinal"],
                  "sourceLink": ""
                }
              }
            ];
            colorContains.forEach(function (o) {
              o.obj[$scope.ddf.geoColors] = o.content;
            });
            metadataTemplate.indicatorsTree.children[1].children.push({id: $scope.ddf.geoColors});
            metadataTemplate.color.palettes[$scope.ddf.geoColors] = $scope.ddf.colorized;
            $scope.ddf.popup = false;

            Vizabi.Tool.define('preload', function (promise) {
              Vizabi._globals.metadata = metadataTemplate;
              Vizabi._globals.metadata.indicatorsArray = measuresPlain;
              this.model.language.strings.set(this.model.language.id, translationsTemplate);
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
