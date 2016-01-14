require('d3');
var Vizabi = require('vizabi');
Vizabi._globals.gapminder_paths.baseUrl = '/ddf/';

var FILE_CACHED = {};
var FILE_REQUESTED = {};
var DATA_CACHED = {};
var CACHE = {
  measureFileToName: {},
  measureNameToFile: {}
};

var GEO = 1;
var MEASURES_TIME_PERIOD = 2;
var MEASURES_TIME_FIXED = 3;

function parseCSVToObject(csv) {
  var chars = csv.split('');
  var c = 0;
  var cc = chars.length;
  var start, end;
  var table = [];
  var row;

  while (c < cc) {
    row = [];
    table.push(row);

    while (c < cc && '\r' !== chars[c] && '\n' !== chars[c]) {
      start = end = c;

      if ('"' === chars[c]) {
        start = end = ++c;

        while (c < cc) {
          if ('"' === chars[c]) {
            if ('"' !== chars[c + 1]) {
              break;
            } else {
              chars[++c] = '';
            }
          }

          end = ++c;
        }

        if ('"' === chars[c]) {
          ++c;
        }

        while (c < cc && '\r' !== chars[c] && '\n' !== chars[c] && ',' !== chars[c]) {
          ++c;
        }
      } else {
        while (c < cc && '\r' !== chars[c] && '\n' !== chars[c] && ',' !== chars[c]) {
          end = ++c;
        }
      }

      row.push(chars.slice(start, end).join(''));

      if (',' === chars[c]) {
        ++c;
      }
    }

    if ('\r' === chars[c]) {
      ++c;
    }

    if ('\n' === chars[c]) {
      ++c;
    }
  }

  var header = table[0];

  var result = [];
  for (var i = 1; i < table.length; i++) {
    var row = {};
    for (var j = 0; j < header.length; j++) {
      row[header[j]] = table[i][j];
    }
    result.push(row);
  }

  return result;
}

function QueryDescriptor(query) {
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

// todo: this is Vizabi's code, remove it later
///////////////////////////////////////////////

function Promise(resolver) {
  if (!(this instanceof Promise)) {
    return new Promise(resolver);
  }
  this.status = 'pending';
  this.value;
  this.reason;
  // then may be called multiple times on the same promise
  this._resolves = [];
  this._rejects = [];
  if (isFn(resolver)) {
    resolver(this.resolve.bind(this), this.reject.bind(this));
  }
  return this;
}

Promise.prototype.then = function (resolve, reject) {
  var next = this._next || (this._next = Promise());
  var status = this.status;
  var x;
  if ('pending' === status) {
    isFn(resolve) && this._resolves.push(resolve);
    isFn(reject) && this._rejects.push(reject);
    return next;
  }
  if ('resolved' === status) {
    if (!isFn(resolve)) {
      next.resolve(resolve);
    } else {
      try {
        x = resolve(this.value);
        resolveX(next, x);
      } catch (e) {
        this.reject(e);
      }
    }
    return next;
  }
  if ('rejected' === status) {
    if (!isFn(reject)) {
      next.reject(reject);
    } else {
      try {
        x = reject(this.reason);
        resolveX(next, x);
      } catch (e) {
        this.reject(e);
      }
    }
    return next;
  }
};
Promise.prototype.resolve = function (value) {
  if ('rejected' === this.status) {
    throw Error('Illegal call.');
  }
  this.status = 'resolved';
  this.value = value;
  this._resolves.length && fireQ(this);
  return this;
};
Promise.prototype.reject = function (reason) {
  if ('resolved' === this.status) {
    throw Error('Illegal call. ' + reason);
  }
  this.status = 'rejected';
  this.reason = reason;
  this._rejects.length && fireQ(this);
  return this;
};
// shortcut of promise.then(undefined, reject)
Promise.prototype.catch = function (reject) {
  return this.then(void 0, reject);
};
// return a promise with another promise passing in
Promise.cast = function (arg) {
  var p = Promise();
  if (arg instanceof Promise) {
    return resolvePromise(p, arg);
  } else {
    return Promise.resolve(arg);
  }
};
// return a promise which resolved with arg
// the arg maybe a thanable object or thanable function or other
Promise.resolve = function (arg) {
  var p = Promise();
  if (isThenable(arg)) {
    return resolveThen(p, arg);
  } else {
    return p.resolve(arg);
  }
};
// accept a promises array,
// return a promise which will resolsed with all promises's value,
// if any promise passed rejectd, the returned promise will rejected with the same reason
Promise.all = function (promises) {
  var len = promises.length;
  var promise = Promise();
  var r = [];
  var pending = 0;
  var locked;
  var test = promises;
  //modified
  promises.forEach(function (p, i) {
    p.then(function (v) {
      r[i] = v;
      if ((pending += 1) === len && !locked) {
        promise.resolve(r);
      }
    }, function (e) {
      locked = true;
      promise.reject(e);
    });
  });
  return promise;
};
// accept a promises array,
// return a promise which will resolsed with the first resolved promise passed,
// if any promise passed rejectd, the returned promise will rejected with the same reason
Promise.any = function (promises) {
  var promise = Promise();
  var called;
  //modified
  promises.forEach(function (p, i) {
    p.then(function (v) {
      if (!called) {
        promise.resolve(v);
        called = true;
      }
    }, function (e) {
      called = true;
      promise.reject(e);
    });
  });
  return promise;
};
// return a promise which reject with reason
// reason must be an instance of Error object
Promise.reject = function (reason) {
  if (!(reason instanceof Error)) {
    throw Error('reason must be an instance of Error');
  }
  var p = Promise();
  p.reject(reason);
  return p;
};

function resolveX(promise, x) {
  if (x === promise) {
    promise.reject(new Error('TypeError'));
  }
  if (x instanceof Promise) {
    return resolvePromise(promise, x);
  } else if (isThenable(x)) {
    return resolveThen(promise, x);
  } else {
    return promise.resolve(x);
  }
}

function resolvePromise(promise1, promise2) {
  var status = promise2.status;
  if ('pending' === status) {
    promise2.then(promise1.resolve.bind(promise1), promise1.reject.bind(promise1));
  }
  if ('resolved' === status) {
    promise1.resolve(promise2.value);
  }
  if ('rejected' === status) {
    promise1.reject(promise2.reason);
  }
  return promise;
}

function resolveThen(promise, thanable) {
  var called;
  var resolve = once(function (x) {
    if (called) {
      return;
    }
    resolveX(promise, x);
    called = true;
  });
  var reject = once(function (r) {
    if (called) {
      return;
    }
    promise.reject(r);
    called = true;
  });
  try {
    thanable.then.call(thanable, resolve, reject);
  } catch (e) {
    if (!called) {
      throw e;
    } else {
      promise.reject(e);
    }
  }
  return promise;
}

function fireQ(promise) {
  var status = promise.status;
  var queue = promise['resolved' === status ? '_resolves' : '_rejects'];
  var arg = promise['resolved' === status ? 'value' : 'reason'];
  var fn;
  var x;
  while (fn = queue.shift()) {
    x = fn.call(promise, arg);
    x && resolveX(promise._next, x);
  }
  return promise;
}

function noop() {
}

function isFn(fn) {
  return 'function' === type(fn);
}

function isObj(o) {
  return 'object' === type(o);
}

function type(obj) {
  var o = {};
  return o.toString.call(obj).replace(/\[object (\w+)\]/, '$1').toLowerCase();
}

function isThenable(obj) {
  return obj && obj.then && isFn(obj.then);
}

function once(fn) {
  var called;
  var r;
  return function () {
    if (called) {
      return r;
    }
    called = true;
    return r = fn.apply(this, arguments);
  };
}

var isArray = Array.isArray || function (obj) {
    return toString.call(obj) === '[object Array]';
  };

function mapRows(original, formatters) {

  function mapRow(value, fmt) {
    if (!isArray(value)) {
      return fmt(value);
    } else {
      var res = [];
      for (var i = 0; i < value.length; i++) {
        res[i] = mapRow(value[i], fmt);
      }
      return res;
    }
  }

  var columns = Object.keys(formatters);
  var columns_s = columns.length;
  original = original.map(function (row) {
    for (var i = 0; i < columns_s; i++) {
      var col = columns[i], new_val;

      if (row.hasOwnProperty(col)) {
        try {
          new_val = mapRow(row[col], formatters[col]);
        } catch (e) {
          console.log(e.message, e.stack);
          new_val = row[col];
        }
        row[col] = new_val;
      }
    }
    return row;
  });

  return original;
}

///////////////////////////////////////////////

Vizabi.Reader.extend('ddfcsv', {

  /**
   * Initializes the reader.
   * @param {Object} reader_info Information about the reader
   */
  init: function (reader_info) {
    this._name = 'ddf-csv';
    this._data = [];
    this._basepath = reader_info.path;
    //this._ddfPath = 'https://raw.githubusercontent.com/open-numbers/ddf--gapminder--systema_globalis/master';
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
  read: function (query, language) {
    // todo: add groupby processing

    var _this = this;

    if (query.where) {
      query.where = mapRows([query.where], _this._formatters)[0];
    }
    console.log(query);

    _this.queryDescriptor = new QueryDescriptor(query);

    if (_this.queryDescriptor.type === GEO) {
      return new Promise(function (resolve) {
        console.log(0);
        _this.geoProcessing(1, function () {
          console.log(1);
          _this._data = _this.getGeoData(_this.queryDescriptor);
          console.log('!GEO DATA', _this._data);
          resolve();
        });
      });
    }

    if (_this.queryDescriptor.type === MEASURES_TIME_PERIOD ||
      _this.queryDescriptor.type === MEASURES_TIME_FIXED) {

      return new Promise(function (resolve) {
        console.log(2);
        //_this.geoProcessing(2, function () {
          console.log(3);
          _this.getIndex().then(function () {
            Promise
              .all(_this.getExpectedMeasures(query))
              .then(function () {
                var result = [];
                var geo = DATA_CACHED['geo-' + _this.queryDescriptor.category];

                //console.log(_this.queryDescriptor.timeFrom, _this.queryDescriptor.timeTo, JSON.stringify(_this.queryDescriptor.query));

                for (var year = 1800; year <= 2015; year++) {

                  //for (var year = _this.queryDescriptor.timeFrom;
                  // year <= _this.queryDescriptor.timeTo; year++) {

                  for (var geoIndex = 0; geoIndex < geo.length; geoIndex++) {
                    var line = {
                      'geo': geo[geoIndex].geo,
                      //'time': new Date(year + '')
                      'time': year + ''
                    };

                    if (_this.injectMeasureValues(query, line, geoIndex, year) === true) {
                      result.push(line);
                    }
                  }
                }

                _this._data = _this.format(result);

                console.log('!QUERY', JSON.stringify(query));
                console.log('!OUT DATA', _this._data);
                console.log('!METADATA', Vizabi._globals.metadata);

                resolve();
              });
          });
        //});
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

  format: function (res) {
    var _this = this;

    //make category an array and fix missing regions
    res = res.map(function (row) {
      if (row['geo.cat']) {
        row['geo.cat'] = [row['geo.cat']];
      }
      if (row['geo.region'] || row['geo']) {
        row['geo.region'] = row['geo.region'] || row['geo'];
      }
      return row;
    });

    //format data
    res = mapRows(res, _this._formatters);

    //TODO: fix this hack with appropriate ORDER BY
    //      plus do it AFTER parsing so you dont sort unneeded rows
    //order by formatted
    //sort records by time
    var keys = Object.keys(_this._formatters);
    var order_by = keys[0];
    //if it has time
    if (res[0][order_by]) {
      res.sort(function (a, b) {
        return a[order_by] - b[order_by];
      });
    }
    //end of hack

    return res;
  },

  geoProcessing: function (n, cb) {
    var _this = this;

    console.log('+', n, _this.getDimensions());

    _this.getDimensions().then(function () {
      console.log('000', _this.getDimensionsDetails());
      Promise
        .all(_this.getDimensionsDetails())
        .then(function () {
          console.log('+++', n);
          cb();
        });
    });
  },

  injectMeasureValues: function (query, line, geoIndex, year) {
    var f = 0;
    var measures = this.getMeasuresNames(query);
    var geo = DATA_CACHED['geo-' + this.queryDescriptor.category];

    measures.forEach(function (m) {
      var measureCache = FILE_CACHED[CACHE.measureFileToName[m]];

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

  getIndex: function () {
    return this.load(this.indexPath);
  },

  getDimensions: function () {
    return this.load(this.dimensionPath);
  },

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
    for (var k in FILE_CACHED) {
      if (FILE_CACHED.hasOwnProperty(k) &&
        k.indexOf('ddf--list--geo--' + queryDescriptor.category) >= 0) {
        expectedGeoData = FILE_CACHED[k];
        break;
      }
    }

    var result = [];
    if (expectedGeoData !== null) {
      expectedGeoData.forEach(function (d) {
        result.push(adapters[queryDescriptor.category](d));
      });
    }

    DATA_CACHED['geo-' + queryDescriptor.category] = result;
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

    FILE_CACHED[_this.indexPath].forEach(function (indexRecord) {
      // todo: fix condition -> geo
      if (query.select.indexOf(indexRecord.measure) >= 0 &&
        (!query.where['geo.cat'] || query.where['geo.cat'].indexOf(indexRecord.geo) >= 0)) {
        var path = _this._ddfPath + '/' + indexRecord.file;
        // todo: swap...
        CACHE.measureFileToName[indexRecord.measure] = path;
        CACHE.measureNameToFile[path] = indexRecord.measure;
        expected.push(_this.load(path));
      }
    });

    return expected;
  },

  getDimensionsDetails: function () {
    var _this = this;
    var expected = [];

    console.log('++', FILE_CACHED[_this.dimensionPath]);

    FILE_CACHED[_this.dimensionPath].forEach(function (dimensionRecord) {
      // todo: remove this ugly hack after open numbers fixing
      if (dimensionRecord.dimension !== 'geo' && dimensionRecord.dimension !== 'un_state') {
        expected.push(_this.load(_this._ddfPath + '/ddf--list--geo--' + dimensionRecord.dimension + '.csv'));
      }
    });

    return expected;
  },

  // todo: remove it after 'fetcher' implementation
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
    if (!FILE_CACHED.hasOwnProperty(path) && !FILE_REQUESTED.hasOwnProperty(path)) {
      /*d3.csv(path, function (error, res) {
        if (!res) {
          console.log('No permissions or empty file: ' + path, error);
          return;
        }

        if (error) {
          console.log('Error Happened While Loading CSV File: ' + path, error);
          return;
        }

        FILE_CACHED[path] = _this._measureHashTransformer(CACHE.measureNameToFile[path], res);
        FILE_REQUESTED[path].resolve();
      });*/

      ///
      _this.readCsv(path, function (error, res) {
        if (!res) {
          console.log('No permissions or empty file: ' + path, error);
        }

        if (error) {
          console.log('Error Happened While Loading CSV File: ' + path, error);
        }

        FILE_CACHED[path] = _this._measureHashTransformer(CACHE.measureNameToFile[path], res);
        FILE_REQUESTED[path].resolve();
      });
      ///
    }

    FILE_REQUESTED[path] = new Promise();

    return FILE_REQUESTED[path];
  },
  readCsv: function (path, cb) {
    var _this = this;
    var xhr = new XMLHttpRequest();
    xhr.responseType = 'text';
    xhr.open('GET', path, true);
    var res = [];

    xhr.onreadystatechange = function () {
      if (xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) {
        res = parseCSVToObject(xhr.response);
        FILE_CACHED[path] = _this._measureHashTransformer(CACHE.measureNameToFile[path], res);

        cb(xhr.status == 200 ? null : xhr.status, res);
      } else if (xhr.readyState == XMLHttpRequest.DONE) {
        console.log('can\'t load file');

        cb(xhr.status == 200 ? null : xhr.status, res);
      }
    };

    xhr.send();
  }
});

require('vizabi/build/dist/vizabi.css');
