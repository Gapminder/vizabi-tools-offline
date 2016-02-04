var isArray = Array.isArray || function (obj) {
    return toString.call(obj) === '[object Array]';
  };

exports.isArray = isArray;

function forEach(obj, callback, ctx) {
  if (!obj) {
    return;
  }
  var i, size;
  if (isArray(obj)) {
    size = obj.length;
    for (i = 0; i < size; i += 1) {
      if (callback.apply(ctx, [
          obj[i],
          i
        ]) === false) {
        break;
      }
    }
  } else {
    var keys = Object.keys(obj);
    size = keys.length;
    for (i = 0; i < size; i += 1) {
      if (callback.apply(ctx, [
          obj[keys[i]],
          keys[i]
        ]) === false) {
        break;
      }
    }
  }
}

function isSpecificValue(val) {
  return (
    val instanceof Date
    || val instanceof RegExp
  ) ? true : false;
}

function cloneSpecificValue(val) {
  if (val instanceof Date) {
    return new Date(val.getTime());
  } else if (val instanceof RegExp) {
    return new RegExp(val);
  } else {
    throw new Error('Unexpected situation');
  }
}

function deepCloneArray(arr) {
  var clone = [];
  forEach(arr, function (item, index) {
    if (typeof item === 'object' && item !== null) {
      if (isArray(item)) {
        clone[index] = deepCloneArray(item);
      } else if (isSpecificValue(item)) {
        clone[index] = cloneSpecificValue(item);
      } else {
        clone[index] = deepExtend({}, item);
      }
    } else {
      clone[index] = item;
    }
  });
  return clone;
}

exports.deepExtend = function deepExtend(/*obj_1, [obj_2], [obj_N]*/) {
  if (arguments.length < 1 || typeof arguments[0] !== 'object') {
    return false;
  }

  if (arguments.length < 2) {
    return arguments[0];
  }

  var target = arguments[0];

  // convert arguments to array and cut off target object
  var args = Array.prototype.slice.call(arguments, 1);

  var val, src, clone;

  forEach(args, function (obj) {
    // skip argument if it is array or isn't object
    if (typeof obj !== 'object' || isArray(obj)) {
      return;
    }

    forEach(Object.keys(obj), function (key) {
      src = target[key]; // source value
      val = obj[key]; // new value

      // recursion prevention
      if (val === target) {
        return;

        /**
         * if new value isn't object then just overwrite by new value
         * instead of extending.
         */
      } else if (typeof val !== 'object' || val === null) {
        target[key] = val;
        return;

        // just clone arrays (and recursive clone objects inside)
      } else if (isArray(val)) {
        target[key] = deepCloneArray(val);
        return;

        // custom cloning and overwrite for specific objects
      } else if (isSpecificValue(val)) {
        target[key] = cloneSpecificValue(val);
        return;

        // overwrite by new value if source isn't object or array
      } else if (typeof src !== 'object' || src === null || isArray(src)) {
        target[key] = deepExtend({}, val);
        return;

        // source value and new value is objects both, extending...
      } else {
        target[key] = deepExtend(src, val);
        return;
      }
    });
  });

  return target;
};
