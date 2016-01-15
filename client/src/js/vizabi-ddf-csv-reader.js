require('d3');
var Vizabi = require('vizabi');
var Promise = (require('./vizabi-extract-promise')).Promise;
var utils = require('./vizabi-extract-utils');
/*var fileReaders = require('./vizabi-file-readers');
 var fileReader = fileReaders.genericReader;*/
var ddfUtils = require('./vizabi-ddf-utils');

Vizabi.Reader.extend('ddfcsv', {

  /**
   * Initializes the reader.
   * @param {Object} reader_info Information about the reader
   */
  init: function (reader_info) {
    this._name = 'ddf-csv';
    this._data = [];
    this._basepath = '/ddf/';
    this._ddfPath = 'https://raw.githubusercontent.com/buchslava/ddf--gapminder--systema_globalis/master';
    this._formatters = reader_info.formatters;
    this.indexPath = this._ddfPath + '/ddf--index.csv';
    this.dimensionPath = this._ddfPath + '/ddf--dimensions.csv';
    this._formatters = reader_info.formatters;
  },

  /**
   * Reads from source
   * @param {Object} query to be performed
   * @param {String} language language
   * @returns a promise that will be resolved when data is read
   */
  read: function (queryPar, language) {
    // todo: add group by processing

    var _this = this;
    var query = utils.deepExtend({}, queryPar);

    _this.queryDescriptor = new ddfUtils.QueryDescriptor(queryPar);

    if (_this.queryDescriptor.type === ddfUtils.GEO) {
      return new Promise(function (resolve) {
        ddfUtils.geoProcessing(_this._ddfPath, _this.dimensionPath, function () {
          _this._data = _this.getGeoData(_this.queryDescriptor);
          console.log('!GEO DATA', _this._data);
          resolve();
        });
      });
    }

    if (_this.queryDescriptor.type === ddfUtils.MEASURES_TIME_PERIOD ||
      _this.queryDescriptor.type === ddfUtils.MEASURES_TIME_FIXED) {

      return new Promise(function (resolve) {
        ddfUtils.getIndex(_this.indexPath).then(function () {
          Promise
            .all(_this.getExpectedMeasures(query))
            .then(function () {
              var result = [];
              var geo = ddfUtils.CACHE.DATA_CACHED['geo-' + _this.queryDescriptor.category];

              var d1 = (new Date(_this.queryDescriptor.timeFrom)).getFullYear();
              var d2 = (new Date(_this.queryDescriptor.timeTo)).getFullYear();

              for (var year = d1; year <= d2; year++) {

                for (var geoIndex = 0; geoIndex < geo.length; geoIndex++) {
                  var line = {
                    'geo': geo[geoIndex].geo,
                    'time': year + ''
                  };

                  if (_this.injectMeasureValues(query, line, geoIndex, year) === true) {
                    result.push(line);
                  }
                }
              }

              _this._data = utils.mapRows(result, _this._formatters);

              console.log('!QUERY', JSON.stringify(query));
              console.log('!OUT DATA', _this._data);
              console.log('!METADATA', Vizabi._globals.metadata);

              resolve();
            });
        });
      });
    }
  },

  /**
   * Gets the data
   * @returns all data
   */
  getData: function () {
    return this._data;
  },

  /*geoProcessing: function (n, cb) {
   var _this = this;
   _this.getDimensions().then(function () {
   Promise
   .all(_this.getDimensionsDetails())
   .then(function () {
   cb();
   });
   });
   },*/

  injectMeasureValues: function (query, line, geoIndex, year) {
    var f = 0;
    var measures = this.getMeasuresNames(query);
    var geo = ddfUtils.CACHE.DATA_CACHED['geo-' + this.queryDescriptor.category];

    measures.forEach(function (m) {
      var measureCache = ddfUtils.CACHE.FILE_CACHED[ddfUtils.CACHE.measureFileToName[m]];

      if (measureCache && measureCache[geo[geoIndex].geo]) {
        if (measureCache[geo[geoIndex].geo] && measureCache[geo[geoIndex].geo][year + ''] &&
          measureCache[geo[geoIndex].geo][year + ''][m]) {
          line[m] = Number(measureCache[geo[geoIndex].geo][year + ''][m]);
          f++;
        }
      }
    });

    return f === measures.length;
  },

  /*getIndex: function () {
   return this.load(this.indexPath);
   },

   getDimensions: function () {
   return this.load(this.dimensionPath);
   },*/

  getGeoData: function (queryDescriptor) {
    var adapters = {
      country: function (geoRecord) {
        return {
          geo: geoRecord.geo,
          'geo.name': geoRecord.name,
          'geo.cat': queryDescriptor.category,
          'geo.region': geoRecord.world_4region
        }
      }
    };

    var expectedGeoData = null;
    for (var k in ddfUtils.CACHE.FILE_CACHED) {
      if (ddfUtils.CACHE.FILE_CACHED.hasOwnProperty(k) &&
        k.indexOf('ddf--list--geo--' + queryDescriptor.category) >= 0) {
        expectedGeoData = ddfUtils.CACHE.FILE_CACHED[k];
        break;
      }
    }

    var result = [];
    if (expectedGeoData !== null) {
      expectedGeoData.forEach(function (d) {
        result.push(adapters[queryDescriptor.category](d));
      });
    }

    ddfUtils.CACHE.DATA_CACHED['geo-' + queryDescriptor.category] = result;
    return result;
  },

  getMeasuresNames: function (query) {
    var res = [];
    query.select.forEach(function (q) {
      if (q !== 'time' && q !== 'geo') {
        res.push(q);
      }
    });

    return res;
  },

  getExpectedMeasures: function (query) {
    var _this = this;
    var expected = [];

    ddfUtils.CACHE.FILE_CACHED[_this.indexPath].forEach(function (indexRecord) {
      // todo: fix condition -> geo
      if (query.select.indexOf(indexRecord.value_concept) >= 0 &&
        (!query.where['geo.cat'] || query.where['geo.cat'].indexOf(indexRecord.geo) >= 0)) {
        var path = _this._ddfPath + '/' + indexRecord.file;
        // todo: swap...
        ddfUtils.CACHE.measureFileToName[indexRecord.value_concept] = path;
        ddfUtils.CACHE.measureNameToFile[path] = indexRecord.value_concept;
        expected.push(ddfUtils.load(path));
      }
    });

    return expected;
  }

  /*getDimensionsDetails: function () {
   var _this = this;
   var expected = [];

   FILE_CACHED[_this.dimensionPath].forEach(function (dimensionRecord) {
   if (dimensionRecord.concept !== 'geo' && dimensionRecord.concept !== 'un_state') {
   expected.push(_this.load(_this._ddfPath + '/ddf--list--geo--' + dimensionRecord.concept + '.csv'));
   }
   });

   return expected;
   },

   _measureHashTransformer: function (measure, data) {
   if (!measure) {
   return data;
   }

   var hash = {};
   data.forEach(function (d) {
   if (!hash[d.geo]) {
   hash[d.geo] = {};
   }

   if (!hash[d.geo][d.year]) {
   hash[d.geo][d.year] = {};
   }

   hash[d.geo][d.year][measure] = d[measure];
   });

   return hash;
   },

   load: function (path) {
   var _this = this;
   if (!ddfUtils.CACHE.FILE_CACHED.hasOwnProperty(path) && !ddfUtils.CACHE.FILE_REQUESTED.hasOwnProperty(path)) {
   fileReader(path, function (error, res) {
   if (!res) {
   console.log('No permissions or empty file: ' + path, error);
   }

   if (error) {
   console.log('Error Happened While Loading CSV File: ' + path, error);
   }

   ddfUtils.CACHE.FILE_CACHED[path] =
   _this._measureHashTransformer(ddfUtils.CACHE.measureNameToFile[path], res);
   ddfUtils.CACHE.FILE_REQUESTED[path].resolve();
   });
   }

   ddfUtils.CACHE.FILE_REQUESTED[path] = new Promise();

   return ddfUtils.CACHE.FILE_REQUESTED[path];
   }*/
});

require('vizabi/build/dist/vizabi.css');

/*function QueryDescriptor(query) {
 var _this = this;
 _this.query = query;
 _this.geoCat = query.where['geo.cat'];
 var result;

 if (query.select.indexOf('geo.name') >= 0 || query.select.indexOf('geo.region') >= 0) {
 _this.type = GEO;
 _this.category = _this.geoCat[0];
 }

 if (!result && query.where && query.where.time) {
 if (query.where.time.length > 0 && query.where.time[0].length === 1) {
 _this.type = MEASURES_TIME_FIXED;
 _this.category = _this.geoCat[0];
 _this.timeFrom = Number(query.where.time[0][0]);
 _this.timeTo = Number(query.where.time[0][0]);
 }

 if (query.where.time.length > 0 && query.where.time[0].length === 2) {
 _this.type = MEASURES_TIME_PERIOD;
 _this.category = _this.geoCat[0];
 _this.timeFrom = Number(query.where.time[0][0]);
 _this.timeTo = Number(query.where.time[0][1]);
 }
 }
 }
 */