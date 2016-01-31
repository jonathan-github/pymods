/**
 * @file utility classes and functions
 */

/**
 * utils namespace
 * @namespace
 */
var utils;
if (!window.utils) {
    window.utils = {};
}

/// set the debugging level
utils.debug = 0;

/// utils.assert guard check
utils.check = true;

/**
 * Throw an exception if the condition is not true.
 * @param {boolean} condition
 * @param {String} message
 */
utils.assertThrow = function(condition, message, log) {
    if (!condition) {
	if (log) {
	    console.log.apply(console, log);
	}
	throw new Error(message);
    }
};

/// set to false to disable asserts
utils.assert = utils.assertThrow;

/**
 * Create an object for a given prototye object.
 * @param {Object} proto the prototype object
 * @returns {Object} the newly created object
 */
utils.create = function(proto) {
    return Object.create(proto);
};

/**
 * Create an object for a given prototye object and
 * extend it with the properties from the extension object.
 * @param {Object} proto the prototype object
 * @param {Object} obj the extension object
 * @returns {Objec} the newly created object
 */
utils.extend = function(proto, obj) {
    var props = {};
    var names = Object.getOwnPropertyNames(obj);
    for (var i = 0, n = names.length; i < n; ++i) {
	var name = names[i];
	props[name] = {
	    value: obj[name],
	    enumerable: true,
	    writable: true
	};
    }
    return Object.create(proto, props);
};

/**
 * Prototype object.
 * @mixin
 */
utils.Object = {
    create: function() {
	var obj = utils.create(this);
	if (obj.init) {
	    obj.init.apply(obj, arguments);
	}
	return obj;
    },
    clone: function() {
	return utils.create(this);
    },
    extend: function(props) {
	var obj = utils.extend(this, props);
	if (obj.init) {
	    var args = Array.prototype.slice.call(arguments, 1);
	    obj.init.apply(obj, args);
	}
	return obj;
    },
    init: function() {
	return this;
    }
};

/**
 * Append the second array to the first array.
 * @param {Array} a the first array
 * @param {Array} b the second array
 * @returns the first array
 */
utils.append = function(a, b) {
    a.push.apply(a, b);
    return a;
};

/**
 * Set the CSS styles for an HTML element.
 * @param {HTMLElement} el
 * @param {Object} styles
 * @returns {HTMLElement} the element
 */
utils.styleSet = function(el, styles) {
    var st = el.style;
    for (var prop in styles) {
	st[prop] = styles[prop];
    }
    return el;
};

/// The list of browser specific names for the user-select CSS style.
utils.userSelectStyleNames = [
    '-moz-user-select',
    '-webkit-user-select',
    '-ms-user-select'
];

/**
 * Set the non-standard user-select CSS style.
 * @param {HTMLElement} el the HTML element to set
 * @param {String} mode the value for the user-select style
 */
utils.userSelectSet = function(el, mode) {
    for (var i = 0, n = utils.userSelectStyleNames.length; i < n; ++i) {
	el.style[utils.userSelectStyleNames[i]] = mode;
    }
};

/**
 * @typedef utils.paddingGet#padding
 * @type {Object}
 * @property {Number} left - the left padding in pixels
 * @property {Number} right - the right padding in pixels
 * @property {Number} top - the top padding in pixels
 * @property {Number} bottom - the bottom padding in pixels
 */

/**
 * Get the computed padding for the HTML element.
 * @param {HTMLElement} el the HTML element to set
 * @returns {utils.paddingGet#padding} the computed padding
 */
utils.paddingGet = function(el) {
    var cs = window.getComputedStyle(el);
    return {
	left: parseInt(cs['padding-left']),
	right: parseInt(cs['padding-right']),
	top: parseInt(cs['padding-top']),
	bottom: parseInt(cs['padding-bottom'])
    };
};

/**
 * Clear the content of the specified HTML element.
 * @param {HTMLElement} el the element to clear
 * @param {Integer} col the column
 * @returns {HTMLElement} the element
 */
utils.contentClear = function(el) {
    while (el.lastChild) {
	el.removeChild(el.lastChild);
    }
    return el;
};

/**
 * Set the content for the specified HTML element.
 * @param {HTMLElement} el the element
 * @param {HTMLElement} content the content
 * @returns {HTMLElement} the element
 */
utils.contentSet = function(el, content) {
    if (!content || content.parentNode != el) {
	utils.contentClear(el);
    }
    if (content) {
	el.appendChild(content);
    }
    return el;
};

/**
 * Set the text content for the specified HTML element.
 * @param {HTMLElement} el the element
 * @param {String} text the text content
 * @returns {HTMLElement} the element
 */
utils.contentText = function(el, text) {
    // TBD: check if the current content matches text
    return utils.contentSet(el, document.createTextNode(text));
};

/**
 * Set the HTML content for the specified HTML element.
 * Warning: make sure the HTML content is properly escaped
 * or comes from a trusted source.
 * @param {HTMLElement} el the element
 * @param {String} html the HTML content
 * @returns {HTMLElement} the element
 */
utils.contentHTML = function(el, html) {
    el.innerHTML = html;
};

/**
 * Prototype for building HTML tables.
 * @mixin
 */
utils.TableBuilder = utils.extend(utils.Object, {
    /**
     * Initialize the object.
     * @returns {utils.TableBuilder} the object
     */
    init: function() {
	this.table = document.createElement('table');
	this.sections = [];
	this.section = null;
	this.rows = [];
	this.row = null;
	this.cells = null;
	this.cell = null;
	return this;
    },

    /**
     * Add a table section.
     * @param {String} [type=tbody] the type of the section to add
     * @returns {HTMLElement} the section element
     */
    sectionAdd: function(type) {
	var section = document.createElement(type || 'tbody');
	this.table.appendChild(section);
	this.section = section;
	this.sections.push(section);
	this.row = null;
	this.cells = null;
	this.cell = null;
	return section;
    },

    /**
     * Add a table row.
     * @returns {HTMLElement} the table row
     */
    rowAdd: function() {
	var section = this.section;
	if (!section) {
	    section = this.sectionAdd();
	}
	var row = document.createElement('tr');
	section.appendChild(row);
	this.row = row;
	this.cells = [];
	this.rows.push([row, this.cells]);
	return row;
    },

    /**
     * Remove a table row.
     * @param {Integer} row the index of the row to remove
     */
    rowRemove: function(row) {
	if (row < 0 || row >= this.rows.length) {
	    return;
	}
	var rec = this.rows[row];
	this.rows.splice(row, 1);
	var tr = rec[0];
	if (this.row == tr) {
	    this.row = null;
	    this.cells = null;
	}
	tr.parentNode.removeChild(tr);
    },

    /**
     * Shrink the table to at most the number of rows.
     * @param {Integer} count the number of rows to retain
     */
    rowsShrink: function(count) {
	var n = this.rows.length;
	if (count < 0 || count >= n) {
	    return;
	}
	while (n > count) {
	    this.rowRemove(--n);
	}
    },

    /**
     * Add a table cell.
     * @returns {HTMLElement} the table cell
     */
    cellAdd: function(type) {
	var row = this.row;
	if (!row) {
	    row = this.rowAdd();
	}
	var cell = document.createElement(type || 'td');
	row.appendChild(cell);
	this.cell = cell;
	this.cells.push(cell);
	return cell;
    },

    /**
     * Get the table cell at the specified row and column.
     * @param {Integer} row the row
     * @param {Integer} col the column
     * @returns {HTMLElement} the table cell
     */
    cellGet: function(row, col) {
	if (row < 0 || row >= this.rows.length) {
	    return null;
	}
	var cells = this.rows[row][1];
	if (col < 0 || col >= cells.length) {
	    return null;
	}
	return cells[col];
    }
});

/**
 * Prototype for building an overlay div for displaying information
 * above the page contents.
 * @mixin
 */
utils.Overlay = utils.extend(utils.Object, {
    /// The default CSS style to apply to the div.
    DEFAULT_STYLE: {
	position: 'fixed',
	top: '10px',
	left: '10px',
	background: 'white',
	opacity: 0.75
    },

    /**
     * @typedef utils.Overlay#config
     * @type {Object}
     * @property {Object} [style] - the CSS styles to apply to the div
     */

    /**
     * Initialize the object.
     * @param {utils.Overlay#config} config the configuration object
     * @returns {utils.Overlay} the object
     */
    init: function(config) {
	this.div = document.createElement('div');
	if (!config) {
	    config = {};
	}
	utils.styleSet(this.div, config.style || this.DEFAULT_STYLE);
	this.tb = utils.TableBuilder.create();
	this.div.appendChild(this.tb.table);
	this.hide();
	var parent = config.parent;
	if (!parent) {
	    parent = document.body;
	}
	parent.appendChild(this.div);
	return this;
    },

    /**
     * Hide the overlay.
     */
    hide: function() {
	this.div.style.visibility = 'hidden';
    },

    /**
     * Show the overlay.
     * @param {Object} rec the properties to display in the overlay table
     * @param {String[]} [props] the order in which to display the record properties
     */
    show: function(rec, props) {
	if (props == undefined) {
	    props = [];
	    for (var prop in rec) {
		props.push(prop);
	    }
	    props.sort();
	}
	var rows = 0;
	for (var i = 0, n = props.length; i < n; ++i) {
	    var prop = props[i];
	    var val = rec[prop];
	    var th, td;
	    if (this.tb.rows.length <= rows) {
		this.tb.rowAdd();
		th = this.tb.cellAdd('th');
		td = this.tb.cellAdd('td');
	    } else {
		th = this.tb.cellGet(rows, 0);
		td = this.tb.cellGet(rows, 1);
	    }
	    utils.contentText(th, prop + ":");
	    utils.contentHTML(td, val != undefined ? val : "");
	    ++rows;
	}
	this.tb.rowsShrink(rows);
	this.div.style.visibility = 'visible';
    }
});

/**
 * Prototype one-shot timer.
 * @mixin
 */
utils.Timeout = utils.extend(utils.Object, {
    /**
     * Check if the timer has started and is still running.
     * @returns {boolean} true if the timer is running
     */
    started: function() {
	return this.id != null;
    },

    /**
     * Start the timer.
     * @param {Number} delay the timeout in msec
     * @param {Function} func the callback function
     * @param {Object} [scope] the scope for the callback function
     * @param {Object} [param] the parameter to pass to the callback function
     */
    start: function(delay, func, scope, param) {
	var self = this;
	this.stop();
	this.id = window.setTimeout(function() {
	    self.id = null;
	    return func.call(scope, param);
	}, delay);
    },

    /**
     * Stop the timer.
     */
    stop: function() {
	if (this.id != null) {
	    window.clearTimeout(this.id);
	    this.id = null;
	}
    }
});

/**
 * Prototype repeating timer.
 * @mixin
 */
utils.Interval = utils.extend(utils.Object, {
    /**
     * Check if the timer has started and is still running.
     * @returns {boolean} true if the timer is running
     */
    started: function() {
	return this.id != null;
    },

    /**
     * Start the timer.
     * @param {Number} delay the timeout in msec
     * @param {Function} func the callback function
     * @param {Object} [scope] the scope for the callback function
     * @param {Object} [param] the parameter to pass to the callback function
     */
    start: function(delay, func, scope, param) {
	var self = this;
	this.stop();
	this.id = window.setInterval(function() {
	    self.id = null;
	    return func.call(scope, param);
	}, delay);
    },

    /**
     * Stop the timer.
     */
    stop: function() {
	if (this.id != null) {
	    window.clearInterval(this.id);
	    this.id = null;
	}
    }
});

/**
 * Prototype event listener remover.
 * @mixin
 */
utils.RemoveListener = utils.extend(utils.Object, {
    /**
     * Initialize the object.
     * @param {Object} obj the event target
     * @param {String} event the event type
     * @param {Function} func the event callback
     * @returns {utils.RemoveListener} the object
     */
    init: function(obj, event, func) {
	this.obj = obj;
	this.event = event;
	this.func = func;
	return this;
    },

    /**
     * Remove the event listener.
     */
    remove: function() {
	if (this.obj) {
	    this.obj.removeEventListener(this.event, this.func);
	    this.obj = null;
	    this.event = null;
	    this.func = null;
	}
    }
});

/**
 * Prototype event listener remover.
 * @mixin
 */
utils.RemoveListeners = utils.extend(utils.Object, {
    /**
     * Initialize the object.
     * @param {utils.RemoveListener[]} removers the set of event removers
     * @returns {utils.RemoveListeners} the object
     */
    init: function(removers) {
	this.removers = removers;
	return this;
    },

    /**
     * Remove the event listeners.
     */
    remove: function() {
	if (this.removers) {
	    for (var i = 0, n = this.removers.length; i < n; ++i) {
		this.removers[i].remove();
	    }
	    this.removers = null;
	}
    }
});

/**
 * Register an event listener.
 * @param {Object} obj the event target
 * @param {String} event the event type
 * @param {Function} func the event callback
 * @param {Object} [scope] the scope for the event callback
 * @returns {utils.RemoveListener} an object for removing the listener
 */
utils.on = function(obj, event, func, scope) {
    if (func == undefined) {
	return null;
    }
    if (typeof func != 'function') {
	throw new Error(
	    event + ": invalid handler function for event"
	);
    }
    if (scope) {
	func = func.bind(scope);
    }
    obj.addEventListener(event, func);
    return utils.RemoveListener.create(obj, event, func);
};

/**
 * Registers a set of event listeners.
 * If the listeners object has a scope property, then it is used
 * as the scope for all of the event callbacks.
 * @param {Object} obj the event target
 * @param {Object} listeners the event types and their associated callbacks
 * @returns {utils.RemoveListeners} an object for removing the listeners
 */
utils.listeners = function(obj, listeners) {
    var removers = [];
    var scope = listeners.scope;
    for (var event in listeners) {
	if (event != 'scope') {
	    var remover = utils.on(obj, event, listeners[event], scope);
	    if (remover) {
		removers.push(remover);
	    }
	}
    }
    var n = removers.length;
    if (n == 1) {
	return removers[0];
    } else if (n > 1) {
	return utils.RemoveListeners.create(removers);
    } else {
	return null;
    }
};

utils.LoadMask = utils.extend(utils.Object, {
    init: function() {
	this.div = document.createElement('div');
	this.div.className = 'load-mask';
	document.body.appendChild(this.div);
	this.count = 0;
    },

    show: function() {
	if (this.count++ == 0) {
	    this.div.style.display = 'block';
	}
    },

    hide: function(force) {
	if (this.count > 0 || force) {
	    if (--this.count == 0 || force) {
		this.count = 0;
		this.div.style.display = 'none';
	    }
	}
    }
});

/**
 * Prototype asset loader.
 * @mixin
 */
utils.Asset = utils.extend(utils.Object, {
    init: function(config) {
	this.state = 'pending';
	this.config = config || {};
	return this;
    },

    load: function() {
    },

    cleanup: function() {
	this.config = {};
	this.loader = null;
    },

    error: function(reason) {
	this.state = 'error';
	this.reason = reason;
	this.notify();
    },

    ready: function() {
	this.state = 'ready';
	this.notify();
    },

    notify: function() {
	//utils.debug && console.log("notify", this.state, this);
	if (this.config){
	    var func = this.config[this.state];
	    if (func) {
		func.call(this.config.scope, this);
	    }
	}
	if (this.loader) {
	    this.loader.update(this);
	}
    }
});

/**
 * Prototype batch asset loader.
 * @mixin
 * @mixes utils.Asset
 */
utils.AssetLoader = utils.extend(utils.Asset, {
    init: function(config) {
	utils.Asset.init.call(this, config);
	this.assets = [];
	this.cache = {};
	return this;
    },

    cleanup: function() {
	utils.Asset.cleanup.call(this);
	for (var i = 0, n = this.assets.length; i < n; ++i) {
	    this.assets[i].cleanup();
	}
	this.assets.length = 0;
	this.cache = {};
    },

    add: function(asset) {
	asset.loader = this;
	this.assets.push(asset);
    },

    batch: function(batch) {
	for (var name in batch) {
	    var asset = batch[name];
	    this.add(asset);
	    this.cache[name] = asset;
	}
    },

    load: function() {
	var n = this.assets.length;
	if (n == 0) {
	    /* nothing to load */
	    this.ready();
	    return;
	}
	if (this.config.loadMask) {
	    this.config.loadMask.show();
	}
	for (var i = 0; i < n; ++i) {
	    this.assets[i].load();
	}
    },

    update: function(asset) {
	var pending = false;
	var error;
	for (var i = 0, n = this.assets.length; i < n; ++i) {
	    var a = this.assets[i];
	    switch (a.state) {
	    case 'pending':
		pending = true;
		break;
	    case 'error':
		if (!error) {
		    error = a;
		}
		break;
	    }
	}
	if (!pending) {
	    /* notify only after all assets have completed */
	    if (this.config.loadMask) {
		this.config.loadMask.hide();
	    }
	    if (error) {
		this.error(error.reason);
	    } else {
		this.ready();
	    }
	}
    }
});

/**
 * Prototype XMLHttpRequest loader.
 * @mixin
 * @mixes utils.Asset
 */
utils.AssetRequest = utils.extend(utils.Asset, {
    init: function(config) {
	utils.Asset.init.call(this, config);
	return this;
    },

    load: function() {
	if (!this.req) {
	    this.req = new XMLHttpRequest();
	    this.listeners = utils.listeners(this.req, {
		progress: this.progressEvent,
		load: this.loadEvent,
		error: this.errorEvent,
		abort: this.abortEvent,
		scope: this
	    });
	}
	this.req.open("GET", this.config.url, !this.config.sync);
	this.req.send();
	if (this.config.sync) {
	    if (this.statusCheck(200)) {
		this.ready();
	    }
	    return;
	}
    },

    cleanup: function() {
	utils.Asset.cleanup.call(this);
	if (this.listeners) {
	    this.listeners.remove();
	    this.listeners = null;
	}
	if (this.req) {
	    if (this.state == 'pending') {
		this.req.abort();
	    }
	    this.req = null;
	}
    },

    responseText: function() {
	if (this.req) {
	    return this.req.responseText;
	}
	return null;
    },

    responseJSON: function() {
	var text = this.responseText();
	if (text != null) {
	    return JSON.parse(text);
	} else {
	    return null;
	}
    },

    statusCheck: function(code) {
	if (code == undefined) {
	    code = 200;
	}
	if (this.req.status != code) {
	    this.error(
		this.config.url + ": " + this.req.statusText +
		" (" + this.req.status + ")"
	    );
	    return false;
	} else {
	    return true;
	}
    },

    progressEvent: function(event) {
    },

    loadEvent: function(event) {
	if (this.statusCheck(200)) {
	    this.ready();
	}
    },

    errorEvent: function(event) {
	this.error(
	    this.config.url + ":  error loading the request"
	);
    },

    abortEvent: function(event) {
	this.error(
	    this.config.url + ":  request aborted"
	);
    }
});

/**
 * Prototype image loader.
 * @mixin
 * @mixes utils.Asset
 */
utils.AssetImage = utils.extend(utils.Asset, {
    init: function(config) {
	utils.Asset.init.call(this, config);
	return this;
    },

    cleanup: function() {
	utils.Asset.cleanup.call(this);
	this.image = null;
    },

    load: function() {
	this.image = new Image();
	this.image.onload = this.loadEvent.bind(this);
	this.image.src = this.config.src;
    },

    loadEvent: function() {
	utils.debug && console.log(
	    "loaded " + this.config.src
	);
	this.image.onload = null;
	this.ready();
    }
});

/**
 * Prototype application.
 * @mixin
 */
utils.AppBase = {
    /// resize delay in msec
    RESIZE_DELAY: 500,

    initCanvas: function() {
	if (this.canvas) {
	    return;
	}
	this.initLoader();
	this.canvas = document.createElement('canvas');
	this.canvas.style.display = 'block';
	utils.userSelectSet(this.canvas, 'none');
	document.body.appendChild(this.canvas);
	if (this.initContext) {
	    this.initContext();
	}
    },

    initLoader: function() {
	if (this.loader) {
	    return;
	}
	this.loadMask = utils.LoadMask.create();
	this.loader = utils.AssetLoader.create({
	    loadMask: this.loadMask,
	    ready: this.ready,
	    error: this.error,
	    scope: this
	});
    },

    error: function() {
	console.log("load failed: " + this.loader.reason);
    },

    ready: function() {
	if (this.loader) {
	    this.loader.cleanup();
	}
	if (this.canvas) {
	    this.resizeThrottle = utils.Timeout.create();
	    utils.on(window, 'resize', this.resizeEvent, this);
	    this.resize();
	}
	if (this.render) {
	    this.render();
	}
    },

    /**
     * body.resize event handler
     */
    resizeEvent: function(event) {
	if (!this.resizeThrottle.started()) {
	    this.resizeThrottle.start(this.RESIZE_DELAY, this.resize, this);
	}
    },
    resize: function() {
	var body = document.body;
	var padding = utils.paddingGet(document.body);
	var w = window.innerWidth - (padding.left + padding.right);
	var h = window.innerHeight - (padding.top + padding.bottom);
	this.canvas.width = w;
	this.canvas.height = h;
    }
};

/**
 * Prototype 2d canvas application.
 * @mixin
 */
utils.App2d = utils.extend(utils.AppBase, {
    initContext: function() {
	this.ctx = this.canvas.getContext("2d");
    }
});
