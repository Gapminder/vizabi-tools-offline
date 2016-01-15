var Promise = (require('./vizabi-extract-promise')).Promise;
var fileFetchers = require('./vizabi-file-fetchers');
var fileFetcher = fileFetchers.genericReader;

var GEO = 1;
var MEASURES_TIME_PERIOD = 2;
var MEASURES_TIME_FIXED = 3;

var CACHE = {
  measureFileToName: {},
  measureNameToFile: {},
  FILE_CACHED: {},
  FILE_REQUESTED: {},
  DATA_CACHED: {}
};

exports.GEO = GEO;
exports.MEASURES_TIME_PERIOD = MEASURES_TIME_PERIOD;
exports.MEASURES_TIME_FIXED = MEASURES_TIME_FIXED;
exports.CACHE = CACHE;

function QueryDescriptor(query) {
  this.query = query;
  this.geoCat = query.where['geo.cat'];
  var result;

  if (query.select.indexOf('geo.name') >= 0 || query.select.indexOf('geo.region') >= 0) {
    this.type = GEO;
    this.category = this.geoCat[0];
  }

  if (!result && query.where && query.where.time) {
    if (query.where.time.length > 0 && query.where.time[0].length === 1) {
      this.type = MEASURES_TIME_FIXED;
      this.category = this.geoCat[0];
      this.timeFrom = Number(query.where.time[0][0]);
      this.timeTo = Number(query.where.time[0][0]);
    }

    if (query.where.time.length > 0 && query.where.time[0].length === 2) {
      this.type = MEASURES_TIME_PERIOD;
      this.category = this.geoCat[0];
      this.timeFrom = Number(query.where.time[0][0]);
      this.timeTo = Number(query.where.time[0][1]);
    }
  }
}

function geoProcessing(ddfPath, dimensionPath, cb) {
  getDimensions(dimensionPath).then(function () {
    Promise
      .all(getDimensionsDetails(ddfPath, dimensionPath))
      .then(function () {
        cb();
      });
  });
}

function getDimensions(dimensionPath) {
  return load(dimensionPath);
}

function getDimensionsDetails(ddfPath, dimensionPath) {
  var expected = [];

  CACHE.FILE_CACHED[dimensionPath].forEach(function (dimensionRecord) {
    if (dimensionRecord.concept !== 'geo' && dimensionRecord.concept !== 'un_state') {
      expected.push(load(ddfPath + '/ddf--list--geo--' + dimensionRecord.concept + '.csv'));
    }
  });

  return expected;
}

function load(path) {
  if (!CACHE.FILE_CACHED.hasOwnProperty(path) && !CACHE.FILE_REQUESTED.hasOwnProperty(path)) {
    fileFetcher(path, function (error, res) {
      if (!res) {
        console.log('No permissions or empty file: ' + path, error);
      }

      if (error) {
        console.log('Error Happened While Loading CSV File: ' + path, error);
      }

      CACHE.FILE_CACHED[path] = measureHashTransformer(CACHE.measureNameToFile[path], res);
      CACHE.FILE_REQUESTED[path].resolve();
    });
  }

  CACHE.FILE_REQUESTED[path] = new Promise();

  return CACHE.FILE_REQUESTED[path];
}

function measureHashTransformer(measure, data) {
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
}

function getIndex(indexPath) {
  return load(indexPath);
}

exports.QueryDescriptor = QueryDescriptor;
exports.geoProcessing = geoProcessing;
exports.getIndex = getIndex;
exports.load = load;
