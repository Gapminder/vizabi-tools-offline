require('d3');
var async = require('async');
var Vizabi = require('vizabi');
if (!!(typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest)) {
  Vizabi._globals.gapminder_paths.baseUrl = chrome.runtime.getURL('');
} else {
  Vizabi._globals.gapminder_paths.baseUrl = '/tools/api/static/';
}


var FILE_CACHED$2 = {}; //caches files from this reader

Vizabi.Reader.extend('safe-csv', {

  /**
   * Initializes the reader.
   * @param {Object} reader_info Information about the reader
   */
  init: function(reader_info) {
    console.log('reader info:');
    console.log(reader_info);
    this._name = 'test-csv';
    this._data = [];
    this._basepath = reader_info.path;
    this._geoPath = reader_info.geoPath;
    this._formatters = reader_info.formatters;
    if(!this._basepath) {
      console.log("Missing base path for json reader");
    };
  },

  /**
   * Reads from source
   * @param {Object} query to be performed
   * @param {String} language language
   * @returns a promise that will be resolved when data is read
   */
  read: function(query, language) {
    var _this = this;
    var path = this._basepath.replace("{{LANGUAGE}}", language);
    _this._data = [];

    return new Promise(function(resolve) {
      //if cached, retrieve and parse
      if(FILE_CACHED$2.hasOwnProperty(path)) {
        parse(FILE_CACHED$2[path]);
      }
      //if not, request and parse
      else {
        var xhr = new XMLHttpRequest();
        xhr.responseType = 'text';
        xhr.open('GET', path, true);

        xhr.onreadystatechange = function () {
          if (xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) {
            getGeoData(_this._geoPath, function(err, geoData) {
              var graphData = parseCsv(xhr.response);
              graphData = mergeGeoIntoGraphData(geoData, graphData);
              var res = format([graphData]);
              //cache and resolve
              FILE_CACHED$2[path] = res;
              parse(res);
            });
          } else if (xhr.readyState == XMLHttpRequest.DONE) {
            console.log('can\'t load file');
          }
        };
        xhr.send();
      }

      function format(res) {
        //TODO: Improve local json filtering
        //make category an array and fix missing regions
        res = res[0].map(function(row) {
          row['geo.cat'] = [row['geo.cat']];
          row['geo.region'] = row['geo.region'] || row['geo'];
          return row;
        });

        //format data
        res = mapRows(res, _this._formatters);

        //TODO: fix this hack with appropriate ORDER BY
        //order by formatted
        //sort records by time
        var keys = Object.keys(_this._formatters);
        var order_by = keys[0];
        res.sort(function(a, b) {
          return a[order_by] - b[order_by];
        });
        //end of hack

        return res;
      }

      function getGeoData(path, cb) {
        var geoXhr = new XMLHttpRequest();
        geoXhr.responseType = 'json';
        geoXhr.open('GET',  path, true);
        geoXhr.onreadystatechange = function () {
          if (geoXhr.readyState == XMLHttpRequest.DONE && geoXhr.status == 200) {
            cb(false, geoXhr.response);
          } else if (geoXhr.readyState == XMLHttpRequest.DONE) {
            console.log('can\'t load geo data');
          }
        };
        geoXhr.send();
      }

      function mergeGeoIntoGraphData(geoData, graphData) {
        var geoHash  = {};
        for (var j = 0; j < geoData.length; j++) {
          geoHash[geoData[j].geo]= geoData[j];
        }

        for (var i = 0; i < graphData.length; i++) {
          graphData[i].time = graphData[i].time + '';
          if (typeof geoHash[graphData[i].geo] === 'undefined') {
            //todo: log it
            continue;
          }
          graphData[i]['geo.name'] = geoHash[graphData[i].geo]['geo.name'];
          graphData[i]['geo.cat'] = geoHash[graphData[i].geo]['geo.cat'];
          graphData[i]['geo.region'] = geoHash[graphData[i].geo]['geo.region'];
          graphData[i]['geo.lat'] = geoHash[graphData[i].geo]['geo.lat'];
          graphData[i]['geo.lng'] = geoHash[graphData[i].geo]['geo.lng'];
          //todo: fix csv parser if delimiter present in string value
        }

        return graphData;
      }

      function parse(res) {
        _this._data = res;
        resolve();
      }

      var mapRows = function(original, formatters) {
        function mapRow(value, fmt) {
          if(!isArray(value)) {
            return fmt(value);
          } else {
            var res = [];
            for(var i = 0; i < value.length; i++) {
              res[i] = mapRow(value[i], fmt);
            }
            return res;
          }
        }

        var columns = Object.keys(formatters);
        var columns_s = columns.length;
        original = original.map(function(row) {
          for(var i = 0; i < columns_s; i++) {
            var col = columns[i],
              new_val;
            if(row.hasOwnProperty(col)) {
              try {
                new_val = mapRow(row[col], formatters[col]);
              } catch(e) {
                new_val = row[col];
              }
              row[col] = new_val;
            }
          }
          return row;
        });
        return original;
      };

      var isArray = Array.isArray || function(obj) {
        return toString.call(obj) === '[object Array]';
      };

      function parseCsv(csv) {
        var lines=csv.split("\n");
        var result = [];
        var headers=lines[0].split(",");

        for(var i=1;i<lines.length;i++){
          if (!lines[i]) {
            continue;
          }
          var obj = {};
          var currentline=lines[i].split(",");
          for(var j=0;j<headers.length;j++){
            obj[headers[j]] = currentline[j];
          }
          result.push(obj);
        }

        //return result;
        return parseCsvTest(csv); //JavaScript object
      }

      function parseCsvTest(csvString) {
        // The array we're going to build
        var csvArray   = [];
        // Break it into rows to start
        var csvRows    = csvString.split(/\n/);
        // Take off the first line to get the headers, then split that into an array
        var csvHeaders = csvRows.shift().split(',');

        if (csvRows[csvRows.length -1] === '') {
          csvRows.pop();
        }
        // Loop through remaining rows
        for(var rowIndex = 0; rowIndex < csvRows.length; ++rowIndex){
          var rowArray  = csvRows[rowIndex].split(',');

          // Create a new row object to store our data.
          var rowObject = csvArray[rowIndex] = {};

          // Then iterate through the remaining properties and use the headers as keys
          for(var propIndex = 0; propIndex < rowArray.length; ++propIndex){
            // Grab the value from the row array we're looping through...
            var propValue =   rowArray[propIndex].replace(/^"|"$/g,'');
            // ...also grab the relevant header (the RegExp in both of these removes quotes)
            var propLabel = csvHeaders[propIndex].replace(/^"|"$/g,'');

            //if (propValue && !(propLabel in stringProperties) && typeof propValue !== 'number') {
            //  propValue = +propValue;
            //}

            rowObject[propLabel] = propValue;
          }
        }

        return csvArray;
      }

    });
  },

  /**
   * Gets the data
   * @returns all data
   */
  getData: function() {
    return this._data;
  }
});


require('vizabi/build/dist/vizabi.css');

