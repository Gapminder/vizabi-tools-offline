var Vizabi = require('vizabi');
var Promise = (require('./vizabi-extract-promise')).Promise;
var utils = require('./vizabi-extract-utils');
var ddfUtils = require('./vizabi-ddf-utils');

Vizabi.Reader.extend('ddfcsv', {

  /**
   * Initializes the reader.
   * @param {Object} reader_info Information about the reader
   */
  init: function (reader_info) {
    this._name = 'ddf-csv';
    this._data = [];
    this._ddfPath = reader_info.ddfPath;
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
        ddfUtils.geoProcessing(_this._ddfPath, function () {
          _this._data = _this.getGeoData(_this.queryDescriptor);
          console.log('!GEO DATA', _this._data);
          resolve();
        });
      });
    }

    if (_this.queryDescriptor.type === ddfUtils.MEASURES_TIME) {
      return new Promise(function (resolve) {
        ddfUtils.getIndex(_this._ddfPath).then(function () {
          Promise
            .all(_this.getExpectedMeasures(query))
            .then(function () {
              var result = [];
              var geo = ddfUtils.CACHE.DATA_CACHED['geo-' + _this.queryDescriptor.category];

              _this.queryDescriptor.timeRanges.forEach(function (time) {
                for (var geoIndex = 0; geoIndex < geo.length; geoIndex++) {
                  var line = {
                    'geo': geo[geoIndex].geo,
                    'time': new Date(time)
                  };

                  if (_this.injectMeasureValues(query, line, geoIndex, time) === true) {
                    result.push(line);
                  }
                }
              });

              _this._data = result;

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

  injectMeasureValues: function (query, line, geoIndex, time) {
    var f = 0;
    var measures = this.getMeasuresNames(query);
    var geo = ddfUtils.CACHE.DATA_CACHED['geo-' + this.queryDescriptor.category];

    measures.forEach(function (m) {
      var measureCache = ddfUtils.CACHE.FILE_CACHED[ddfUtils.CACHE.measureFileToName[m]];

      if (measureCache && measureCache[geo[geoIndex].geo]) {
        if (measureCache[geo[geoIndex].geo] && measureCache[geo[geoIndex].geo][time] &&
          measureCache[geo[geoIndex].geo][time][m]) {
          line[m] = Number(measureCache[geo[geoIndex].geo][time][m]);
          f++;
        }
      }
    });

    if (query.select.indexOf('geo.latitude') > 0) {
      line['geo.latitude'] = geo[geoIndex]['geo.latitude'];
      ++f;
    }

    if (query.select.indexOf('geo.longitude') > 0) {
      line['geo.longitude'] = geo[geoIndex]['geo.longitude'];
      ++f;
    }

    return f === measures.length;
  },

  getGeoData: function (queryDescriptor) {
    var adapters = {
      country: function (geoRecord) {
        return {
          geo: geoRecord.geo,
          'geo.name': geoRecord.name,
          'geo.cat': queryDescriptor.category,
          'geo.region': geoRecord.world_4region,
          'geo.latitude': geoRecord.latitude,
          'geo.longitude': geoRecord.longitude
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

    ddfUtils.CACHE.FILE_CACHED[ddfUtils.getIndexEntryPoint(_this._ddfPath)].forEach(function (indexRecord) {
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
});

require('vizabi/build/dist/vizabi.css');
