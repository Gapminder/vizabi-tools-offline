function flatten(arr) {
  return arr.reduce(function (prev, cur) {
    var more = [].concat(cur).some(Array.isArray);
    return prev.concat(more ? cur.flatten() : cur);
  }, []);
}

function getUnique(arr) {
  var u = {};
  var a = [];
  for (var i = 0, l = arr.length; i < l; ++i) {
    if (u.hasOwnProperty(arr[i])) {
      continue;
    }

    a.push(arr[i]);
    u[arr[i]] = 1;
  }
  return a;
}

var TYPE_PATTERN = [
  // year
  /^(\d{4})$/,
  // quarter
  /^(\d{4})q(\d{1})$/,
  // month
  /^(\d{4})(\d{2})$/,
  // week
  /^(\d{4})w(\d{1,2})$/,
  // date
  /^(\d{4})(\d{2})(\d{2})$/
];

function extractLocalRange(type) {
  function parse(option) {
    var match1 = TYPE_PATTERN[type].exec(option[0]);
    var match2 = TYPE_PATTERN[type].exec(option[1]);

    return {
      first: [match1[1], match1[2], match1[3]],
      second: [match2[1], match2[2], match2[3]]
    };
  }

  function getTypicalRange(option, minLimit, maxLimit, divider, isFullV) {
    var parsed = parse(option);
    var sYear = Number(parsed.first[0]);
    var v1 = Number(parsed.first[1]);
    var fYear = Number(parsed.second[0]);
    var v2 = Number(parsed.second[1]);

    var result = [];
    for (var year = sYear; year <= fYear; year++) {
      var sV = year === sYear ? v1 : minLimit;
      var fV = year === fYear ? v2 : maxLimit;
      for (var v = sV; v <= fV; v++) {
        if (isFullV === true && v < 10) {
          v = '0' + v;
        }

        result.push(year + divider + v);
      }
    }

    return result;
  }

  var options = [
    function year(option) {
      var parsed = parse(option);
      var sYear = Number(parsed.first[0]);
      var fYear = Number(parsed.second[0]);

      var result = [];
      for (var year = sYear; year <= fYear; year++) {
        result.push('' + year);
      }

      return result;
    },
    function quarter(option) {
      return getTypicalRange(option, 1, 4, 'q', false);
    },
    function month(option) {
      return getTypicalRange(option, 1, 12, '', true);
    },
    function week(option) {
      return getTypicalRange(option, 1, 53, 'w', true);
    },
    function date(option) {
      var parsed = parse(option);
      var sYear = Number(parsed.first[0]);
      var month1 = Number(parsed.first[1]);
      var day1 = Number(parsed.first[2]);
      var fYear = Number(parsed.second[0]);
      var month2 = Number(parsed.second[1]);
      var day2 = Number(parsed.second[2]);

      var result = [];
      for (var year = sYear; year <= fYear; year++) {
        var sMonth = year === sYear ? month1 : 1;
        var fMonth = year === fYear ? month2 : 12;
        for (var month = sMonth; month <= fMonth; month++) {
          var monthStr = month < 10 ? '0' + month : month;
          var sDay = (year === sYear && month === sMonth) ? day1 : 1;
          var fDay = (year === fYear && month === fMonth) ? day2 : 31;

          for (var day = sDay; day <= fDay; day++) {
            var dayStr = day < 10 ? '0' + day : day;

            result.push(year + '' + monthStr + '' + dayStr);
          }
        }
      }

      return result;
    }
  ];

  return options[type];
}

function detectType(timeQuery) {
  var flat = flatten(timeQuery);
  var types = [];
  for (var i = 0; i < flat.length; i++) {
    for (var j = 0; j < TYPE_PATTERN.length; j++) {
      if (TYPE_PATTERN[j].test(flat[i])) {
        types.push(j);
        break;
      }
    }
  }

  types = getUnique(types);

  if (types.length !== 1) {
    throw new Error('Wrong time query format: ' + JSON.stringify(timeQuery));
  }

  return types[0];
}


exports.getRange = function getRange(query) {
  var type = detectType(query);

  var extractor = extractLocalRange(type);
  var result = [];
  query.forEach(function (option) {
    if (typeof option === 'string') {
      result.push(option);
    }

    if (typeof option === 'object') {
      result = result.concat(extractor(option));
    }
  });

  return result;
};
