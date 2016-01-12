require('d3');
var Promise = (require('./vizabi-extract-promise')).Promise;

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

var EVALALLOWED = null;

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

function geoProcessing(ddfPath, cb) {
  getDimensions(ddfPath).then(function () {
    Promise
      .all(getDimensionsDetails(ddfPath))
      .then(function () {
        cb();
      });
  });
}

function getDimensionsDetails(ddfPath) {
  var expected = [];
  var dimensionPath = getDimensionEntryPoint(ddfPath);

  CACHE.FILE_CACHED[dimensionPath].forEach(function (dimensionRecord) {
    if (dimensionRecord.concept !== 'geo' && dimensionRecord.concept !== 'un_state') {
      expected.push(load(ddfPath + '/ddf--list--geo--' + dimensionRecord.concept + '.csv'));
    }
  });

  return expected;
}

function load(path, cb) {
  // checks if eval() statements are allowed. They are needed for fast parsing by D3.
  if (EVALALLOWED == null) {
    defineEvalAllowed();
  }

  // true:  load using csv, which uses d3.csv.parse, is faster but doesn't comply with CSP
  // false: load using text and d3.csv.parseRows to circumvent d3.csv.parse and comply with CSP
  var loader = (EVALALLOWED) ? d3.csv : d3.text;
  var parser = (EVALALLOWED) ? null : csvToObject;

  loader(path, function (error, res) {
    if (!res) {
      console.log('No permissions or empty file: ' + path, error);
    }

    if (error) {
      console.log('Error Happened While Loading CSV File: ' + path, error);
    }

    if (parser) {
      res = parser(res);
    }

    if (cb) {
      cb(error, res);
    }

    if (!cb) {
      // todo move measureHashTransformer ...
      CACHE.FILE_CACHED[path] = measureHashTransformer(CACHE.measureNameToFile[path], res);
      CACHE.FILE_REQUESTED[path].resolve();
    }
  });

  if (!cb) {
    CACHE.FILE_REQUESTED[path] = new Promise();
    return CACHE.FILE_REQUESTED[path];
  }
}

function defineEvalAllowed() {
  try {
    new Function("", "");
    EVALALLOWED = true;
  } catch (ignore) {
    // Content-Security-Policy does not allow "unsafe-eval".
    EVALALLOWED = false;
  }
}

// parsing csv string to an object, circumventing d3.parse which uses eval unsafe new Function() which doesn't comply with CSP
// https://developer.chrome.com/apps/contentSecurityPolicy
// https://github.com/mbostock/d3/pull/1910
function csvToObject(res) {
  var header;
  return (res == null) ? null : d3.csv.parseRows(res, function (row, i) {
    if (i) {
      var o = {}, j = -1, m = header.length;
      while (++j < m) o[header[j]] = row[j];
      return o;
    }
    header = row;
  });
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

function getIndexEntryPoint(ddfUrl) {
  return ddfUrl + '/ddf--index.csv';
}

function getIndex(ddfUrl) {
  return load(getIndexEntryPoint(ddfUrl));
}

function getMeasuresEntryPoint(ddfUrl) {
  return ddfUrl + '/ddf--measures.csv';
}

function getMeasures(ddfUrl, cb) {
  return load(getMeasuresEntryPoint(ddfUrl), cb);
}

function getDimensionEntryPoint(ddfPath) {
  return ddfPath + '/ddf--dimensions.csv';
}

function getDimensions(ddfPath, cb) {
  return load(getDimensionEntryPoint(ddfPath), cb);
}

exports.QueryDescriptor = QueryDescriptor;
exports.geoProcessing = geoProcessing;
exports.getIndexEntryPoint = getIndexEntryPoint;
exports.getIndex = getIndex;
exports.getMeasuresEntryPoint = getMeasuresEntryPoint;
exports.getMeasures = getMeasures;
exports.getDimensionEntryPoint = getDimensionEntryPoint;
exports.getDimensions = getDimensions;
exports.load = load;
