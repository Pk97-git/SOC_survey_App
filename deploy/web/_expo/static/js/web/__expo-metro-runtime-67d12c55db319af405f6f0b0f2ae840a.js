var __BUNDLE_START_TIME__=globalThis.nativePerformanceNow?nativePerformanceNow():Date.now(),__DEV__=false,process=globalThis.process||{},__METRO_GLOBAL_PREFIX__='';process.env=process.env||{};process.env.NODE_ENV=process.env.NODE_ENV||"production";
(function (global) {
  'use strict';

  if (!global[`${__METRO_GLOBAL_PREFIX__}__d`]) {
    global.__r = metroRequire;
    global[`${__METRO_GLOBAL_PREFIX__}__d`] = define;
    global.__c = clear;
    global.__registerSegment = registerSegment;
  }
  var modules = clear();
  const EMPTY = {};
  const CYCLE_DETECTED = {};
  const {
    hasOwnProperty
  } = {};
  function clear() {
    modules = new Map();
    return modules;
  }
  function define(factory, moduleId, dependencyMap) {
    if (modules.has(moduleId)) {
      return;
    }
    const mod = {
      dependencyMap,
      factory,
      hasError: false,
      importedAll: EMPTY,
      importedDefault: EMPTY,
      isInitialized: false,
      publicModule: {
        exports: {}
      }
    };
    modules.set(moduleId, mod);
  }
  function metroRequire(moduleId, moduleIdHint) {
    if (moduleId === null) {
      throw new Error('Cannot find module');
    }
    const module = modules.get(moduleId);
    return module && module.isInitialized ? module.publicModule.exports : guardedLoadModule(moduleId, module, moduleIdHint);
  }
  function metroImportDefault(moduleId) {
    var _modules_get;
    if (modules.has(moduleId) && ((_modules_get = modules.get(moduleId)) == null ? undefined : _modules_get.importedDefault) !== EMPTY) {
      return modules.get(moduleId).importedDefault;
    }
    const exports = metroRequire(moduleId);
    const importedDefault = exports && exports.__esModule ? exports.default : exports;
    return modules.get(moduleId).importedDefault = importedDefault;
  }
  metroRequire.importDefault = metroImportDefault;
  function metroImportAll(moduleId) {
    var _modules_get;
    if (modules.has(moduleId) && ((_modules_get = modules.get(moduleId)) == null ? undefined : _modules_get.importedAll) !== EMPTY) {
      return modules.get(moduleId).importedAll;
    }
    const exports = metroRequire(moduleId);
    let importedAll;
    if (exports && exports.__esModule) {
      importedAll = exports;
    } else {
      importedAll = {};
      if (exports) {
        for (const key in exports) {
          if (hasOwnProperty.call(exports, key)) {
            importedAll[key] = exports[key];
          }
        }
      }
      importedAll.default = exports;
    }
    return modules.get(moduleId).importedAll = importedAll;
  }
  metroRequire[Symbol.for('expo.require')] = true;
  metroRequire.importAll = metroImportAll;
  metroRequire.context = function fallbackRequireContext() {
    throw new Error('The experimental Metro feature `require.context` is not enabled in your project.');
  };
  metroRequire.resolveWeak = function fallbackRequireResolveWeak() {
    throw new Error('require.resolveWeak cannot be called dynamically.');
  };
  metroRequire.unguarded = function requireUnguarded(moduleId, moduleIdHint) {
    const module = modules.get(moduleId);
    return module && module.isInitialized ? module.publicModule.exports : loadModuleImplementation(moduleId, module, moduleIdHint);
  };
  let inGuard = false;
  function guardedLoadModule(moduleId, module, moduleIdHint) {
    if (!inGuard && global.ErrorUtils) {
      inGuard = true;
      let returnValue;
      try {
        returnValue = loadModuleImplementation(moduleId, module, moduleIdHint);
      } catch (e) {
        global.ErrorUtils.reportFatalError(e);
      }
      inGuard = false;
      return returnValue;
    } else {
      return loadModuleImplementation(moduleId, module, moduleIdHint);
    }
  }
  const ID_MASK_SHIFT = 16;
  const LOCAL_ID_MASK = 65535;
  function unpackModuleId(moduleId) {
    if (typeof moduleId !== 'number') {
      throw new Error('Module ID must be a number in unpackModuleId.');
    }
    const segmentId = moduleId >>> ID_MASK_SHIFT;
    const localId = moduleId & LOCAL_ID_MASK;
    return {
      segmentId,
      localId
    };
  }
  metroRequire.unpackModuleId = unpackModuleId;
  function packModuleId(value) {
    return (value.segmentId << ID_MASK_SHIFT) + value.localId;
  }
  metroRequire.packModuleId = packModuleId;
  const moduleDefinersBySegmentID = [];
  const definingSegmentByModuleID = new Map();
  function registerSegment(segmentId, moduleDefiner, moduleIds) {
    moduleDefinersBySegmentID[segmentId] = moduleDefiner;
    if (moduleIds) {
      moduleIds.forEach(moduleId => {
        if (!modules.has(moduleId) && !definingSegmentByModuleID.has(moduleId)) {
          definingSegmentByModuleID.set(moduleId, segmentId);
        }
      });
    }
  }
  function loadModuleImplementation(moduleId, module, moduleIdHint) {
    if (!module && moduleDefinersBySegmentID.length > 0) {
      const segmentId = definingSegmentByModuleID.get(moduleId) ?? 0;
      const definer = moduleDefinersBySegmentID[segmentId];
      if (definer != null) {
        definer(moduleId);
        module = modules.get(moduleId);
        definingSegmentByModuleID.delete(moduleId);
      }
    }
    if (!module) {
      throw unknownModuleError(moduleId, moduleIdHint);
    }
    if (module.hasError) {
      throw module.error;
    }
    module.isInitialized = true;
    const {
      factory,
      dependencyMap
    } = module;
    try {
      const moduleObject = module.publicModule;
      moduleObject.id = moduleId;
      factory == null ? undefined : factory(global, metroRequire, metroImportDefault, metroImportAll, moduleObject, moduleObject.exports, dependencyMap);
      {
        module.factory = undefined;
        module.dependencyMap = undefined;
      }
      return moduleObject.exports;
    } catch (e) {
      module.hasError = true;
      module.error = e;
      module.isInitialized = false;
      module.publicModule.exports = undefined;
      throw e;
    } finally {}
  }
  function unknownModuleError(id, moduleIdHint) {
    let message = 'Requiring unknown module "' + (id ?? moduleIdHint ?? `[unknown optional import]`) + '".';
    return Error(message);
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof global !== 'undefined' ? global : typeof window !== 'undefined' ? window : this);
(function (global) {
  global.$$require_external = typeof require !== "undefined" ? m => require(m) : () => null;
})(typeof globalThis !== 'undefined' ? globalThis : typeof global !== 'undefined' ? global : typeof window !== 'undefined' ? window : this);
(function (global) {})(typeof globalThis !== 'undefined' ? globalThis : typeof global !== 'undefined' ? global : typeof window !== 'undefined' ? window : this);
(function (global) {
  /**
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *
   * @format
   * 
   * @nolint
   * @polyfill
   */

  'use client';

  /* eslint-disable no-shadow, eqeqeq, no-unused-vars, no-control-regex  */

  /**
   * This pipes all of our console logging functions to native logging so that
   * JavaScript errors in required modules show up in Xcode via NSLog.
   */
  const inspect = function () {
    // Copyright Joyent, Inc. and other Node contributors.
    //
    // Permission is hereby granted, free of charge, to any person obtaining a
    // copy of this software and associated documentation files (the
    // "Software"), to deal in the Software without restriction, including
    // without limitation the rights to use, copy, modify, merge, publish,
    // distribute, sublicense, and/or sell copies of the Software, and to permit
    // persons to whom the Software is furnished to do so, subject to the
    // following conditions:
    //
    // The above copyright notice and this permission notice shall be included
    // in all copies or substantial portions of the Software.
    //
    // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
    // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
    // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
    // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
    // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
    // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
    // USE OR OTHER DEALINGS IN THE SOFTWARE.
    //
    // https://github.com/joyent/node/blob/master/lib/util.js

    function inspect(obj, opts) {
      var ctx = {
        seen: [],
        formatValueCalls: 0,
        stylize: stylizeNoColor
      };
      return formatValue(ctx, obj, opts.depth);
    }
    function stylizeNoColor(str, styleType) {
      return str;
    }
    function arrayToHash(array) {
      var hash = {};
      array.forEach(function (val, idx) {
        hash[val] = true;
      });
      return hash;
    }
    function formatValue(ctx, value, recurseTimes) {
      ctx.formatValueCalls++;
      if (ctx.formatValueCalls > 200) {
        return `[TOO BIG formatValueCalls ${ctx.formatValueCalls} exceeded limit of 200]`;
      }

      // Primitive types cannot have properties
      var primitive = formatPrimitive(ctx, value);
      if (primitive) {
        return primitive;
      }

      // Look up the keys of the object.
      var keys = Object.keys(value);
      var visibleKeys = arrayToHash(keys);

      // IE doesn't make error fields non-enumerable
      // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
      if (isError(value) && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
        return formatError(value);
      }

      // Some type of object without properties can be shortcutted.
      if (keys.length === 0) {
        if (isFunction(value)) {
          var name = value.name ? ': ' + value.name : '';
          return ctx.stylize('[Function' + name + ']', 'special');
        }
        if (isRegExp(value)) {
          return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
        }
        if (isDate(value)) {
          return ctx.stylize(Date.prototype.toString.call(value), 'date');
        }
        if (isError(value)) {
          return formatError(value);
        }
      }
      var base = '',
        array = false,
        braces = ['{', '}'];

      // Make Array say that they are Array
      if (isArray(value)) {
        array = true;
        braces = ['[', ']'];
      }

      // Make functions say that they are functions
      if (isFunction(value)) {
        var n = value.name ? ': ' + value.name : '';
        base = ' [Function' + n + ']';
      }

      // Make RegExps say that they are RegExps
      if (isRegExp(value)) {
        base = ' ' + RegExp.prototype.toString.call(value);
      }

      // Make dates with properties first say the date
      if (isDate(value)) {
        base = ' ' + Date.prototype.toUTCString.call(value);
      }

      // Make error with message first say the error
      if (isError(value)) {
        base = ' ' + formatError(value);
      }
      if (keys.length === 0 && (!array || value.length == 0)) {
        return braces[0] + base + braces[1];
      }
      if (recurseTimes < 0) {
        if (isRegExp(value)) {
          return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
        } else {
          return ctx.stylize('[Object]', 'special');
        }
      }
      ctx.seen.push(value);
      var output;
      if (array) {
        output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
      } else {
        output = keys.map(function (key) {
          return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
        });
      }
      ctx.seen.pop();
      return reduceToSingleString(output, base, braces);
    }
    function formatPrimitive(ctx, value) {
      if (isUndefined(value)) return ctx.stylize('undefined', 'undefined');
      if (isString(value)) {
        var simple = "'" + JSON.stringify(value).replace(/^"|"$/g, '').replace(/'/g, "\\'").replace(/\\"/g, '"') + "'";
        return ctx.stylize(simple, 'string');
      }
      if (isNumber(value)) return ctx.stylize('' + value, 'number');
      if (isBoolean(value)) return ctx.stylize('' + value, 'boolean');
      // For some reason typeof null is "object", so special case here.
      if (isNull(value)) return ctx.stylize('null', 'null');
    }
    function formatError(value) {
      return '[' + Error.prototype.toString.call(value) + ']';
    }
    function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
      var output = [];
      for (var i = 0, l = value.length; i < l; ++i) {
        if (hasOwnProperty(value, String(i))) {
          output.push(formatProperty(ctx, value, recurseTimes, visibleKeys, String(i), true));
        } else {
          output.push('');
        }
      }
      keys.forEach(function (key) {
        if (!key.match(/^\d+$/)) {
          output.push(formatProperty(ctx, value, recurseTimes, visibleKeys, key, true));
        }
      });
      return output;
    }
    function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
      var name, str, desc;
      desc = Object.getOwnPropertyDescriptor(value, key) || {
        value: value[key]
      };
      if (desc.get) {
        if (desc.set) {
          str = ctx.stylize('[Getter/Setter]', 'special');
        } else {
          str = ctx.stylize('[Getter]', 'special');
        }
      } else {
        if (desc.set) {
          str = ctx.stylize('[Setter]', 'special');
        }
      }
      if (!hasOwnProperty(visibleKeys, key)) {
        name = '[' + key + ']';
      }
      if (!str) {
        if (ctx.seen.indexOf(desc.value) < 0) {
          if (isNull(recurseTimes)) {
            str = formatValue(ctx, desc.value, null);
          } else {
            str = formatValue(ctx, desc.value, recurseTimes - 1);
          }
          if (str.indexOf('\n') > -1) {
            if (array) {
              str = str.split('\n').map(function (line) {
                return '  ' + line;
              }).join('\n').slice(2);
            } else {
              str = '\n' + str.split('\n').map(function (line) {
                return '   ' + line;
              }).join('\n');
            }
          }
        } else {
          str = ctx.stylize('[Circular]', 'special');
        }
      }
      if (isUndefined(name)) {
        if (array && key.match(/^\d+$/)) {
          return str;
        }
        name = JSON.stringify('' + key);
        if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
          name = name.slice(1, name.length - 1);
          name = ctx.stylize(name, 'name');
        } else {
          name = name.replace(/'/g, "\\'").replace(/\\"/g, '"').replace(/(^"|"$)/g, "'");
          name = ctx.stylize(name, 'string');
        }
      }
      return name + ': ' + str;
    }
    function reduceToSingleString(output, base, braces) {
      var numLinesEst = 0;
      var length = output.reduce(function (prev, cur) {
        numLinesEst++;
        if (cur.indexOf('\n') >= 0) numLinesEst++;
        return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
      }, 0);
      if (length > 60) {
        return braces[0] + (base === '' ? '' : base + '\n ') + ' ' + output.join(',\n  ') + ' ' + braces[1];
      }
      return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
    }

    // NOTE: These type checking functions intentionally don't use `instanceof`
    // because it is fragile and can be easily faked with `Object.create()`.
    function isArray(ar) {
      return Array.isArray(ar);
    }
    function isBoolean(arg) {
      return typeof arg === 'boolean';
    }
    function isNull(arg) {
      return arg === null;
    }
    function isNumber(arg) {
      return typeof arg === 'number';
    }
    function isString(arg) {
      return typeof arg === 'string';
    }
    function isUndefined(arg) {
      return arg === undefined;
    }
    function isRegExp(re) {
      return isObject(re) && objectToString(re) === '[object RegExp]';
    }
    function isObject(arg) {
      return typeof arg === 'object' && arg !== null;
    }
    function isDate(d) {
      return isObject(d) && objectToString(d) === '[object Date]';
    }
    function isError(e) {
      return isObject(e) && (objectToString(e) === '[object Error]' || e instanceof Error);
    }
    function isFunction(arg) {
      return typeof arg === 'function';
    }
    function objectToString(o) {
      return Object.prototype.toString.call(o);
    }
    function hasOwnProperty(obj, prop) {
      return Object.prototype.hasOwnProperty.call(obj, prop);
    }
    return inspect;
  }();
  const INDEX_COLUMN_NAME = '(index)';
  const LOG_LEVELS = {
    trace: 0,
    info: 1,
    warn: 2,
    error: 3
  };
  function getNativeLogFunction(level) {
    return function () {
      let str;
      if (arguments.length === 1 && typeof arguments[0] === 'string') {
        str = arguments[0];
      } else {
        str = Array.prototype.map.call(arguments, function (arg) {
          return inspect(arg, {
            depth: 10
          });
        }).join(', ');
      }

      // TRICKY
      // If more than one argument is provided, the code above collapses them all
      // into a single formatted string. This transform wraps string arguments in
      // single quotes (e.g. "foo" -> "'foo'") which then breaks the "Warning:"
      // check below. So it's important that we look at the first argument, rather
      // than the formatted argument string.
      const firstArg = arguments[0];
      let logLevel = level;
      if (typeof firstArg === 'string' && firstArg.slice(0, 9) === 'Warning: ' && logLevel >= LOG_LEVELS.error) {
        // React warnings use console.error so that a stack trace is shown,
        // but we don't (currently) want these to show a redbox
        // (Note: Logic duplicated in ExceptionsManager.js.)
        logLevel = LOG_LEVELS.warn;
      }
      if (groupStack.length) {
        str = groupFormat('', str);
      }
      global.nativeLoggingHook(str, logLevel);
    };
  }
  function repeat(element, n) {
    return Array.apply(null, Array(n)).map(function () {
      return element;
    });
  }
  function formatCellValue(cell, key) {
    if (key === INDEX_COLUMN_NAME) {
      return cell[key];
    }
    if (cell.hasOwnProperty(key)) {
      var cellValue = cell[key];
      switch (typeof cellValue) {
        case 'function':
          return 'ƒ';
        case 'string':
          return "'" + cellValue + "'";
        case 'object':
          return cellValue == null ? 'null' : '{…}';
      }
      return String(cellValue);
    }
    return '';
  }
  function consoleTablePolyfill(data, columns) {
    var rows;

    // convert object -> array
    if (Array.isArray(data)) {
      rows = data.map((row, index) => {
        var processedRow = {};
        processedRow[INDEX_COLUMN_NAME] = String(index);
        Object.assign(processedRow, row);
        return processedRow;
      });
    } else {
      rows = [];
      for (var key in data) {
        if (data.hasOwnProperty(key)) {
          var processedRow = {};
          processedRow[INDEX_COLUMN_NAME] = key;
          Object.assign(processedRow, data[key]);
          rows.push(processedRow);
        }
      }
    }
    if (rows.length === 0) {
      global.nativeLoggingHook('', LOG_LEVELS.info);
      return;
    }
    if (Array.isArray(columns)) {
      columns = [INDEX_COLUMN_NAME].concat(columns);
    } else {
      columns = Array.from(rows.reduce((columnSet, row) => {
        Object.keys(row).forEach(key => columnSet.add(key));
        return columnSet;
      }, new Set()));
    }
    var stringRows = [];
    var columnWidths = [];

    // Convert each cell to a string. Also
    // figure out max cell width for each column
    columns.forEach(function (k, i) {
      columnWidths[i] = k.length;
      for (var j = 0; j < rows.length; j++) {
        var cellStr = formatCellValue(rows[j], k);
        stringRows[j] = stringRows[j] || [];
        stringRows[j][i] = cellStr;
        columnWidths[i] = Math.max(columnWidths[i], cellStr.length);
      }
    });

    // Join all elements in the row into a single string with | separators
    // (appends extra spaces to each cell to make separators  | aligned)
    function joinRow(row, space) {
      var cells = row.map(function (cell, i) {
        var extraSpaces = repeat(' ', columnWidths[i] - cell.length).join('');
        return cell + extraSpaces;
      });
      space = space || ' ';
      return '| ' + cells.join(space + '|' + space) + ' |';
    }
    var separators = columnWidths.map(function (columnWidth) {
      return repeat('-', columnWidth).join('');
    });
    var separatorRow = joinRow(separators);
    var header = joinRow(columns);
    var table = [header, separatorRow];
    for (var i = 0; i < rows.length; i++) {
      table.push(joinRow(stringRows[i]));
    }

    // Notice extra empty line at the beginning.
    // Native logging hook adds "RCTLog >" at the front of every
    // logged string, which would shift the header and screw up
    // the table
    global.nativeLoggingHook('\n' + table.join('\n'), LOG_LEVELS.info);
  }
  const GROUP_PAD = '\u2502'; // Box light vertical
  const GROUP_OPEN = '\u2510'; // Box light down+left
  const GROUP_CLOSE = '\u2518'; // Box light up+left

  const groupStack = [];
  function groupFormat(prefix, msg) {
    // Insert group formatting before the console message
    return groupStack.join('') + prefix + ' ' + (msg || '');
  }
  function consoleGroupPolyfill(label) {
    global.nativeLoggingHook(groupFormat(GROUP_OPEN, label), LOG_LEVELS.info);
    groupStack.push(GROUP_PAD);
  }
  function consoleGroupCollapsedPolyfill(label) {
    global.nativeLoggingHook(groupFormat(GROUP_CLOSE, label), LOG_LEVELS.info);
    groupStack.push(GROUP_PAD);
  }
  function consoleGroupEndPolyfill() {
    groupStack.pop();
    global.nativeLoggingHook(groupFormat(GROUP_CLOSE), LOG_LEVELS.info);
  }
  function consoleAssertPolyfill(expression, label) {
    if (!expression) {
      global.nativeLoggingHook('Assertion failed: ' + label, LOG_LEVELS.error);
    }
  }

  // https://developer.mozilla.org/en-US/docs/Web/API/console/timeStamp_static.
  // Non-standard API for recording markers on a timeline of the Performance instrumentation.
  // The actual logging is not provided by definition.
  function consoleTimeStampPolyfill() {}
  if (global.nativeLoggingHook) {
    const originalConsole = global.console;
    // Preserve the original `console` as `originalConsole`

    global.console = Object.assign({
      timeStamp: consoleTimeStampPolyfill
    }, originalConsole ?? {}, {
      error: getNativeLogFunction(LOG_LEVELS.error),
      info: getNativeLogFunction(LOG_LEVELS.info),
      log: getNativeLogFunction(LOG_LEVELS.info),
      warn: getNativeLogFunction(LOG_LEVELS.warn),
      trace: getNativeLogFunction(LOG_LEVELS.trace),
      debug: getNativeLogFunction(LOG_LEVELS.trace),
      table: consoleTablePolyfill,
      group: consoleGroupPolyfill,
      groupEnd: consoleGroupEndPolyfill,
      groupCollapsed: consoleGroupCollapsedPolyfill,
      assert: consoleAssertPolyfill
    });

    // TODO(T206796580): This was copy-pasted from ExceptionsManager.js
    // Delete the copy there after the c++ pipeline is rolled out everywhere.
    if (global.RN$useAlwaysAvailableJSErrorHandling === true) {
      let originalConsoleError = console.error;
      console.reportErrorsAsExceptions = true;
      function stringifySafe(arg) {
        return inspect(arg, {
          depth: 10
        }).replace(/\n\s*/g, ' ');
      }
      console.error = function (...args) {
        originalConsoleError.apply(this, args);
        if (!console.reportErrorsAsExceptions) {
          return;
        }
        if (global.RN$inExceptionHandler?.()) {
          return;
        }
        let error;
        const firstArg = args[0];
        if (firstArg?.stack) {
          // RN$handleException will console.error this with high enough fidelity.
          error = firstArg;
        } else {
          if (typeof firstArg === 'string' && firstArg.startsWith('Warning: ')) {
            // React warnings use console.error so that a stack trace is shown, but
            // we don't (currently) want these to show a redbox
            return;
          }
          const message = args.map(arg => typeof arg === 'string' ? arg : stringifySafe(arg)).join(' ');
          error = new Error(message);
          error.name = 'console.error';
        }
        const isFatal = false;
        const reportToConsole = false;
        global.RN$handleException(error, isFatal, reportToConsole);
      };
    }
    Object.defineProperty(console, '_isPolyfilled', {
      value: true,
      enumerable: false
    });

    // If available, also call the original `console` method since that is
    // sometimes useful. Ex: on OS X, this will let you see rich output in
    // the Safari Web Inspector console.
  } else if (!global.console) {
    function stub() {}
    const log = global.print || stub;
    global.console = {
      debug: log,
      error: log,
      info: log,
      log: log,
      trace: log,
      warn: log,
      assert(expression, label) {
        if (!expression) {
          log('Assertion failed: ' + label);
        }
      },
      clear: stub,
      dir: stub,
      dirxml: stub,
      group: stub,
      groupCollapsed: stub,
      groupEnd: stub,
      profile: stub,
      profileEnd: stub,
      table: stub,
      timeStamp: stub
    };
    Object.defineProperty(console, '_isPolyfilled', {
      value: true,
      enumerable: false
    });
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof global !== 'undefined' ? global : typeof window !== 'undefined' ? window : this);
(function (global) {
  let _inGuard = 0;
  let _globalHandler = global.RN$useAlwaysAvailableJSErrorHandling === true ? global.RN$handleException : (e, isFatal) => {
    throw e;
  };
  const ErrorUtils = {
    setGlobalHandler(fun) {
      _globalHandler = fun;
    },
    getGlobalHandler() {
      return _globalHandler;
    },
    reportError(error) {
      _globalHandler && _globalHandler(error, false);
    },
    reportFatalError(error) {
      _globalHandler && _globalHandler(error, true);
    },
    applyWithGuard(fun, context, args, unused_onError, unused_name) {
      try {
        _inGuard++;
        return fun.apply(context, args);
      } catch (e) {
        ErrorUtils.reportError(e);
      } finally {
        _inGuard--;
      }
      return null;
    },
    applyWithGuardIfNeeded(fun, context, args) {
      if (ErrorUtils.inGuard()) {
        return fun.apply(context, args);
      } else {
        ErrorUtils.applyWithGuard(fun, context, args);
      }
      return null;
    },
    inGuard() {
      return !!_inGuard;
    },
    guard(fun, name, context) {
      if (typeof fun !== 'function') {
        console.warn('A function must be passed to ErrorUtils.guard, got ', fun);
        return null;
      }
      const guardName = name ?? fun.name ?? '<generated guard>';
      function guarded(...args) {
        return ErrorUtils.applyWithGuard(fun, context ?? this, args, null, guardName);
      }
      return guarded;
    }
  };
  global.ErrorUtils = ErrorUtils;
})(typeof globalThis !== 'undefined' ? globalThis : typeof global !== 'undefined' ? global : typeof window !== 'undefined' ? window : this);