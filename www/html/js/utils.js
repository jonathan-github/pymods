/**
 * @file utility classes and functions
 */

/**
 * utils namespace
 * @namespace
 */
var utils;
if (!self.utils) {
    self.utils = {};
}

/// set the debugging level
utils.debug = 0;

/**
 * Throw an exception if the condition is not true.
 * @param {boolean} condition
 * @param {String} message
 */
utils.assertThrow = function(condition, message, log) {
    if (!condition) {
	if (log) {
	    console.error("assertion failed: ", message, log);
	}
	throw new Error(message);
    }
};

/// set to false to disable asserts
utils.assert = utils.assertThrow;

/**
 * Merge the properties into the object.
 * @param {object} object the object
 * @param {object} props the properties to merge
 * @return the object
 */
utils.merge = function(obj, props) {
    var names = Object.getOwnPropertyNames(props);
    for (var i = 0, n = names.length; i < n; ++i) {
        var name = names[i];
        obj[name] = props[name];
    }
    return obj;
};

/**
 * Parse values from an object.
 * specs = {
 *   name: {
 *     type: "number" | "string" | "boolean" | "object" | "function",
 *     isA: <prototype>,
 *     required: <boolean>,
 *     defValue: <value>,
 *   },
 *   ...
 * }
 * @param {object} spec specification of the object properties to extract
 * @param {object} obj the object to parse
 * @param {object} results the optional object to receive the values
 * @return true if results is modified
 */
utils.parse = function(specs, obj, results) {
    utils.assert && utils.assert(
        obj != undefined && typeof obj == 'object',
        "expected an object, but got undefined"
    );

    var modified = false;
    for (var name in specs) {
        var spec = specs[name];
        var value = obj[name];
        if (value === undefined) {
            utils.assert && utils.assert(
                !spec.required,
                "property " + name + " is required",
                [specs, obj, name]
            );
            if (results) {
                if (spec.keep && results[name] !== undefined) {
                    /* keep existing value */
                } else if (spec.defValue !== undefined) {
                    /* use default value */
                    if (results[name] != spec.defValue) {
                        results[name] = spec.defValue;
                        modified = true;
                    }
                } else {
                    /* clear value */
                    if (results[name] !== undefined) {
                        results[name] = undefined;
                        modified = true;
                    }
                }
            }
            continue;
        }
        var expectedType = spec.type;
        if (expectedType) {
            var actualType = typeof value;
            if (actualType == 'object' && typeof expectedType == 'object') {
                utils.assert && utils.assert(
                    utils.isA(value, expectedType),
                    "property " + name + " class is invalid",
                    [specs, obj, name, value]
                );
            } else if (actualType == 'number' && expectedType == 'int') {
                utils.assert && utils.assert(
                    Math.floor(value) == value,
                    "property " + name + " is " + actualType + " but expected " + expectedType,
                    [specs, obj, name, value]
                );
            } else {
                utils.assert && utils.assert(
                    actualType == expectedType,
                    "property " + name + " is " + actualType + " but expected " + expectedType,
                    [specs, obj, name, value]
                );
            }
        }
        if (results) {
            if (results[name] != value) {
                results[name] = value;
                modified = true;
            }
        }
    }
    return modified;
};

/// @return true if the object is an instance of the prototype
utils.isA = function(obj, proto) {
    while (obj && typeof obj == 'object') {
	if (obj === proto) {
	    return true;
	}
	obj = obj.__proto__;
    }
    return false;
};

/**
 * Create an object for a given prototype object.
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

/// multiplier to convert from degrees to radians
utils.DEG_TO_RAD = Math.PI / 180;
/// multiplier to convert from radians to degrees
utils.RAD_TO_DEG = 180 / Math.PI;

/**
 * Convert from degrees to radians.
 * @param {Number} d degrees
 * @returns {Number} radians
 */
utils.radians = function(d) { return d * utils.DEG_TO_RAD; };

/**
 * Convert from radians to degrees.
 * @param {Number} r radians
 * @returns {Number} degrees
 */
utils.degrees = function(r) { return r * utils.RAD_TO_DEG; };

/**
 * Remove the element from the array.
 * @returns (boolean} true if found, false if not
 */
utils.arrayRemove = function(ary, el) {
    for (var i = 0, n = ary.length; i < n; ++i) {
	if (ary[i] === el) {
	    ary.splice(i, 1);
	    return true;
	}
    }
    return false;
};

/**
 * Like Array.reduce except that an optional offset, stride, and count
 * select the subset of the array to process.
 * @param ary the array to reduce
 * @param callback the callback invoked for each element
 * @param offset the index of the first element to process
 * @param stride the offset to subsequent elements to process
 * @param count the number of elements to process
 */
utils.arrayReduce = function(ary, callback, initialValue, offset, stride, count) {
    if (offset == undefined) {
        offset = 0;
    }
    if (stride == undefined) {
        stride = 1;
    }
    if (count != undefined) {
        if (initialValue == undefined) {
            initialValue = ary[offset];
            offset += stride;
            --count;
        }
        for (var i = 0; i < count; ++i) {
            initialValue = callback(initialValue, ary[offset]);
            offset += stride;
        }
    } else {
        if (initialValue == undefined) {
            initialValue = ary[offset];
            offset += stride;
        }
        for (var i = offset, n = ary.length; i < n; i += stride) {
            initialValue = callback(initialValue, ary[i]);
        }
    }
    return initialValue;
};

/**
 * Get the maximum value in the array.
 */
utils.arrayMax = function(ary, offset, stride, count) {
    return utils.arrayReduce(ary, Math.max, undefined, offset, stride, count);
};

/**
 * Get the minimum value in the array.
 */
utils.arrayMin = function(ary, offset, stride, count) {
    return utils.arrayReduce(ary, Math.min, undefined, offset, stride, count);
};

/**
 * Unpack [[u, v], ...] into [u, v, ...].
 */
utils.arrayUnpack2f = function(vec, unpacked) {
    var n = vec.length;
    if (!unpacked) {
        unpacked = new Float32Array(n * 2);
    }
    for (var i = 0, j = 0; i < n; ++i) {
	var rec = vec[i];
	unpacked[j++] = rec[0];
	unpacked[j++] = rec[1];
    }
    return unpacked;
};

/**
 * Unpack [[x, y, z], ...] into [x, y, z, ...].
 */
utils.arrayUnpack3f = function(vec, unpacked) {
    var n = vec.length;
    if (!unpacked) {
        unpacked = new Float32Array(n * 3);
    }
    for (var i = 0, j = 0; i < n; ++i) {
	var rec = vec[i];
	unpacked[j++] = rec[0];
	unpacked[j++] = rec[1];
	unpacked[j++] = rec[2];
    }
    return unpacked;
};

/**
 * Compute the bounding box for the specified array of coordinates.
 * @param {Array} coords the flattend out coordinates
 * @returns {Object} the bounding box
 */
utils.boundingBox = function(coords) {
    var xmin = coords[0];
    var xmax = xmin;
    var ymin = coords[1];
    var ymax = ymin;
    var zmin = coords[2];
    var zmax = zmin;

    var i = 3, n = coords.length;
    while (i < n) {
	var x = coords[i++];
	var y = coords[i++];
	var z = coords[i++];
	if (xmin > x) {
	    xmin = x;
	}
	if (xmax < x) {
	    xmax = x;
	}
	if (ymin > y) {
	    ymin = y;
	}
	if (ymax < y) {
	    ymax = y;
	}
	if (zmin > z) {
	    zmin = z;
	}
	if (zmax < z) {
	    zmax = z;
	}
    }
    return {
	xmin: xmin,
	xmax: xmax,
	ymin: ymin,
	ymax: ymax,
	zmin: zmin,
	zmax: zmax,
	width: (xmax - xmin),
	height: (ymax - ymin),
	depth: (zmax - zmin)
    };
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
 * Prototype for building an Exponential Moving Average.
 */
utils.EMA = utils.extend(utils.Object, {
    /**
     * Initialize the object.
     * @param {float} alpha the smoothing factor
     */
    init: function(alpha) {
	if (alpha == undefined) {
	    alpha = this.alphaN(10);
	}
	this.alpha = alpha;
	this.n = 0;
	this.ema = 0;
	this.min = 0;
	this.max = 0;
        this.timer = null;
        this.elapsed = 0;
    },

    /**
     * The alpha for approximating an N sample moving average.
     */
    alphaN: function(n) {
	return 2 / (n + 1);
    },

    /**
     * Reset the EMA.
     */
    reset: function() {
	this.n = 0;
	this.ema = 0;
	this.min = 0;
	this.max = 0;
    },

    /**
     * Update the EMA.
     */
    update: function(value) {
	var alpha = this.alpha;
	var ema = this.ema;
	var n = this.n;
	if (n == 0) {
	    this.min = this.max = value;
	    ema = value;
	} else {
	    if (this.min > value) {
		this.min = value;
	    }
	    if (this.max < value) {
		this.max = value;
	    }
	    ema = value * alpha + ema * (1 - alpha);
	}
	this.ema = ema;
	this.n = n + 1;
    },

    start: function() {
        var start = self.performance.now();
        this.timer = start;
        this.elapsed = 0;
        return start;
    },
    stop: function() {
        var start = this.timer;
        var end = self.performance.now();
        this.timer = end;
        if (start != null) {
            this.update(this.elapsed + (end - start));
        }
        return end;
    },

    elapsed: function() {
        var start = this.timer;
        if (start != null) {
            return 0;
        }
        var now = self.performance.now();
        return this.elapsed + (now - start);
    },

    pause: function() {
        var start = this.timer;
        if (start == null) {
            return;
        }
        var now = self.performance.now();
        this.timer = now;
        this.elapsed += now - start;
    },
    resume: function() {
        var start = self.performance.now();
        if (this.timer == null) {
            this.elapsed = 0;
        }
        this.timer = start;
        return start;
    },
    done: function() {
        this.update(this.elapsed);
        this.timer = null;
        this.elapsed = 0;
    }
});

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
	opacity: 0.75,
        visibility: 'hidden'
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
        this.contentInit();
	var parent = config.parent;
	if (!parent) {
	    parent = document.body;
	}
	parent.appendChild(this.div);
	return this;
    },

    /**
     * Initialize the content for the overlay.
     */
    contentInit: function() {
	this.tb = utils.TableBuilder.create();
	this.div.appendChild(this.tb.table);
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
		th.align = 'left';
		td = this.tb.cellAdd('td');
	    } else {
		th = this.tb.cellGet(rows, 0);
		td = this.tb.cellGet(rows, 1);
	    }
	    utils.contentText(th, prop + ":");
	    if (val != undefined) {
		switch (typeof val) {
		case 'number':
		    val = val.toFixed(1);
		    break;
		case 'string':
		    break;
		default:
		    val = val.toString();
		    break;
		}
	    } else {
		val = "";
	    }
	    utils.contentHTML(td, val);
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

/// Listener ID counter
utils.ListenerId = 0;

/// Map of registered listeners.
utils.ListenerMap = {};

/**
 * Remove all registered listeners.
 */
utils.removeListeners = function() {
    var listeners = [];
    for (var id in utils.ListenerMap) {
	var listener = utils.ListenerMap[id];
	listeners.push(listener);
    }
    for (var i = 0, n = listeners.length; i < n; ++i) {
	listeners[i].remove();
    }
};

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
	this.id = ++utils.ListenerId;
	this.obj = obj;
	this.event = event;
	this.func = func;
	utils.ListenerMap[this.id] = this;
	return this;
    },

    /**
     * Remove the event listener.
     */
    remove: function() {
	delete utils.ListenerMap[this.id];
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
 * Compute the surface normal for an indexed polygon.
 * https://www.opengl.org/wiki/Calculating_a_Surface_Normal
 * @param {vec3} normal the output vec3 for the normal
 * @param {Number[]} coords the flattened vertices array
 * @param {Integer[]} poly the vertex indices for the polygon
 * @returns {vec3} the surface normal
 */
utils.surfaceNormal = function(normal, coords, poly, normalize) {
    var n = poly.length;
    var x = 0, y = 0, z = 0;
    for (var i = 0; i < n; ++i) {
        var ci = poly[i] * 3;
        var ni = poly[(i + 1) % n] * 3;

        var cx = coords[ci];
        var cy = coords[ci + 1];
        var cz = coords[ci + 2];

        var nx = coords[ni];
        var ny = coords[ni + 1];
        var nz = coords[ni + 2];

        x += (cy - ny) * (cz + nz);
        y += (cz - nz) * (cx + nx);
        z += (cx - nx) * (cy + ny);
    }
    vec3.set(normal, x,y,z);
    if (normalize) {
        vec3.normalize(normal, normal);
    }
    return normal;
};

/**
 * Prototype asset loader.
 * @mixin
 */
utils.Asset = utils.extend(utils.Object, {
    STATE_PENDING: 'pending',
    STATE_READY: 'ready',
    STATE_ERROR: 'error',

    init: function(config) {
	this.state = this.STATE_PENDING;
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
	this.state = this.STATE_ERROR;
	this.reason = reason;
	this.notify();
    },

    ready: function() {
	this.state = this.STATE_READY;
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
	this.pending = [];
	this.errors = [];
	this.cache = {};
	this.library = {};
	return this;
    },

    cleanup: function() {
	utils.Asset.cleanup.call(this);
	for (var i = 0, n = this.assets.length; i < n; ++i) {
	    this.assets[i].cleanup();
	}
	this.assets.length = 0;
	this.pending.length = 0;
	this.cache = {};
    },

    add: function(asset) {
	asset.loader = this;
	this.assets.push(asset);
    },

    append: function(asset) {
	this.add(asset);
	this.pending.push(asset);
	asset.load();
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
	    var asset = this.assets[i];
	    this.pending.push(asset);
	    asset.load();
	}
    },

    update: function(asset) {
	var pending = [];
	for (var i = 0, n = this.pending.length; i < n; ++i) {
	    var a = this.pending[i];
	    switch (a.state) {
	    case utils.Asset.STATE_PENDING:
		pending.push(a);
		break;
	    case utils.Asset.STATE_ERROR:
		this.errors.push(a);
		break;
	    }
	}
	this.pending = pending;
	if (pending.length == 0) {
	    /* notify only after all assets have completed */
	    if (this.config.loadMask) {
		this.config.loadMask.hide();
	    }
	    if (this.errors.length > 0) {
		this.error(this.errors[0].reason);
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
	if (this.config.responseType) {
	    this.req.responseType = this.config.responseType;
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
	    if (this.state == utils.Asset.STATE_PENDING) {
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
	if (this.req && this.req.responseType == 'json') {
	    if (this.req.response == undefined) {
		console.log("missing JSON response", this);
	    }
	    return this.req.response;
	}
	var text = this.responseText();
	if (text != null && text !== "") {
	    return JSON.parse(text);
	} else {
	    console.log("missing JSON response", this);
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
	    if (this.req.responseType == 'json') {
		//console.log(this.config.url, this.req.response);
	    }
	    return true;
	}
    },

    progressEvent: function(event) {
    },

    loadEvent: function(event) {
	if (this.statusCheck(200)) {
	    utils.debug && console.log(
		"loaded " + this.config.url
	    );
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
 * Prototype fetch loader.
 * @mixin
 * @mixes utils.Asset
 */
utils.AssetFetch = utils.extend(utils.Asset, {
    init: function(config) {
	utils.Asset.init.call(this, config);
	return this;
    },

    load: function() {
        fetch(this.config.url).then(
            this.loadEvent.bind(this),
            this.errorEvent.bind(this)
        );
    },

    loadEvent: function(response) {
        if (this.statusCheck(response)) {
            utils.debug && console.log(
                "loaded " + this.config.url
            );
            if (this.process(response)) {
                this.ready();
            }
        }
    },

    /**
     * Process the response.
     * @return true if the response is ready, false is not
     */
    process: function(response) {
        this.response = response;
        return true;
    },

    errorEvent: function(reason) {
	this.error(
	    this.config.url + ": " + reason
	);
    },

    cleanup: function() {
	utils.Asset.cleanup.call(this);
        this.response = null;
    },

    statusCheck: function(response, code) {
        var ok = (code == undefined
                  ? response.ok
                  : response.status == code);
	if (!ok) {
	    this.error(
		this.config.url + ": " + response.statusText +
		" (" + response.status + ")"
	    );
	    return false;
	} else {
	    return true;
	}
    }
});

/**
 * WebAssembly loader
 */
utils.AssetWasm = utils.extend(utils.AssetFetch, {
    init: function(config) {
	utils.AssetFetch.init.call(this, config);
	return this;
    },

    process: function(response) {
        if (response.url.startsWith("file:")) {
            /*
             * WebAssembly compileStreaming or instantiateStreaming
             * reject with an unsupported MIME type error when
             * loading directly from a file.
             * To work around this, resolve the response to an array buffer
             * and then call the non-streaming versions.
             */
            response.arrayBuffer().then(
                this.arrayBufferEvent.bind(this),
                this.errorEvent.bind(this)
            );
        } else {
            this.processStreaming(response);
        }
    },
    arrayBufferEvent: function(buffer) {
        if (this.config.compileOnly) {
            WebAssembly.compile(
                buffer
            ).then(
                this.compileEvent.bind(this),
                this.errorEvent.bind(this)
            );
        } else {
            WebAssembly.instantiate(
                buffer,
                this.config.importObject || {}
            ).then(
                this.instantiateEvent.bind(this),
                this.errorEvent.bind(this)
            );
        }
    },
    processStreaming: function(response) {
        if (this.config.compileOnly) {
            WebAssembly.compileStreaming(
                response
            ).then(
                this.compileEvent.bind(this),
                this.errorEvent.bind(this)
            );
        } else {
            WebAssembly.instantiateStreaming(
                response,
                this.config.importObject
            ).then(
                this.instantiateEvent.bind(this),
                this.errorEvent.bind(this)
            );
        }
    },

    compileEvent: function(module) {
        this.module = module;
        this.ready();
    },

    instantiateEvent: function(resultObject) {
        this.module = resultObject.module;
        this.instance = resultObject.instance;
        this.ready();
    },

    cleanup: function() {
	utils.AssetFetch.cleanup.call(this);
        this.module = null;
        this.instance = null;
    }
});

/**
 * Prototype image loader.
 * @mixin
 * @mixes utils.Asset
 */
utils.AssetImage = utils.extend(utils.Asset, {
    init: function(config) {
	var src = config && config.src;
	if (src) {
	    var idx = src.lastIndexOf('.tif');
	    if (idx > 0) {
		// .tif not supported so try to load a .png version instead
		config.src = src.substring(0, idx) + '.png';
	    }
	}
	utils.Asset.init.call(this, config);
	return this;
    },

    cleanup: function() {
	utils.Asset.cleanup.call(this);
        if (this.image) {
            this.image.onload = null;
            this.image.onerror = null;
	    this.image = null;
        }
    },

    load: function() {
	this.image = new Image();
	this.image.onload = this.loadEvent.bind(this);
	this.image.onerror = this.imageError.bind(this);
	this.image.src = this.config.src;
    },

    imageError: function() {
	this.image.onload = null;
	this.image.onerror = null;
	this.error("error loading image " + this.config.src);
    },

    loadEvent: function() {
	utils.debug && console.log(
	    "loaded " + this.config.src
	);
	this.image.onload = null;
	this.image.onerror = null;
	this.ready();
    }
});

/**
 * Prototype script loader.
 * @mixin
 * @mixes utils.Asset
 */
utils.AssetScript = utils.extend(utils.Asset, {
    init: function(config) {
	utils.Asset.init.call(this, config);
	return this;
    },

    cleanup: function() {
	utils.Asset.cleanup.call(this);
	this.script = null;
    },

    load: function() {
	this.script = document.createElement('script');
	this.script.type = 'text/javascript';
	this.script.onload = this.loadEvent.bind(this);
	this.script.onerror = this.scriptError.bind(this);
	this.script.src = this.config.src;
	var head = document.head || document.getElementsByTagName('head')[0];
	head.appendChild(this.script);
    },

    scriptError: function() {
	this.script.onload = null;
	this.script.onerror = null;
	this.error("error loading script " + this.config.src);
    },

    loadEvent: function() {
	utils.debug && console.log(
	    "loaded " + this.config.src
	);
	this.script.onload = null;
	this.script.onerror = null;
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

    error: function(loader) {
	console.log("load failed: " + loader.reason);
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

// http://www.cubic.org/docs/hermite.htm
utils.spline_hermite = function(out, t, p0, p1, d0, d1) {
    var t2 = Math.pow(t, 2);
    var t3 = Math.pow(t, 3);
    var h00 = 2 * t3 - 3 * t2 + 1;
    var h01 = -2 * t3 + 3 * t2;
    var h10 = t3 - 2 * t2 + t;
    var h11 = t3 - t2;

    var x = h00 * p0[0] + h10 * d0[0] + h01 * p1[0] + h11 * d1[0];
    var y = h00 * p0[1] + h10 * d0[1] + h01 * p1[1] + h11 * d1[1];
    out[0] = x;
    out[1] = y;
    return out;
};

// https://en.wikipedia.org/wiki/Kochanek%E2%80%93Bartels_spline
utils.spline_tcb_interp = function(out, t, pp, p0, p1, pn, T, C, B) {
    var dx0 = p0[0] - pp[0];
    var dx1 = p1[0] - p0[0];
    var dx2 = pn[0] - p1[0];
    var dy0 = p0[1] - pp[1];
    var dy1 = p1[1] - p0[1];
    var dy2 = pn[1] - p1[1];

    var a0 = (1 - T) * (1 + C) * (1 + B) / 2;
    var a1 = (1 - T) * (1 - C) * (1 - B) / 2;

    var ix = a0 * dx0 + a1 * dx1;
    var iy = a0 * dy0 + a1 * dy1;

    var a2 = (1 - T) * (1 - C) * (1 + B) / 2;
    var a3 = (1 - T) * (1 + C) * (1 - B) / 2;

    var ox = a2 * dx1 + a3 * dx2;
    var oy = a2 * dy1 + a3 * dy2;

    return utils.spline_hermite(out, t, p0, p1, [ix, iy], [ox, oy]);
};

/**
 * knots = [
 *  [x0, y0, T0, C0, B0],
 *  ...
 *  [xi, yi, Ti, Ci, Bi]
 * ]
 */
utils.spline_tcb = function(x, knots) {
    var n = knots.length;
    utils.assert && utils.assert(
	n >= 2,
	"requires at least two knots",
	arguments
    );

    var kp = knots[0];
    if (x <= kp[0]) {
	return kp[1];
    }
    var kn = knots[n - 1];
    if (x < kn[0]) {
	var k0, k1;
	for (var i = 1; i < n; ++i) {
	    kp = knots[Math.max(0, i - 2)];
	    k0 = knots[Math.max(0, i - 1)];
	    k1 = knots[i];
	    kn = knots[Math.min(n - 1, i + 1)];
	    if (x <= k1[0]) {
		var t = (x - k0[0]) / (k1[0] - k0[0]);
		var pt = utils.spline_tcb_interp(
		    [0,0], t, kp, k0, k1, kn,
		    /*T*/ k0[2] || 0,
		    /*C*/ k0[3] || 0,
		    /*B*/ k0[4] || 0
		);
		return pt[1];
	    }
	}
    }
    return kn[1];
};

/**
 * Memory manager for a WebAssembly.Memory instance.
 * TBD: need a way to free memory.
 * @note assume host is little endian
 */
utils.Memory = utils.extend(utils.Object, {
    init: function(config) {
        this.config = config;
        if (config) {
            this.memory = config.config;
        }
        if (!this.memory) {
            var memoryConfig = {
                initial: config && config.initial || 1
            };
            if (config && config.maximum) {
                memoryConfig.maximum = config.maximum;
            }
            this.memory = new WebAssembly.Memory(memoryConfig);
        }
        this.dataView = new DataView(this.memory.buffer);
        this.blocks = [];
        this.views = [];
        this.used = 0;
    },

    malloc: function(size) {
        var avail = this.memory.buffer.byteLength - this.used;
        var blockSize = size;
        var padding = size % 8;
        if (padding > 0) {
            blockSize += 8 - padding;
        }

        if (blockSize > avail) {
            var pages = Math.ceil((blockSize - avail) / 0x10000);
            var initial = this.config && this.config.initial || 1;
            if (pages < initial) {
                pages = initial;
            }
            utils.debug && console.log("grow", pages);
            this.memory.grow(pages);

            /* rebuild the data and typed array views */
            this.dataView = new DataView(this.memory.buffer);
            var views = this.views;
            var buffer = this.memory.buffer;
            for (var i = 0, n = views.length; i < n; ++i) {
                var view = views[i];
                view.array = new view.arrayType(buffer, view.offset, view.arrayLength);
            }
        }
        var block = {
            offset: this.used,
            size: blockSize
        };
        this.blocks.push(block);
        this.used += blockSize;
        return block;
    },

    arrayNew: function(arrayType, length) {
        var block = this.malloc(length * arrayType.BYTES_PER_ELEMENT);
        block.arrayType = arrayType;
        block.arrayLength = length;
        block.array = new arrayType(this.memory.buffer, block.offset, length);
        this.views.push(block);
        return block;
    }
});
