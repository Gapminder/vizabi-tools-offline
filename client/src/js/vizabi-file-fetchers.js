require('d3');

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

function genericFetcher(path, cb) {
  var xhr = new XMLHttpRequest();
  xhr.responseType = 'text';
  xhr.open('GET', path, true);
  var res = [];

  xhr.onreadystatechange = function () {
    if (xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) {
      res = parseCSVToObject(xhr.response);

      cb(xhr.status == 200 ? null : xhr.status, res);
    } else if (xhr.readyState == XMLHttpRequest.DONE) {
      console.log('can\'t load file');

      cb(xhr.status == 200 ? null : xhr.status, res);
    }
  };

  xhr.send();
}

exports.d3Fetcher = d3.csv;
exports.genericFetcher = genericFetcher;
