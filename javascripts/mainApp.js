(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function () {
	// Basil
	var Basil = function (options) {
		return Basil.utils.extend({}, Basil.plugins, new Basil.Storage().init(options));
	};

	// Version
	Basil.version = '0.4.4';

	// Utils
	Basil.utils = {
		extend: function () {
			var destination = typeof arguments[0] === 'object' ? arguments[0] : {};
			for (var i = 1; i < arguments.length; i++) {
				if (arguments[i] && typeof arguments[i] === 'object')
					for (var property in arguments[i])
						destination[property] = arguments[i][property];
			}
			return destination;
		},
		each: function (obj, fnIterator, context) {
			if (this.isArray(obj)) {
				for (var i = 0; i < obj.length; i++)
					if (fnIterator.call(context, obj[i], i) === false) return;
			} else if (obj) {
				for (var key in obj)
					if (fnIterator.call(context, obj[key], key) === false) return;
			}
		},
		tryEach: function (obj, fnIterator, fnError, context) {
			this.each(obj, function (value, key) {
				try {
					return fnIterator.call(context, value, key);
				} catch (error) {
					if (this.isFunction(fnError)) {
						try {
							fnError.call(context, value, key, error);
						} catch (error) {}
					}
				}
			}, this);
		},
		registerPlugin: function (methods) {
			Basil.plugins = this.extend(methods, Basil.plugins);
		},
		getTypeOf: function (obj) {
			if (typeof obj === 'undefined' || obj === null)
				return '' + obj;
			return Object.prototype.toString.call(obj).replace(/^\[object\s(.*)\]$/, function ($0, $1) { return $1.toLowerCase(); });
		}
	};
  	// Add some isType methods: isArguments, isBoolean, isFunction, isString, isArray, isNumber, isDate, isRegExp, isUndefined, isNull.
	var types = ['Arguments', 'Boolean', 'Function', 'String', 'Array', 'Number', 'Date', 'RegExp', 'Undefined', 'Null'];
	for (var i = 0; i < types.length; i++) {
		Basil.utils['is' + types[i]] = (function (type) {
			return function (obj) {
				return Basil.utils.getTypeOf(obj) === type.toLowerCase();
			};
		})(types[i]);
	}

	// Plugins
	Basil.plugins = {};

	// Options
	Basil.options = Basil.utils.extend({
		namespace: 'b45i1',
		storages: ['local', 'cookie', 'session', 'memory'],
		expireDays: 365
	}, window.Basil ? window.Basil.options : {});

	// Storage
	Basil.Storage = function () {
		var _salt = 'b45i1' + (Math.random() + 1)
				.toString(36)
				.substring(7),
			_storages = {},
			_isValidKey = function (key) {
				var type = Basil.utils.getTypeOf(key);
				return (type === 'string' && key) || type === 'number' || type === 'boolean';
			},
			_toStoragesArray = function (storages) {
				if (Basil.utils.isArray(storages))
					return storages;
				return Basil.utils.isString(storages) ? [storages] : [];
			},
			_toStoredKey = function (namespace, path) {
				var key = '';
				if (_isValidKey(path)) {
					key += path;
				} else if (Basil.utils.isArray(path)) {
					path = Basil.utils.isFunction(path.filter) ? path.filter(_isValidKey) : path;
					key = path.join('.');
				}
				return key && _isValidKey(namespace) ? namespace + '.' + key : key;
 			},
			_toKeyName = function (namespace, key) {
				if (!_isValidKey(namespace))
					return key;
				return key.replace(new RegExp('^' + namespace + '.'), '');
			},
			_toStoredValue = function (value) {
				return JSON.stringify(value);
			},
			_fromStoredValue = function (value) {
				return value ? JSON.parse(value) : null;
			};

		// HTML5 web storage interface
		var webStorageInterface = {
			engine: null,
			check: function () {
				try {
					window[this.engine].setItem(_salt, true);
					window[this.engine].removeItem(_salt);
				} catch (e) {
					return false;
				}
				return true;
			},
			set: function (key, value, options) {
				if (!key)
					throw Error('invalid key');
				window[this.engine].setItem(key, value);
			},
			get: function (key) {
				return window[this.engine].getItem(key);
			},
			remove: function (key) {
				window[this.engine].removeItem(key);
			},
			reset: function (namespace) {
				for (var i = 0, key; i < window[this.engine].length; i++) {
					key = window[this.engine].key(i);
					if (!namespace || key.indexOf(namespace) === 0) {
						this.remove(key);
						i--;
					}
				}
			},
			keys: function (namespace) {
				var keys = [];
				for (var i = 0, key; i < window[this.engine].length; i++) {
					key = window[this.engine].key(i);
					if (!namespace || key.indexOf(namespace) === 0)
						keys.push(_toKeyName(namespace, key));
				}
				return keys;
			}
		};

		// local storage
		_storages.local = Basil.utils.extend({}, webStorageInterface, {
			engine: 'localStorage'
		});
		// session storage
		_storages.session = Basil.utils.extend({}, webStorageInterface, {
			engine: 'sessionStorage'
		});

		// memory storage
		_storages.memory = {
			_hash: {},
			check: function () {
				return true;
			},
			set: function (key, value, options) {
				if (!key)
					throw Error('invalid key');
				this._hash[key] = value;
			},
			get: function (key) {
				return this._hash[key] || null;
			},
			remove: function (key) {
				delete this._hash[key];
			},
			reset: function (namespace) {
				for (var key in this._hash) {
					if (!namespace || key.indexOf(namespace) === 0)
						this.remove(key);
				}
			},
			keys: function (namespace) {
				var keys = [];
				for (var key in this._hash)
					if (!namespace || key.indexOf(namespace) === 0)
						keys.push(_toKeyName(namespace, key));
				return keys;
			}
		};

		// cookie storage
		_storages.cookie = {
			check: function () {
				if (!navigator.cookieEnabled)
					return false;
				if (window.self !== window.top) {
					// we need to check third-party cookies;
					var cookie = 'thirdparty.check=' + Math.round(Math.random() * 1000);
					document.cookie = cookie + '; path=/';
					return document.cookie.indexOf(cookie) !== -1;
				}
				return true;
			},
			set: function (key, value, options) {
				if (!this.check())
					throw Error('cookies are disabled');
				options = options || {};
				if (!key)
					throw Error('invalid key');
				var cookie = encodeURIComponent(key) + '=' + encodeURIComponent(value);
				// handle expiration days
				if (options.expireDays) {
					var date = new Date();
					date.setTime(date.getTime() + (options.expireDays * 24 * 60 * 60 * 1000));
					cookie += '; expires=' + date.toGMTString();
				}
				// handle domain
				if (options.domain && options.domain !== document.domain) {
					var _domain = options.domain.replace(/^\./, '');
					if (document.domain.indexOf(_domain) === -1 || _domain.split('.').length <= 1)
						throw Error('invalid domain');
					cookie += '; domain=' + options.domain;
				}
				// handle secure
				if (options.secure === true) {
					cookie += '; secure';
				}
				document.cookie = cookie + '; path=/';
			},
			get: function (key) {
				if (!this.check())
					throw Error('cookies are disabled');
				var encodedKey = encodeURIComponent(key);
				var cookies = document.cookie ? document.cookie.split(';') : [];
				// retrieve last updated cookie first
				for (var i = cookies.length - 1, cookie; i >= 0; i--) {
					cookie = cookies[i].replace(/^\s*/, '');
					if (cookie.indexOf(encodedKey + '=') === 0)
						return decodeURIComponent(cookie.substring(encodedKey.length + 1, cookie.length));
				}
				return null;
			},
			remove: function (key) {
				// remove cookie from main domain
				this.set(key, '', { expireDays: -1 });
				// remove cookie from upper domains
				var domainParts = document.domain.split('.');
				for (var i = domainParts.length; i >= 0; i--) {
					this.set(key, '', { expireDays: -1, domain: '.' + domainParts.slice(- i).join('.') });
				}
			},
			reset: function (namespace) {
				var cookies = document.cookie ? document.cookie.split(';') : [];
				for (var i = 0, cookie, key; i < cookies.length; i++) {
					cookie = cookies[i].replace(/^\s*/, '');
					key = cookie.substr(0, cookie.indexOf('='));
					if (!namespace || key.indexOf(namespace) === 0)
						this.remove(key);
				}
			},
			keys: function (namespace) {
				if (!this.check())
					throw Error('cookies are disabled');
				var keys = [],
					cookies = document.cookie ? document.cookie.split(';') : [];
				for (var i = 0, cookie, key; i < cookies.length; i++) {
					cookie = cookies[i].replace(/^\s*/, '');
					key = decodeURIComponent(cookie.substr(0, cookie.indexOf('=')));
					if (!namespace || key.indexOf(namespace) === 0)
						keys.push(_toKeyName(namespace, key));
				}
				return keys;
			}
		};

		return {
			init: function (options) {
				this.setOptions(options);
				return this;
			},
			setOptions: function (options) {
				this.options = Basil.utils.extend({}, this.options || Basil.options, options);
			},
			support: function (storage) {
				return _storages.hasOwnProperty(storage);
			},
			check: function (storage) {
				if (this.support(storage))
					return _storages[storage].check();
				return false;
			},
			set: function (key, value, options) {
				options = Basil.utils.extend({}, this.options, options);
				if (!(key = _toStoredKey(options.namespace, key)))
					return false;
				value = options.raw === true ? value : _toStoredValue(value);
				var where = null;
				// try to set key/value in first available storage
				Basil.utils.tryEach(_toStoragesArray(options.storages), function (storage, index) {
					_storages[storage].set(key, value, options);
					where = storage;
					return false; // break;
				}, null, this);
				if (!where) {
					// key has not been set anywhere
					return false;
				}
				// remove key from all other storages
				Basil.utils.tryEach(_toStoragesArray(options.storages), function (storage, index) {
					if (storage !== where)
						_storages[storage].remove(key);
				}, null, this);
				return true;
			},
			get: function (key, options) {
				options = Basil.utils.extend({}, this.options, options);
				if (!(key = _toStoredKey(options.namespace, key)))
					return null;
				var value = null;
				Basil.utils.tryEach(_toStoragesArray(options.storages), function (storage, index) {
					if (value !== null)
						return false; // break if a value has already been found.
					value = _storages[storage].get(key, options) || null;
					value = options.raw === true ? value : _fromStoredValue(value);
				}, function (storage, index, error) {
					value = null;
				}, this);
				return value;
			},
			remove: function (key, options) {
				options = Basil.utils.extend({}, this.options, options);
				if (!(key = _toStoredKey(options.namespace, key)))
					return;
				Basil.utils.tryEach(_toStoragesArray(options.storages), function (storage) {
					_storages[storage].remove(key);
				}, null, this);
			},
			reset: function (options) {
				options = Basil.utils.extend({}, this.options, options);
				Basil.utils.tryEach(_toStoragesArray(options.storages), function (storage) {
					_storages[storage].reset(options.namespace);
				}, null, this);
			},
			keys: function (options) {
				options = options || {};
				var keys = [];
				for (var key in this.keysMap(options))
					keys.push(key);
				return keys;
			},
			keysMap: function (options) {
				options = Basil.utils.extend({}, this.options, options);
				var map = {};
				Basil.utils.tryEach(_toStoragesArray(options.storages), function (storage) {
					Basil.utils.each(_storages[storage].keys(options.namespace), function (key) {
						map[key] = Basil.utils.isArray(map[key]) ? map[key] : [];
						map[key].push(storage);
					}, this);
				}, null, this);
				return map;
			}
		};
	};

	// Access to native storages, without namespace or basil value decoration
	Basil.memory = new Basil.Storage().init({ storages: 'memory', namespace: null, raw: true });
	Basil.cookie = new Basil.Storage().init({ storages: 'cookie', namespace: null, raw: true });
	Basil.localStorage = new Basil.Storage().init({ storages: 'local', namespace: null, raw: true });
	Basil.sessionStorage = new Basil.Storage().init({ storages: 'session', namespace: null, raw: true });

	// browser export
	window.Basil = Basil;

	// AMD export
	if (typeof define === 'function' && define.amd) {
		define(function() {
			return Basil;
		});
	// commonjs export
	} else if (typeof module !== 'undefined' && module.exports) {
		module.exports = Basil;
	}

})();

},{}],2:[function(require,module,exports){

},{}],3:[function(require,module,exports){
/*
 * EJS Embedded JavaScript templates
 * Copyright 2112 Matthew Eernisse (mde@fleegix.org)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
*/

'use strict';

/**
 * @file Embedded JavaScript templating engine.
 * @author Matthew Eernisse <mde@fleegix.org>
 * @author Tiancheng "Timothy" Gu <timothygu99@gmail.com>
 * @project EJS
 * @license {@link http://www.apache.org/licenses/LICENSE-2.0 Apache License, Version 2.0}
 */

/**
 * EJS internal functions.
 *
 * Technically this "module" lies in the same file as {@link module:ejs}, for
 * the sake of organization all the private functions re grouped into this
 * module.
 *
 * @module ejs-internal
 * @private
 */

/**
 * Embedded JavaScript templating engine.
 *
 * @module ejs
 * @public
 */

var fs = require('fs');
var path = require('path');
var utils = require('./utils');

var scopeOptionWarned = false;
var _VERSION_STRING = require('../package.json').version;
var _DEFAULT_DELIMITER = '%';
var _DEFAULT_LOCALS_NAME = 'locals';
var _REGEX_STRING = '(<%%|%%>|<%=|<%-|<%_|<%#|<%|%>|-%>|_%>)';
var _OPTS = [ 'cache', 'filename', 'delimiter', 'scope', 'context',
        'debug', 'compileDebug', 'client', '_with', 'root', 'rmWhitespace',
        'strict', 'localsName'];
var _TRAILING_SEMCOL = /;\s*$/;
var _BOM = /^\uFEFF/;

/**
 * EJS template function cache. This can be a LRU object from lru-cache NPM
 * module. By default, it is {@link module:utils.cache}, a simple in-process
 * cache that grows continuously.
 *
 * @type {Cache}
 */

exports.cache = utils.cache;

/**
 * Name of the object containing the locals.
 *
 * This variable is overriden by {@link Options}`.localsName` if it is not
 * `undefined`.
 *
 * @type {String}
 * @public
 */

exports.localsName = _DEFAULT_LOCALS_NAME;

/**
 * Get the path to the included file from the parent file path and the
 * specified path.
 *
 * @param {String}  name     specified path
 * @param {String}  filename parent file path
 * @param {Boolean} isDir    parent file path whether is directory
 * @return {String}
 */
exports.resolveInclude = function(name, filename, isDir) {
  var dirname = path.dirname;
  var extname = path.extname;
  var resolve = path.resolve;
  var includePath = resolve(isDir ? filename : dirname(filename), name);
  var ext = extname(name);
  if (!ext) {
    includePath += '.ejs';
  }
  return includePath;
};

/**
 * Get the path to the included file by Options
 * 
 * @param  {String}  path    specified path
 * @param  {Options} options compilation options
 * @return {String}
 */
function getIncludePath(path, options){
  var includePath;
  if (path.charAt(0) == '/') {
    includePath = exports.resolveInclude(path.replace(/^\/*/,''), options.root || '/', true);
  }
  else {
    if (!options.filename) {
      throw new Error('`include` use relative path requires the \'filename\' option.');
    }
    includePath = exports.resolveInclude(path, options.filename);  
  }
  return includePath;
}

/**
 * Get the template from a string or a file, either compiled on-the-fly or
 * read from cache (if enabled), and cache the template if needed.
 *
 * If `template` is not set, the file specified in `options.filename` will be
 * read.
 *
 * If `options.cache` is true, this function reads the file from
 * `options.filename` so it must be set prior to calling this function.
 *
 * @memberof module:ejs-internal
 * @param {Options} options   compilation options
 * @param {String} [template] template source
 * @return {(TemplateFunction|ClientFunction)}
 * Depending on the value of `options.client`, either type might be returned.
 * @static
 */

function handleCache(options, template) {
  var func;
  var filename = options.filename;
  var hasTemplate = arguments.length > 1;

  if (options.cache) {
    if (!filename) {
      throw new Error('cache option requires a filename');
    }
    func = exports.cache.get(filename);
    if (func) {
      return func;
    }
    if (!hasTemplate) {
      template = fs.readFileSync(filename).toString().replace(_BOM, '');
    }
  }
  else if (!hasTemplate) {
    // istanbul ignore if: should not happen at all
    if (!filename) {
      throw new Error('Internal EJS error: no file name or template '
                    + 'provided');
    }
    template = fs.readFileSync(filename).toString().replace(_BOM, '');
  }
  func = exports.compile(template, options);
  if (options.cache) {
    exports.cache.set(filename, func);
  }
  return func;
}

/**
 * Get the template function.
 *
 * If `options.cache` is `true`, then the template is cached.
 *
 * @memberof module:ejs-internal
 * @param {String}  path    path for the specified file
 * @param {Options} options compilation options
 * @return {(TemplateFunction|ClientFunction)}
 * Depending on the value of `options.client`, either type might be returned
 * @static
 */

function includeFile(path, options) {
  var opts = utils.shallowCopy({}, options);
  opts.filename = getIncludePath(path, opts);
  return handleCache(opts);
}

/**
 * Get the JavaScript source of an included file.
 *
 * @memberof module:ejs-internal
 * @param {String}  path    path for the specified file
 * @param {Options} options compilation options
 * @return {Object}
 * @static
 */

function includeSource(path, options) {
  var opts = utils.shallowCopy({}, options);
  var includePath;
  var template;
  includePath = getIncludePath(path,opts);
  template = fs.readFileSync(includePath).toString().replace(_BOM, '');
  opts.filename = includePath;
  var templ = new Template(template, opts);
  templ.generateSource();
  return {
    source: templ.source,
    filename: includePath,
    template: template
  };
}

/**
 * Re-throw the given `err` in context to the `str` of ejs, `filename`, and
 * `lineno`.
 *
 * @implements RethrowCallback
 * @memberof module:ejs-internal
 * @param {Error}  err      Error object
 * @param {String} str      EJS source
 * @param {String} filename file name of the EJS file
 * @param {String} lineno   line number of the error
 * @static
 */

function rethrow(err, str, filename, lineno){
  var lines = str.split('\n');
  var start = Math.max(lineno - 3, 0);
  var end = Math.min(lines.length, lineno + 3);
  // Error context
  var context = lines.slice(start, end).map(function (line, i){
    var curr = i + start + 1;
    return (curr == lineno ? ' >> ' : '    ')
      + curr
      + '| '
      + line;
  }).join('\n');

  // Alter exception message
  err.path = filename;
  err.message = (filename || 'ejs') + ':'
    + lineno + '\n'
    + context + '\n\n'
    + err.message;

  throw err;
}

/**
 * Copy properties in data object that are recognized as options to an
 * options object.
 *
 * This is used for compatibility with earlier versions of EJS and Express.js.
 *
 * @memberof module:ejs-internal
 * @param {Object}  data data object
 * @param {Options} opts options object
 * @static
 */

function cpOptsInData(data, opts) {
  _OPTS.forEach(function (p) {
    if (typeof data[p] != 'undefined') {
      opts[p] = data[p];
    }
  });
}

/**
 * Compile the given `str` of ejs into a template function.
 *
 * @param {String}  template EJS template
 *
 * @param {Options} opts     compilation options
 *
 * @return {(TemplateFunction|ClientFunction)}
 * Depending on the value of `opts.client`, either type might be returned.
 * @public
 */

exports.compile = function compile(template, opts) {
  var templ;

  // v1 compat
  // 'scope' is 'context'
  // FIXME: Remove this in a future version
  if (opts && opts.scope) {
    if (!scopeOptionWarned){
      console.warn('`scope` option is deprecated and will be removed in EJS 3');
      scopeOptionWarned = true;
    }
    if (!opts.context) {
      opts.context = opts.scope;
    }
    delete opts.scope;
  }
  templ = new Template(template, opts);
  return templ.compile();
};

/**
 * Render the given `template` of ejs.
 *
 * If you would like to include options but not data, you need to explicitly
 * call this function with `data` being an empty object or `null`.
 *
 * @param {String}   template EJS template
 * @param {Object}  [data={}] template data
 * @param {Options} [opts={}] compilation and rendering options
 * @return {String}
 * @public
 */

exports.render = function (template, d, o) {
  var data = d || {};
  var opts = o || {};

  // No options object -- if there are optiony names
  // in the data, copy them to options
  if (arguments.length == 2) {
    cpOptsInData(data, opts);
  }

  return handleCache(opts, template)(data);
};

/**
 * Render an EJS file at the given `path` and callback `cb(err, str)`.
 *
 * If you would like to include options but not data, you need to explicitly
 * call this function with `data` being an empty object or `null`.
 *
 * @param {String}             path     path to the EJS file
 * @param {Object}            [data={}] template data
 * @param {Options}           [opts={}] compilation and rendering options
 * @param {RenderFileCallback} cb callback
 * @public
 */

exports.renderFile = function () {
  var args = Array.prototype.slice.call(arguments);
  var filename = args.shift();
  var cb = args.pop();
  var data = args.shift() || {};
  var opts = args.pop() || {};
  var result;

  // Don't pollute passed in opts obj with new vals
  opts = utils.shallowCopy({}, opts);

  // No options object -- if there are optiony names
  // in the data, copy them to options
  if (arguments.length == 3) {
    // Express 4
    if (data.settings && data.settings['view options']) {
      cpOptsInData(data.settings['view options'], opts);
    }
    // Express 3 and lower
    else {
      cpOptsInData(data, opts);
    }
  }
  opts.filename = filename;

  try {
    result = handleCache(opts)(data);
  }
  catch(err) {
    return cb(err);
  }
  return cb(null, result);
};

/**
 * Clear intermediate JavaScript cache. Calls {@link Cache#reset}.
 * @public
 */

exports.clearCache = function () {
  exports.cache.reset();
};

function Template(text, opts) {
  opts = opts || {};
  var options = {};
  this.templateText = text;
  this.mode = null;
  this.truncate = false;
  this.currentLine = 1;
  this.source = '';
  this.dependencies = [];
  options.client = opts.client || false;
  options.escapeFunction = opts.escape || utils.escapeXML;
  options.compileDebug = opts.compileDebug !== false;
  options.debug = !!opts.debug;
  options.filename = opts.filename;
  options.delimiter = opts.delimiter || exports.delimiter || _DEFAULT_DELIMITER;
  options.strict = opts.strict || false;
  options.context = opts.context;
  options.cache = opts.cache || false;
  options.rmWhitespace = opts.rmWhitespace;
  options.root = opts.root;
  options.localsName = opts.localsName || exports.localsName || _DEFAULT_LOCALS_NAME;

  if (options.strict) {
    options._with = false;
  }
  else {
    options._with = typeof opts._with != 'undefined' ? opts._with : true;
  }

  this.opts = options;

  this.regex = this.createRegex();
}

Template.modes = {
  EVAL: 'eval',
  ESCAPED: 'escaped',
  RAW: 'raw',
  COMMENT: 'comment',
  LITERAL: 'literal'
};

Template.prototype = {
  createRegex: function () {
    var str = _REGEX_STRING;
    var delim = utils.escapeRegExpChars(this.opts.delimiter);
    str = str.replace(/%/g, delim);
    return new RegExp(str);
  },

  compile: function () {
    var src;
    var fn;
    var opts = this.opts;
    var prepended = '';
    var appended = '';
    var escape = opts.escapeFunction;

    if (!this.source) {
      this.generateSource();
      prepended += '  var __output = [], __append = __output.push.bind(__output);' + '\n';
      if (opts._with !== false) {
        prepended +=  '  with (' + opts.localsName + ' || {}) {' + '\n';
        appended += '  }' + '\n';
      }
      appended += '  return __output.join("");' + '\n';
      this.source = prepended + this.source + appended;
    }

    if (opts.compileDebug) {
      src = 'var __line = 1' + '\n'
          + '  , __lines = ' + JSON.stringify(this.templateText) + '\n'
          + '  , __filename = ' + (opts.filename ?
                JSON.stringify(opts.filename) : 'undefined') + ';' + '\n'
          + 'try {' + '\n'
          + this.source
          + '} catch (e) {' + '\n'
          + '  rethrow(e, __lines, __filename, __line);' + '\n'
          + '}' + '\n';
    }
    else {
      src = this.source;
    }

    if (opts.debug) {
      console.log(src);
    }

    if (opts.client) {
      src = 'escape = escape || ' + escape.toString() + ';' + '\n' + src;
      if (opts.compileDebug) {
        src = 'rethrow = rethrow || ' + rethrow.toString() + ';' + '\n' + src;
      }
    }

    if (opts.strict) {
      src = '"use strict";\n' + src;
    }

    try {
      fn = new Function(opts.localsName + ', escape, include, rethrow', src);
    }
    catch(e) {
      // istanbul ignore else
      if (e instanceof SyntaxError) {
        if (opts.filename) {
          e.message += ' in ' + opts.filename;
        }
        e.message += ' while compiling ejs';
      }
      throw e;
    }

    if (opts.client) {
      fn.dependencies = this.dependencies;
      return fn;
    }

    // Return a callable function which will execute the function
    // created by the source-code, with the passed data as locals
    // Adds a local `include` function which allows full recursive include
    var returnedFn = function (data) {
      var include = function (path, includeData) {
        var d = utils.shallowCopy({}, data);
        if (includeData) {
          d = utils.shallowCopy(d, includeData);
        }
        return includeFile(path, opts)(d);
      };
      return fn.apply(opts.context, [data || {}, escape, include, rethrow]);
    };
    returnedFn.dependencies = this.dependencies;
    return returnedFn;
  },

  generateSource: function () {
    var opts = this.opts;

    if (opts.rmWhitespace) {
      // Have to use two separate replace here as `^` and `$` operators don't
      // work well with `\r`.
      this.templateText =
        this.templateText.replace(/\r/g, '').replace(/^\s+|\s+$/gm, '');
    }

    // Slurp spaces and tabs before <%_ and after _%>
    this.templateText =
      this.templateText.replace(/[ \t]*<%_/gm, '<%_').replace(/_%>[ \t]*/gm, '_%>');

    var self = this;
    var matches = this.parseTemplateText();
    var d = this.opts.delimiter;

    if (matches && matches.length) {
      matches.forEach(function (line, index) {
        var opening;
        var closing;
        var include;
        var includeOpts;
        var includeObj;
        var includeSrc;
        // If this is an opening tag, check for closing tags
        // FIXME: May end up with some false positives here
        // Better to store modes as k/v with '<' + delimiter as key
        // Then this can simply check against the map
        if ( line.indexOf('<' + d) === 0        // If it is a tag
          && line.indexOf('<' + d + d) !== 0) { // and is not escaped
          closing = matches[index + 2];
          if (!(closing == d + '>' || closing == '-' + d + '>' || closing == '_' + d + '>')) {
            throw new Error('Could not find matching close tag for "' + line + '".');
          }
        }
        // HACK: backward-compat `include` preprocessor directives
        if ((include = line.match(/^\s*include\s+(\S+)/))) {
          opening = matches[index - 1];
          // Must be in EVAL or RAW mode
          if (opening && (opening == '<' + d || opening == '<' + d + '-' || opening == '<' + d + '_')) {
            includeOpts = utils.shallowCopy({}, self.opts);
            includeObj = includeSource(include[1], includeOpts);
            if (self.opts.compileDebug) {
              includeSrc =
                  '    ; (function(){' + '\n'
                  + '      var __line = 1' + '\n'
                  + '      , __lines = ' + JSON.stringify(includeObj.template) + '\n'
                  + '      , __filename = ' + JSON.stringify(includeObj.filename) + ';' + '\n'
                  + '      try {' + '\n'
                  + includeObj.source
                  + '      } catch (e) {' + '\n'
                  + '        rethrow(e, __lines, __filename, __line);' + '\n'
                  + '      }' + '\n'
                  + '    ; }).call(this)' + '\n';
            }else{
              includeSrc = '    ; (function(){' + '\n' + includeObj.source +
                  '    ; }).call(this)' + '\n';
            }
            self.source += includeSrc;
            self.dependencies.push(exports.resolveInclude(include[1],
                includeOpts.filename));
            return;
          }
        }
        self.scanLine(line);
      });
    }

  },

  parseTemplateText: function () {
    var str = this.templateText;
    var pat = this.regex;
    var result = pat.exec(str);
    var arr = [];
    var firstPos;

    while (result) {
      firstPos = result.index;

      if (firstPos !== 0) {
        arr.push(str.substring(0, firstPos));
        str = str.slice(firstPos);
      }

      arr.push(result[0]);
      str = str.slice(result[0].length);
      result = pat.exec(str);
    }

    if (str) {
      arr.push(str);
    }

    return arr;
  },

  scanLine: function (line) {
    var self = this;
    var d = this.opts.delimiter;
    var newLineCount = 0;

    function _addOutput() {
      if (self.truncate) {
        // Only replace single leading linebreak in the line after
        // -%> tag -- this is the single, trailing linebreak
        // after the tag that the truncation mode replaces
        // Handle Win / Unix / old Mac linebreaks -- do the \r\n
        // combo first in the regex-or
        line = line.replace(/^(?:\r\n|\r|\n)/, '');
        self.truncate = false;
      }
      else if (self.opts.rmWhitespace) {
        // Gotta be more careful here.
        // .replace(/^(\s*)\n/, '$1') might be more appropriate here but as
        // rmWhitespace already removes trailing spaces anyway so meh.
        line = line.replace(/^\n/, '');
      }
      if (!line) {
        return;
      }

      // Preserve literal slashes
      line = line.replace(/\\/g, '\\\\');

      // Convert linebreaks
      line = line.replace(/\n/g, '\\n');
      line = line.replace(/\r/g, '\\r');

      // Escape double-quotes
      // - this will be the delimiter during execution
      line = line.replace(/"/g, '\\"');
      self.source += '    ; __append("' + line + '")' + '\n';
    }

    newLineCount = (line.split('\n').length - 1);

    switch (line) {
      case '<' + d:
      case '<' + d + '_':
        this.mode = Template.modes.EVAL;
        break;
      case '<' + d + '=':
        this.mode = Template.modes.ESCAPED;
        break;
      case '<' + d + '-':
        this.mode = Template.modes.RAW;
        break;
      case '<' + d + '#':
        this.mode = Template.modes.COMMENT;
        break;
      case '<' + d + d:
        this.mode = Template.modes.LITERAL;
        this.source += '    ; __append("' + line.replace('<' + d + d, '<' + d) + '")' + '\n';
        break;
      case d + d + '>':
        this.mode = Template.modes.LITERAL;
        this.source += '    ; __append("' + line.replace(d + d + '>', d + '>') + '")' + '\n';
        break;
      case d + '>':
      case '-' + d + '>':
      case '_' + d + '>':
        if (this.mode == Template.modes.LITERAL) {
          _addOutput();
        }

        this.mode = null;
        this.truncate = line.indexOf('-') === 0 || line.indexOf('_') === 0;
        break;
      default:
        // In script mode, depends on type of tag
        if (this.mode) {
          // If '//' is found without a line break, add a line break.
          switch (this.mode) {
            case Template.modes.EVAL:
            case Template.modes.ESCAPED:
            case Template.modes.RAW:
              if (line.lastIndexOf('//') > line.lastIndexOf('\n')) {
                line += '\n';
              }
          }
          switch (this.mode) {
            // Just executing code
            case Template.modes.EVAL:
              this.source += '    ; ' + line + '\n';
              break;
            // Exec, esc, and output
            case Template.modes.ESCAPED:
              this.source += '    ; __append(escape(' +
                line.replace(_TRAILING_SEMCOL, '').trim() + '))' + '\n';
              break;
            // Exec and output
            case Template.modes.RAW:
              this.source += '    ; __append(' +
                line.replace(_TRAILING_SEMCOL, '').trim() + ')' + '\n';
              break;
            case Template.modes.COMMENT:
              // Do nothing
              break;
            // Literal <%% mode, append as raw output
            case Template.modes.LITERAL:
              _addOutput();
              break;
          }
        }
        // In string mode, just add the output
        else {
          _addOutput();
        }
    }

    if (self.opts.compileDebug && newLineCount) {
      this.currentLine += newLineCount;
      this.source += '    ; __line = ' + this.currentLine + '\n';
    }
  }
};

/**
 * Escape characters reserved in XML.
 *
 * This is simply an export of {@link module:utils.escapeXML}.
 *
 * If `markup` is `undefined` or `null`, the empty string is returned.
 *
 * @param {String} markup Input string
 * @return {String} Escaped string
 * @public
 * @func
 * */
exports.escapeXML = utils.escapeXML;

/**
 * Express.js support.
 *
 * This is an alias for {@link module:ejs.renderFile}, in order to support
 * Express.js out-of-the-box.
 *
 * @func
 */

exports.__express = exports.renderFile;

// Add require support
/* istanbul ignore else */
if (require.extensions) {
  require.extensions['.ejs'] = function (module, flnm) {
    var filename = flnm || /* istanbul ignore next */ module.filename;
    var options = {
          filename: filename,
          client: true
        };
    var template = fs.readFileSync(filename).toString();
    var fn = exports.compile(template, options);
    module._compile('module.exports = ' + fn.toString() + ';', filename);
  };
}

/**
 * Version of EJS.
 *
 * @readonly
 * @type {String}
 * @public
 */

exports.VERSION = _VERSION_STRING;

/* istanbul ignore if */
if (typeof window != 'undefined') {
  window.ejs = exports;
}

},{"../package.json":5,"./utils":4,"fs":2,"path":6}],4:[function(require,module,exports){
/*
 * EJS Embedded JavaScript templates
 * Copyright 2112 Matthew Eernisse (mde@fleegix.org)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
*/

/**
 * Private utility functions
 * @module utils
 * @private
 */

'use strict';

var regExpChars = /[|\\{}()[\]^$+*?.]/g;

/**
 * Escape characters reserved in regular expressions.
 *
 * If `string` is `undefined` or `null`, the empty string is returned.
 *
 * @param {String} string Input string
 * @return {String} Escaped string
 * @static
 * @private
 */
exports.escapeRegExpChars = function (string) {
  // istanbul ignore if
  if (!string) {
    return '';
  }
  return String(string).replace(regExpChars, '\\$&');
};

var _ENCODE_HTML_RULES = {
      '&': '&amp;'
    , '<': '&lt;'
    , '>': '&gt;'
    , '"': '&#34;'
    , "'": '&#39;'
    }
  , _MATCH_HTML = /[&<>\'"]/g;

function encode_char(c) {
  return _ENCODE_HTML_RULES[c] || c;
};

/**
 * Stringified version of constants used by {@link module:utils.escapeXML}.
 *
 * It is used in the process of generating {@link ClientFunction}s.
 *
 * @readonly
 * @type {String}
 */

var escapeFuncStr =
  'var _ENCODE_HTML_RULES = {\n'
+ '      "&": "&amp;"\n'
+ '    , "<": "&lt;"\n'
+ '    , ">": "&gt;"\n'
+ '    , \'"\': "&#34;"\n'
+ '    , "\'": "&#39;"\n'
+ '    }\n'
+ '  , _MATCH_HTML = /[&<>\'"]/g;\n'
+ 'function encode_char(c) {\n'
+ '  return _ENCODE_HTML_RULES[c] || c;\n'
+ '};\n';

/**
 * Escape characters reserved in XML.
 *
 * If `markup` is `undefined` or `null`, the empty string is returned.
 *
 * @implements {EscapeCallback}
 * @param {String} markup Input string
 * @return {String} Escaped string
 * @static
 * @private
 */

exports.escapeXML = function (markup) {
  return markup == undefined
    ? ''
    : String(markup)
        .replace(_MATCH_HTML, encode_char);
};
exports.escapeXML.toString = function () {
  return Function.prototype.toString.call(this) + ';\n' + escapeFuncStr
};

/**
 * Copy all properties from one object to another, in a shallow fashion.
 *
 * @param  {Object} to   Destination object
 * @param  {Object} from Source object
 * @return {Object}      Destination object
 * @static
 * @private
 */
exports.shallowCopy = function (to, from) {
  from = from || {};
  for (var p in from) {
    to[p] = from[p];
  }
  return to;
};

/**
 * Simple in-process cache implementation. Does not implement limits of any
 * sort.
 *
 * @implements Cache
 * @static
 * @private
 */
exports.cache = {
  _data: {},
  set: function (key, val) {
    this._data[key] = val;
  },
  get: function (key) {
    return this._data[key];
  },
  reset: function () {
    this._data = {};
  }
};


},{}],5:[function(require,module,exports){
module.exports={
  "_args": [
    [
      {
        "raw": "ejs",
        "scope": null,
        "escapedName": "ejs",
        "name": "ejs",
        "rawSpec": "",
        "spec": "latest",
        "type": "tag"
      },
      "C:\\Users\\rosty\\Desktop\\no-server-project"
    ]
  ],
  "_from": "ejs@latest",
  "_id": "ejs@2.5.2",
  "_inCache": true,
  "_installable": true,
  "_location": "/ejs",
  "_nodeVersion": "4.2.2",
  "_npmOperationalInternal": {
    "host": "packages-12-west.internal.npmjs.com",
    "tmp": "tmp/ejs-2.5.2.tgz_1473259584869_0.9678213631268591"
  },
  "_npmUser": {
    "name": "mde",
    "email": "mde@fleegix.org"
  },
  "_npmVersion": "2.14.7",
  "_phantomChildren": {},
  "_requested": {
    "raw": "ejs",
    "scope": null,
    "escapedName": "ejs",
    "name": "ejs",
    "rawSpec": "",
    "spec": "latest",
    "type": "tag"
  },
  "_requiredBy": [
    "#USER"
  ],
  "_resolved": "https://registry.npmjs.org/ejs/-/ejs-2.5.2.tgz",
  "_shasum": "21444ba09386f0c65b6eafb96a3d51bcb3be80d1",
  "_shrinkwrap": null,
  "_spec": "ejs",
  "_where": "C:\\Users\\rosty\\Desktop\\no-server-project",
  "author": {
    "name": "Matthew Eernisse",
    "email": "mde@fleegix.org",
    "url": "http://fleegix.org"
  },
  "bugs": {
    "url": "https://github.com/mde/ejs/issues"
  },
  "contributors": [
    {
      "name": "Timothy Gu",
      "email": "timothygu99@gmail.com",
      "url": "https://timothygu.github.io"
    }
  ],
  "dependencies": {},
  "description": "Embedded JavaScript templates",
  "devDependencies": {
    "browserify": "^13.0.1",
    "eslint": "^3.0.0",
    "istanbul": "~0.4.3",
    "jake": "^8.0.0",
    "jsdoc": "^3.4.0",
    "lru-cache": "^4.0.1",
    "mocha": "^3.0.2",
    "rimraf": "^2.2.8",
    "uglify-js": "^2.6.2"
  },
  "directories": {},
  "dist": {
    "shasum": "21444ba09386f0c65b6eafb96a3d51bcb3be80d1",
    "tarball": "https://registry.npmjs.org/ejs/-/ejs-2.5.2.tgz"
  },
  "engines": {
    "node": ">=0.10.0"
  },
  "homepage": "https://github.com/mde/ejs",
  "keywords": [
    "template",
    "engine",
    "ejs"
  ],
  "license": "Apache-2.0",
  "main": "./lib/ejs.js",
  "maintainers": [
    {
      "name": "tjholowaychuk",
      "email": "tj@vision-media.ca"
    },
    {
      "name": "mde",
      "email": "mde@fleegix.org"
    }
  ],
  "name": "ejs",
  "optionalDependencies": {},
  "readme": "ERROR: No README data found!",
  "repository": {
    "type": "git",
    "url": "git://github.com/mde/ejs.git"
  },
  "scripts": {
    "coverage": "istanbul cover node_modules/mocha/bin/_mocha",
    "devdoc": "rimraf out && jsdoc -p -c jsdoc.json lib/* docs/jsdoc/*",
    "doc": "rimraf out && jsdoc -c jsdoc.json lib/* docs/jsdoc/*",
    "test": "mocha"
  },
  "version": "2.5.2"
}

},{}],6:[function(require,module,exports){
(function (process){
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

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))
},{"_process":7}],7:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],8:[function(require,module,exports){
var basil = require('basil.js');
basil = new	basil();

exports.get = function(key)	{
    return	basil.get(key);
};
exports.set =	function(key,	value)	{
    return	basil.set(key,	value);
};
},{"basil.js":1}],9:[function(require,module,exports){

var ejs = require('ejs');


exports.COMMENT_NODE = ejs.compile("<div class=\"comment\">\r\n    <div class=\"user-info\">\r\n        <div class=\"clearfix\">\r\n            <img src=\"<%=author.photoUrl%>\" class=\"user-photo pull-right\"></img>\r\n        </div>\r\n        <div class=\"clearfix\">\r\n            <div class=\"user-name pull-right\"><%=author.name%></div>\r\n        </div>\r\n        <div class=\"comment-time pull-right\"><%=comment.time%></div>\r\n    </div>\r\n    <div class=\"comment-box\">\r\n        <img src=\"<%=comment.photo%>\" class=\"comment-photo\"></img>\r\n        <div class=\"stars\">\r\n            <% for (var i = 0; i < 5; i++)\r\n            if (i < comment.score) { %>\r\n            <i class=\"fa fa-star\" aria-hidden=\"true\"></i>\r\n            <% } else { %>\r\n            <i class=\"fa fa-star-o\" aria-hidden=\"true\"></i>\r\n            <% } %>\r\n        </div>\r\n        <div class=\"comment-text\"><%=comment.text%></div>\r\n        <div class=\"comment-footer\">\r\n            <div class=\"pull-left\">\r\n                <div>\r\n                    <i class=\"fa fa-map-marker\" aria-hidden=\"true\"></i>\r\n                    <div id=\"location\"><%=comment.location%></div>\r\n                </div>\r\n            </div>\r\n            <div class=\"pull-right\">\r\n                <div>\r\n                    <i class=\"fa fa-thumbs-up\" aria-hidden=\"true\"></i>\r\n                    <div id=\"likes-count\"><%=comment.likes%></div>\r\n                </div>\r\n            </div>\r\n        </div>\r\n    </div>\r\n</div>");
exports.OVERVIEW = ejs.compile("<div class=\"city-logo\">\r\n    <img src=\"<%=info.cityLogo%>\" class=\"round-photo-logo\">\r\n    <span class=\"city-name\" id=\"current-city-name\"><%=info.name%></span>\r\n    <a class=\"btn btn-default pull-right\" style=\"margin-top: 10px;\" id=\"addCityToMap\" href=\"#gmap\">Add</a>\r\n</div>\r\n<img src=\"<%=info.cityMapImage%>\" class=\"city-map\">\r\n<div class=\"overview\">\r\n    <div class=\"header-text\">Overview</div>\r\n    <h5 id=\"current-city-overview\"><%=info.overview%></h5>\r\n    <div class=\"stats\">\r\n        <div class=\"weather row\">\r\n            <i class=\"fa fa-sun-o icon\" aria-hidden=\"true\"></i>\r\n            <div class=\"stats-text\">Weather: </div>\r\n            <div class=\"text\" id=\"current-weather\"><%=info.weather%></div>\r\n        </div>\r\n        <div class=\"time row\">\r\n            <i class=\"fa fa-clock-o icon\" aria-hidden=\"true\"></i>\r\n            <div class=\"stats-text\">Local time: </div>\r\n            <div class=\"text\" id=\"current-local-time\"><%=info.localTime%></div>\r\n        </div>\r\n        <div class=\"population row\">\r\n            <i class=\"fa fa-globe icon\" aria-hidden=\"true\"></i>\r\n            <div class=\"stats-text\">Population: </div>\r\n            <div class=\"text\" id=\"current-population\"><%=info.population%></div>\r\n        </div>\r\n        <div class=\"cost row\">\r\n            <i class=\"fa fa-credit-card icon\" aria-hidden=\"true\"></i>\r\n            <div class=\"stats-text\">Cost of living: </div>\r\n            <div class=\"text\" id=\"current-cost-living\"><%=info.costLiving%></div>\r\n        </div>\r\n        <div class=\"internet row\">\r\n            <i class=\"fa fa-signal icon\" aria-hidden=\"true\"></i>\r\n            <div class=\"stats-text\">Internet: </div>\r\n            <div class=\"text\" id=\"current-internet\"><%=info.internet%></div>\r\n        </div>\r\n        <div class=\"worplaces row\">\r\n            <i class=\"fa fa-briefcase icon\" aria-hidden=\"true\"></i>\r\n            <div class=\"stats-text\">Workplaces: </div>\r\n            <div class=\"text\" id=\"current-workplaces\"><%=info.workplace%></div>\r\n        </div>\r\n        <div class=\"safety row\">\r\n            <i class=\"fa fa-leaf icon\" aria-hidden=\"true\"></i>\r\n            <div class=\"stats-text\">Safety: </div>\r\n            <div class=\"text\" id=\"current-safety\"><%=info.safety%></div>\r\n        </div>\r\n        <div class=\"languages row\">\r\n            <i class=\"fa fa-book icon\" aria-hidden=\"true\"></i>\r\n            <div class=\"stats-text\">Languages: </div>\r\n            <div class=\"text\" id=\"current-languages\"><%=info.languages%></div>\r\n        </div>\r\n        <div class=\"nightlife row\">\r\n            <i class=\"fa fa-glass icon\" aria-hidden=\"true\"></i>\r\n            <div class=\"stats-text\">Nightlife: </div>\r\n            <div class=\"text\" id=\"current-nightlife\"><%=info.nightlife%></div>\r\n        </div>\r\n    </div>\r\n</div>\r\n<div class=\"photo-container\">\r\n    <img class=\"photo-item big-photo\" src=\"http://www.jetblue.com/img/vacations/destination/NewYorkSkyline_960x420.jpg\">\r\n    <div>\r\n        <img class=\"photo-item\" src=\"http://www.nyhabitat.com/blog/wp-content/uploads/2016/08/Apartments-new-york-personality-types-Central-Park-Manhattan-skyline-NYC.jpg\">\r\n        <img class=\"photo-item\" src=\"https://media-cdn.tripadvisor.com/media/photo-s/03/9b/2d/f2/new-york-city.jpg\">\r\n</div>");
exports.SLIDER = ejs.compile("<button class=\"pic\">\r\n        <div class=\"slider-city-name text-center\"><%=slider.name%></div>\r\n        <div class=\"hover\">\r\n            <div class=\"hover-city-name\"><%=slider.name%></div>\r\n            <div class=\"hover-city-info\"><%=slider.shortOverview%></div>\r\n            <div class=\"hover-star\">\r\n                <i class=\"fa fa-star\" aria-hidden=\"true\"></i> Good\r\n            </div>\r\n        </div>\r\n </button>");
exports.FORM = ejs.compile("<div class=\"login-container\">\r\n    <div id=\"login-form\">\r\n        <form class=\"form\">\r\n                <input type=\"email\" name=\"email\" placeholder=\"Email\" class=\"email\" required>\r\n                <input type=\"password\" name=\"password\" placeholder=\"Password\" class=\"password\" required>\r\n                <input type=\"submit\" name=\"login-btn\" value=\"Log in\" class=\"submit-btn\">\r\n                <!--<div class=\"social-login\">-->\r\n                    <!--<button class=\"loginBtn loginBtn&#45;&#45;google\">Login with Google</button>-->\r\n                <!--</div>-->\r\n        </form>\r\n        <div class=\"other-option\">\r\n            <h3>Don't have an account?</h3>\r\n            <a href=\"signup.html\">\r\n                <div  id=\"signup-btn\">Sign up</div>\r\n            </a>\r\n        </div>\r\n    </div>\r\n</div>");
exports.PROFILE = ejs.compile("<div class=\"profile-container\" >\r\n    <div id=\"profile-container\">\r\n        <div class=\"row profile-row\">\r\n            <div class=\"col-md-4 left-column\">\r\n                <img class=\"profile-picture\" src=\"<%=author.photoUrl%>\">\r\n                <div class=\"profile-text-box\">\r\n                    <h3 id=\"profile-name\"><%=author.name%></h3>\r\n                    <br>\r\n                    <h3 id=\"profile-email\"><%=author.email%></h3>\r\n                </div>\r\n            </div>\r\n            <div class=\"col-md-8 right-column\">\r\n                <div id=\"profile-comment-list\">\r\n\r\n                </div>\r\n            </div>\r\n        </div>\r\n    </div>\r\n</div>");
exports.PHOTO =  ejs.compile("<div class=\"profile-container\" >\r\n    <img src=\"<%=photo%>\" class=\"full-photo\">\r\n</div>");
},{"ejs":3}],10:[function(require,module,exports){
var auth = firebase.auth();
var database = firebase.database();

var profileJS = require('./profile');

var datUser;

function singInGoogle() {
    var provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider);
}

function singOut() {
    auth.signOut();
}

function onAuthStateChanged(user) {
    if (user) {
        // setUserData(user);
        $('#login-menu-btn').hide();
        $('#current-user').text(user.displayName);
        $('#currentUserBtn').show();
        // $('#profile-btn').click(function () {
        //     console.log('click-click');
        //     profileJS.showInfo(datUser);
        // });
        // console.log(user.uid);
        // getUser(user.uid);
        $('#signout-btn').click(function () {
            singOut();
        });


    } else {
        $('#currentUserBtn').hide();
        $('#login-menu-btn').show();
    }

}

 function setUserData(user) {

    var ref = database.ref('database/users/' + user.uid).set({
        name: user.displayName,
        email: user.email,
        photoUrl: user.photoURL || "https://firebasestorage.googleapis.com/v0/b/travel-web-project-b1596.appspot.com/o/person-placeholder.jpg?alt=media&token=68281f5f-4ec0-43de-9fab-c50a1eda171e",
        uid: user.uid
    });
}

function getUser(uid) {
    console.log("fack");
    var ref = database.ref('database/user'+uid);
    ref.off();
    var get_info = function (data) {
        datUser = data.val();
        console.log("asd")
        console.log(datUser);
    };
    ref.on('value', get_info);
}



exports.signInGoogle = singInGoogle;
exports.signOut = singOut;
exports.onAuthStateChanged = onAuthStateChanged;
exports.auth = auth;
},{"./profile":18}],11:[function(require,module,exports){
var commentsJS = require('./comments');
var overviewJS = require('./overview');

var LocalStorage = require('../LocalStorage');
const LocalStorageKey = "LocalStorageKey";


var database = firebase.database();


function getComments(cityName) {
    $('#comment-list').html("");
    var commentRef = database.ref('database/cities/'+cityName+'/comments');
    commentRef.off();
    var get_info = function (data) {
        getAuthor(data.val());
    };
    commentRef.on('value', get_info);

    function getAuthor(val) {
        function getCurrentUser(currentComment) {
            var refUser = database.ref('database/users/' + currentComment.author);

            refUser.off();
            function get_user(data) {
                commentsJS.initComments({comment: currentComment, author: data.val()});
            }

            refUser.on('value', get_user);
        }
        val.forEach(getCurrentUser);
    }
}

function getOverview(cityName) {
    var ref = database.ref('database/cities/'+cityName);

    var get_data = function (data) {
        overviewJS.initOverview(data.val());
    };

    ref.on('value', get_data);
}

function updateCity(cityName) {
    commentsJS.flushArray();
    LocalStorage.set(LocalStorageKey, cityName);
    getComments(cityName);
    getOverview(cityName);
}

function init() {
    var localStorage = LocalStorage.get(LocalStorageKey);
    if(localStorage){
        updateCity(localStorage);
    }
    else {
        LocalStorage.set(LocalStorageKey, 'New-York');
        updateCity('New-York');
    }
}

exports.init = init;
exports.updateCity = updateCity;
},{"../LocalStorage":8,"./comments":12,"./overview":16}],12:[function(require,module,exports){
var Templates = require('../templates');
var profileJS = require('./profile');

var $comment_list = $('#comment-list');
var $page_turner = $('#page-turner');

var length;

var comments = [];

function showCommentsList(commentsList) {
    $page_turner.html("");
    $comment_list.html("");
    if(commentsList.length<4) {
        commentsList.forEach(showOneComment);
    } else {
        addPages(commentsList.length);
    }
}

function addPages(length){
    pagesCounter = Math.ceil((length/3.0));
    for(i = 0; i<3;i++){
        showOneComment(comments[i]);
    }
    for(i = 1; i<=pagesCounter; i++) {
        if(i==1) {
            $page_turner.append(
                '<div id="' + i + '" class="page">' + i + '</div>'
            )
        } else {
            $page_turner.append(
                '<div id="' + i + '" class="page">' + i + '</div>'
            )
        }
    }
    $page_turner.find('.page').click(function () {
        showPage(parseInt($(this).attr('id'), 10));
        $(this).addClass('active');
    });
}

function showPage(count) {
    $comment_list.html("");
    for(i = count*3-3; i<count*3; i++){
        showOneComment(comments[i]);
    }
}

function showOneComment(obj) {
    var html_code = Templates.COMMENT_NODE({comment: obj.comment, author: obj.author});
    var $node = $(html_code);

    $node.find('.user-photo').click(function () {
        profileJS.showInfo(obj.author);
    });

    $comment_list.append($node);
}

function showProfileComment(author, commentsA, $list){
    $list.html('');

    function showOne(comment) {
        var html_code = Templates.COMMENT_NODE({comment: comment, author: author});

        var $node = $(html_code);

        $list.append($node);
    }
    commentsA.forEach(showOne);
}

function filterComments(selected) {
    if(selected==0) showCommentsList(comments.reverse());
    else {
        showCommentsList(comments.reverse());
    }
}



function init(oneComment) {
    comments.push(oneComment);
    showCommentsList(comments);
}


exports.initComments = init;
exports.showProfileComment = showProfileComment;
exports.showCommentsList = showCommentsList;
exports.showPage = showPage;
exports.filterComments = filterComments;
exports.flushArray = function () {
  comments = [];
};
},{"../templates":21,"./profile":18}],13:[function(require,module,exports){
var Templates = require('../Templates');
var authJS = require('./auth');

var $cont = $('#popup');

function initForm() {
    var html_code = Templates.FORM();

    var $node = $(html_code);


    $cont.append($node);
}

function destroyForm() {
    $cont.html("");
}

exports.initForm = initForm;
exports.destroyForm = destroyForm;
},{"../Templates":9,"./auth":10}],14:[function(require,module,exports){
var formJS = require('./form');
var commentJS = require('./comments');
var sliderJS = require('./slider');
var mapJS = require('./map');

function initListeners() {
    $("#login-menu-btn").click(function () {
        formJS.initForm();
    });

    $("#popup").click(function (evt) {

        if ($(evt.target).closest('#login-form').length)
            return;
        if ($(evt.target).closest('.profile-row').length)
            return;
        if ($(evt.target).closest('.full-photo').length)
            return;

        formJS.destroyForm();
    });

    $('#carousel').carousel();

    $('.carousel-control').click(function(e){
        e.preventDefault();
        $('#carousel').carousel( $(this).data() );
    });

    $(document).ready(function(){
        var scroll_start = 0;
            $(document).scroll(function() {
                scroll_start = $(this).scrollTop();
                if(scroll_start > 50) {
                    $(".my-row").css({'background-color':'white','box-shadow': '0px 1px 10px 0px rgba(0,0,0,0.50)'});
                } else {
                    $('.my-row').css({'background-color': 'transparent', 'box-shadow':'none'});
                }
            });
    });

    var $select = $('.down-menu');
    $select.on('change', function () {
        var selected = $select.prop('selectedIndex');
        commentJS.filterComments(selected);
    });

    $('.search-query').keyup(function () {
        sliderJS.findByName($('.search-query').val())
    })

}

exports.initListeners = initListeners;
},{"./comments":12,"./form":13,"./map":15,"./slider":19}],15:[function(require,module,exports){

var map;

function	initialize() {
//Тут починаємо працювати з картою
    var mapProp = {
        center: new google.maps.LatLng(50.464379, 30.519131),
        zoom: 4
    };
    var html_element = document.getElementById("gmap");
    map = new google.maps.Map(html_element, mapProp);

    var point = new google.maps.LatLng(50.464379, 30.519131);
    var marker = new google.maps.Marker({
        position: point,
        map: map

    });


    google.maps.event.addListener(map, 'click',function(me){
        var coordinates	=	me.latLng;
        setMarker(coordinates);

    });

}


function setMarker(coor) {
    var point	=	coor;
    var marker	=	new	google.maps.Marker({
        position:	point,
        map:	map,
        draggable: false,
        animation: google.maps.Animation.DROP
    });
}

function geocode(name) {
    geocodeAddress(name, function (err, coor) {
        if(err)
            console.log(err)
        else
            setMarker(coor);
    })
}

function	geocodeAddress(address,	 callback)	{
    var geocoder	=	new	google.maps.Geocoder();
    geocoder.geocode({'address':	address},	function(results,	status)	{
        if	(status	===	google.maps.GeocoderStatus.OK&&	results[0])	{
            var coordinates	=	results[0].geometry.location;
            callback(null,	coordinates);
        }	else	{
            callback(new	Error("Can	not	find	the	adress"));
        }
    });
}

exports.initialize = initialize;
exports.geocode = geocode;


},{}],16:[function(require,module,exports){
var Templates = require('../templates');
var photoJs = require('./photo');
var mapJS = require('./map');

var $overviewContainer = $('#overview_container');

function showOverview(info) {
    $overviewContainer.html("");

    var html_code = Templates.OVERVIEW({info:info});

    var $node = $(html_code);

    //Listeners
    var $photo = $node.find('.photo-item');
    $photo.click(function () {
        photoJs.showPhoto($(this).attr('src'));
    });

    $node.find('#addCityToMap').click(function () {
        mapJS.geocode(info.name);
    });


    $overviewContainer.append($node);
}

exports.initOverview = showOverview;
},{"../templates":21,"./map":15,"./photo":17}],17:[function(require,module,exports){
var Templates = require('../templates');

var $cont = $('#popup');

function showPhoto(url) {
    var html_code = Templates.PHOTO({photo:url})

    var $node = $(html_code);

    $cont.append($node);
}

exports.showPhoto = showPhoto;
},{"../templates":21}],18:[function(require,module,exports){
var Templates = require('../templates');
var commentSJS = require('./comments');

var database = firebase.database();

var profileComments = [];

var $cont = $('#popup');

function showInfo(author){
    getAuthorComments(author.uid);

    var html_code = Templates.PROFILE({author:author});

    var $node = $(html_code);

    commentSJS.showProfileComment(author, profileComments, $node.find('#profile-comment-list'));

    $cont.append($node);
}

function destroyProfile() {
    $cont.html("");
}

function getAuthorComments(id){
    var commentRef = database.ref('database/users/'+id+"/comments");
    commentRef.off();
    var get_info = function (data) {
        var val = data.val();
        profileComments = val;
    };
    commentRef.on('value', get_info);
}

exports.showInfo = showInfo;
},{"../templates":21,"./comments":12}],19:[function(require,module,exports){
var Templates = require('../templates');
var cityJS = require('./city');

var database = firebase.database();

var cities = [];

function getSlider() {
    cities = [];
    var ref = database.ref('database/cities');

    ref.off();

    var get_info = function (data) {
        showOneItem(data.val());
    };

    ref.limitToLast(5).on('child_added', get_info);
}

var $slider_list = $('#slider-list');

function showSlider(sliderList) {
    $slider_list.html("");

    sliderList.forEach(showOneItem);
}

function showOneItem(slider) {
    cities.push(slider);
    var html_code = Templates.SLIDER({slider: slider});

    var $node = $(html_code);

    setBackground($node, slider.imageUrl);

    $node.click(function () {
        cityJS.updateCity(slider.name);
    });

    $slider_list.append($node);
}

function showOneItemSearch(slider) {
    var html_code = Templates.SLIDER({slider: slider});

    var $node = $(html_code);

    setBackground($node, slider.imageUrl);

    $node.click(function () {
        cityJS.updateCity(slider.name);
    });

    $slider_list.append($node);
}

function setBackground(node, photo) {
    var className = photo;
    var classElement = node.addClass(className);
    $(classElement).css('background-image', 'url(' + photo + ')');
}

function findByName(name) {
    $slider_list.html("");
    if(!name){ initSlider(cities); return;}
    cities.forEach(function (city) {
        var cityname = city.name.toLowerCase().substring(0, name.length);
        if(cityname==name) showOneItemSearch(city);
    });
}

function initSlider() {
    getSlider();
}

exports.initSlider = initSlider;
exports.findByName = findByName;
},{"../templates":21,"./city":11}],20:[function(require,module,exports){
$(function(){
    var cityJS = require('./js/city');
    var sliderJS = require('./js/slider');
    var listenersJS = require('./js/listeners');
    var mapJS = require('./js/map');
    // var authJS = require('./js/auth');

    cityJS.init();
    sliderJS.initSlider();
    listenersJS.initListeners();
    mapJS.initialize();

    // authJS.auth.onAuthStateChanged(authJS.onAuthStateChanged);
    function showPage(id){
        commentJS.showPage(id);
    }


});
},{"./js/city":11,"./js/listeners":14,"./js/map":15,"./js/slider":19}],21:[function(require,module,exports){
arguments[4][9][0].apply(exports,arguments)
},{"dup":9,"ejs":3}]},{},[20]);
