var d3 = require('d3');
var Vizabi = require('vizabi');
var urlon = require('URLON');
var async = require('async');

module.exports = function (app) {
  var bases = document.getElementsByTagName('base');
  var baseHref = null;
  if (bases.length > 0) {
    baseHref = bases[0].href;
  }

  function formatDate(date, unit) {
    var timeFormats = {
      "year": d3.time.format("%Y"),
      "month": d3.time.format("%Y-%m"),
      "week": d3.time.format("%Y-W%W"),
      "day": d3.time.format("%Y-%m-%d"),
      "hour": d3.time.format("%Y-%m-%d %H"),
      "minute": d3.time.format("%Y-%m-%d %H:%M"),
      "second": d3.time.format("%Y-%m-%d %H:%M:%S")
    };
    return timeFormats[unit](date);
  }

  function formatDates(state) {
    // Format date objects according to the unit
    if(state && state.time) {
      var unit = state.time.unit || "year";
      if(typeof state.time.value === 'object') {
        state.time.value = formatDate(state.time.value, unit);
      }
      if(typeof state.time.start === 'object') {
        state.time.start = formatDate(state.time.start, unit);
      }
      if(typeof state.time.end === 'object') {
        state.time.end = formatDate(state.time.end, unit);
      }
    }
  }

  app
    .factory("vizabiFactory", ['config', 'readerService', 'combineDataService',
      function (config, readerService, combineDataService) {
        return {
          /**
           * Render Vizabi
           * @param {String} tool name of the tool
           * @param {DOMElement} placeholder
           * @return {Object}
           */
          render: function (tool, placeholder, options) {
            return Vizabi(tool, placeholder, options);
          }
        };
      }]);


  app
    .factory("vizabiItems", ['$http', 'config', function ($http, config) {

      return {
        /**
         * Get All Items
         */
        getItems: function () {
          var promiseCb =  function  (result) {
            var items = {}, i, s;
            for (i = 0, s = result.data.length; i < s; i++) {
              items[result.data[i].slug] = result.data[i];
            }
            return items;
          };

          if (config.isElectronApp || config.isChromeApp) {
            var promise = new Promise(function(resolve) {
              var result = {
                data: itemXhrResult
              };
              resolve(result);
            });

            return promise.then(promiseCb);
          }

          //return the promise directly.
          return $http.get(config.apiUrl + '/item')
            .then(promiseCb);
        }
      };

    }]);

  app
    .factory('menuFactory', [
      '$location', '$q', '$http', 'config',
      function ($location, $q, $http, config) {

        return {
          cached: [],

          /**
           * Get All Items
           */
          getMenu: function () {
            //return the promise directly.
            var _this = this;
            //in chrome app we have to use full url, (or maybe use interceptor?)
            //also we can use some global var(defined by webpack), so if it is true - use full url( get it from manifest),
            //if not - use only path (e.g. /api/item)
            return $http.get(config.apiUrl + '/menu')
              .then(function (result) {
                console.log('/menu result');
                console.log(JSON.stringify(result.data));
                if (result.status === 200) {
                  _this.cached = result.data.children;
                }
                return _this.getCachedMenu();
              });
          },

          /**
           * Returns the home tree data.
           * @returns {}
           */
          getCachedMenu: function () {
            return this.cached;
          },

          /**
           * Returns the current URL.
           * @returns {string}
           */
          getCurrentUrl: function () {
            return $location.$$path;
          }
        };
      }]);
};

//temp data for Electron app
var itemXhrResult = [
  {
    "_id":"55f70fd5dbbfabe3d6a2753f",
    "description":"This graph shows the amount of people in the world across each income level.",
    "opts":{
      "data":{
        "path":"//waffles.gapminderdev.org/api/graphs/stats/vizabi-tools",
        "reader":"graph"
      },
      "ui":{
        "buttons":[
          "find",
          "colors",
          "stack",
          "axesmc",
          "show",
          "fullscreen"
        ],
        "buttons_expand":[
          "colors",
          "find",
          "stack"
        ]
      }
    },
    "tool":"MountainChart",
    "slug":"mountain",
    "category":"Tools",
    //"image":"/tools/public/images/tools/mountainchart.png",
    "image":"public/images/tools/mountainchart.png",
    "title":"Mountain Chart",
    "__v":5
  },
  {
    "_id":"55f71e8ccdedc1ff074e9f6d",
    "description":"This graph shows how long people live and how much money they earn. Click the play button to see how countries have developed since 1800.",
    "opts":{
      "data":{
        "path":"//waffles.gapminderdev.org/api/graphs/stats/vizabi-tools",
        "reader":"graph"
      },
      "ui":{
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
    },
    "tool":"BubbleChart",
    "slug":"bubbles",
    //"image":"/tools/public/images/tools/bubblechart.png",
    "image": "public/images/tools/bubblechart.png",
    "category":"Tools",
    "title":"Bubble Chart",
    "__v":4
  }
];
