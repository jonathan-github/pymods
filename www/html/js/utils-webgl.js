/**
 * @file utility classes functions for WebGL
 */

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
 * Prototype WebGL application.
 * @mixin
 */
utils.App = {
    /// resize delay in msec
    RESIZE_DELAY: 500,

    /// webgl context names
    WEBGL_CONTEXT_NAMES: ['webgl', 'experimental-webgl'],

    initCanvas: function() {
	utils.debug && console.log("initCanvas");
	this.canvas = document.createElement('canvas');
	this.canvas.style.display = 'block';
	utils.userSelectSet(this.canvas, 'none');
	document.body.appendChild(this.canvas);
	this.initContext();
	this.loader = utils.AssetLoader.create({
	    ready: this.ready,
	    error: this.error,
	    scope: this
	});
    },

    initContext: function() {
	for (var i = 0, n = this.WEBGL_CONTEXT_NAMES.length; i < n; ++i) {
	    var name = this.WEBGL_CONTEXT_NAMES[i];
	    try {
		this.gl = this.canvas.getContext(name);
	    } catch (ex) {
		console.log("error creating " + name + " context", ex);
	    }
	    if (this.gl) {
		break;
	    }
	}
	if (!this.gl) {
	    throw new Error("unable to create a webgl context");
	}
    },

    error: function(loader) {
	console.log("load failed: " + loader.reason);
    },

    ready: function() {
	this.resizeThrottle = utils.Timeout.create();
	utils.on(window, 'resize', this.resizeEvent, this);
	this.loader.cleanup();
	this.resize();
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

	var gl = this.gl;
	gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    }
};

/**
 * Prototype view controller.
 * @mixin
 */
utils.ViewController = {
    /// field of view
    fov: 1/4,
    fovInit: 1/4,
    fovMin: 1/6,
    fovMax: 1/2,

    /// near and far clipping planes
    nearClippingPlaneDistance: 0.1,
    farClippingPlaneDistance: 100,

    init: function(app) {
	this.app = app;
	this.pMatrix = mat4.create();
	this.reset();

	this.overlay = utils.Overlay.create();

	utils.listeners(document/*this.app.canvas*/, {
	    mousedown: this.mouseDownEvent,
	    mousemove: this.mouseMoveEvent,
	    mouseup: this.mouseUpEvent,
	    mouseover: this.mouseOverEvent,
	    mouseout: this.mouseOutEvent,
	    wheel: this.wheelEvent,
	    scope: this
	});
	utils.listeners(document, {
	    keypress: this.keyPressEvent,
	    scope: this
	});
    },

    reset: function() {
	this.fov = this.fovInit;
	this.vMatrix = mat4.create();
	this.vMatrixFixed = mat4.create();
	this.pos = vec3.create();
	this.rotate = quat.create();
	this.pitch = quat.create();
	this.yaw = quat.create();
    },

    dragStart: function(x, y) {
	this.mouseDrag = {
	    x: x,
	    y: y
	};
    },
    dragMove: function(x, y, constrain) {
	var drag = this.mouseDrag;
	if (drag) {
	    var dx = drag.x - x;
	    var dy = drag.y - y;
	    drag.x = x;
	    drag.y = y;

	    if (constrain) {
		if (Math.abs(dx) > Math.abs(dy)) {
		    dy = 0;
		} else {
		    dx = 0;
		}
	    }

	    var gl = this.app.gl;
	    var d = Math.max(gl.drawingBufferWidth, gl.drawingBufferHeight);
	    var scale = 2 * Math.PI * this.fov / d;
	    var pitch = quat.setAxisAngle(this.pitch, [1, 0, 0], dy * scale);
	    var yaw = quat.setAxisAngle(this.yaw, [0, 1, 0], dx * scale);
	    var rotate = this.rotate;
	    //quat.multiply(rotate, yaw, rotate);
	    quat.multiply(rotate, rotate, yaw);
	    quat.multiply(rotate, pitch, rotate);
	    quat.normalize(rotate, rotate);
	    this.vMatrixUpdate();
	}
    },
    dragStop: function() {
	this.mouseDrag = null;
    },

    mouseDownEvent: function(event) {
	if (event.buttons & 1) {
	    this.dragStart(event.clientX, event.clientY);
	}
    },
    mouseMoveEvent: function(event) {
	if (this.mouseDrag) {
	    this.dragMove(event.clientX, event.clientY, event.shiftKey);
	}
    },
    mouseUpEvent: function(event) {
	this.dragStop();
    },
    mouseOverEvent: function(event) {
	if (event.buttons & 1) {
	    this.dragStart(event.clientX, event.clientY);
	}
    },
    mouseOutEvent: function(event) {
	this.dragStop();
    },

    wheelEvent: function(event) {
	var d = (event.deltaY < 0 ? -1 : 1) * 0.02;
	var fov = this.fov + d;
	if (fov < this.fovMin) {
	    fov = this.fovMin;
	} else if (fov > this.fovMax) {
	    fov = this.fovMax;
	}
	if (this.fov != fov) {
	    this.fov = fov;
	    this.pMatrixUpdate();
	}
    },

    keyPressEvent: function(event) {
	switch (event.charCode) {
	case 114:
	    this.reset();
	    this.pMatrixUpdate();
	    this.vMatrixUpdate();
	    return;
	}

	var trans;
	var step = 0.5;
	switch (event.keyCode) {
	case 38:
	    // forward
	    trans = [0, 0, +step, 0];
	    break;
	case 37:
	    // left
	    trans = [-step, 0, 0, 0];
	    break;
	case 39:
	    // right
	    trans = [+step, 0, 0, 0];
	    break;
	case 40:
	    // backward
	    trans = [0, 0, -step, 0];
	    break;
	case 36:
	    // up
	    trans = [0, +step, 0, 0];
	    break;
	case 35:
	    // up
	    trans = [0, -step, 0, 0];
	    break;
	default:
	    console.log("keyPress", event);
	    return;
	}
	var pos = this.pos;
	//trans = quat.multiply(quat.create(), this.rotate, trans);
	vec3.add(pos, pos, trans);
	this.vMatrixUpdate();
    },

    pMatrixUpdate: function() {
	var gl = this.app.gl;
	var fieldOfViewInRadians = Math.PI * this.fov;
	var aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight;
	mat4.perspective(
	    this.pMatrix,
	    fieldOfViewInRadians,
	    aspectRatio,
	    this.nearClippingPlaneDistance,
	    this.farClippingPlaneDistance
	);
	this.app.pMatrixUpdate(this.pMatrix);
	this.overlayUpdate();
    },

    vMatrixUpdate: function() {
	var rotate = this.rotate;
	var pos = this.pos;

	var vMatrix = this.vMatrix;
	mat4.fromRotationTranslation(vMatrix, rotate, pos);

	var vMatrixFixed = this.vMatrixFixed;
	mat4.fromQuat(vMatrixFixed, rotate);

	this.app.vMatrixUpdate(vMatrix, vMatrixFixed);
	this.overlayUpdate();
    },

    orientation: function() {
	var rotate = this.rotate;
	return {
	    pitch: utils.degrees(2*Math.acos(rotate[0])) - 180,
	    yaw: utils.degrees(2*Math.acos(rotate[1])) - 180,
	    roll: utils.degrees(2*Math.acos(rotate[2])) - 180
	};
    },

    overlayUpdate: function() {
	var pos = this.pos;
	var o = this.orientation();
	this.overlay.show({
	    pitch: o.pitch.toFixed(1) + "\u00b0",
	    yaw: o.yaw.toFixed(1) + "\u00b0",
	    roll: o.roll.toFixed(1) + "\u00b0",
	    X: pos[0].toFixed(1),
	    Y: pos[1].toFixed(1),
	    Z: pos[2].toFixed(1),
	    FOV: (this.fov * 180).toFixed(1) + "\u00b0"
	});
    }
};

/**
 * Prototype model controller.
 * @mixin
 */
utils.ModelController = {
    /// field of view
    fov: 1/4,
    fovInit: 1/4,
    fovMin: 1/6,
    fovMax: 1/2,

    /// near and far clipping planes
    nearClippingPlaneDistance: 0.1,
    farClippingPlaneDistance: 100,

    init: function(app, origin) {
	this.app = app;
	this.origin = origin || vec3.create();
	this.toOrigin = vec3.create();
	vec3.negate(this.toOrigin, this.origin);
	this.pMatrix = mat4.create();
	this.mMatrix = mat4.create();
	this.rotate = quat.create();
	this.pitch = quat.create();
	this.yaw = quat.create();
	this.reset();

	this.overlay = utils.Overlay.create();

	utils.listeners(document, {
	    mousedown: this.mouseDownEvent,
	    mousemove: this.mouseMoveEvent,
	    mouseup: this.mouseUpEvent,
	    mouseover: this.mouseOverEvent,
	    mouseout: this.mouseOutEvent,
	    wheel: this.wheelEvent,
	    keypress: this.keyPressEvent,
	    scope: this
	});
    },

    reset: function() {
	this.fov = this.fovInit;
	this.pos = vec3.clone(this.origin);
	this.rotate = quat.create();
    },

    dragStart: function(x, y) {
	this.mouseDrag = {
	    x: x,
	    y: y
	};
    },
    dragMove: function(x, y, constrain) {
	var drag = this.mouseDrag;
	if (drag) {
	    var dx = drag.x - x;
	    var dy = drag.y - y;
	    drag.x = x;
	    drag.y = y;

	    if (constrain) {
		if (Math.abs(dx) > Math.abs(dy)) {
		    dy = 0;
		} else {
		    dx = 0;
		}
	    }

	    var gl = this.app.gl;
	    var d = Math.max(gl.drawingBufferWidth, gl.drawingBufferHeight);
	    var scale = 2 * Math.PI * this.fov / d;
	    var pitch = quat.setAxisAngle(this.pitch, [1, 0, 0], -dy * scale);
	    var yaw = quat.setAxisAngle(this.yaw, [0, 1, 0], -dx * scale);
	    var rotate = this.rotate;
	    quat.multiply(rotate, rotate, yaw);
	    quat.multiply(rotate, pitch, rotate);
	    quat.normalize(rotate, rotate);
	    this.mMatrixUpdate();
	}
    },
    dragStop: function() {
	this.mouseDrag = null;
    },

    mouseDownEvent: function(event) {
	if (event.buttons & 1) {
	    this.dragStart(event.clientX, event.clientY);
	}
    },
    mouseMoveEvent: function(event) {
	if (this.mouseDrag) {
	    this.dragMove(event.clientX, event.clientY, event.shiftKey);
	}
    },
    mouseUpEvent: function(event) {
	this.dragStop();
    },
    mouseOverEvent: function(event) {
	if (event.buttons & 1) {
	    this.dragStart(event.clientX, event.clientY);
	}
    },
    mouseOutEvent: function(event) {
	this.dragStop();
    },

    wheelEvent: function(event) {
	var d = (event.deltaY < 0 ? -1 : 1) * 0.02;
	var fov = this.fov + d;
	if (fov < this.fovMin) {
	    fov = this.fovMin;
	} else if (fov > this.fovMax) {
	    fov = this.fovMax;
	}
	if (this.fov != fov) {
	    this.fov = fov;
	    this.pMatrixUpdate();
	}
    },

    keyPressEvent: function(event) {
	switch (event.charCode) {
	case 114:
	    this.reset();
	    this.pMatrixUpdate();
	    this.mMatrixUpdate();
	    return;
	}

	var trans;
	var step = 1;
	switch (event.keyCode) {
	case 38:
	    // forward
	    trans = [0, 0, +step, 0];
	    break;
	case 37:
	    // left
	    trans = [-step, 0, 0, 0];
	    break;
	case 39:
	    // right
	    trans = [+step, 0, 0, 0];
	    break;
	case 40:
	    // backward
	    trans = [0, 0, -step, 0];
	    break;
	case 36:
	    // up
	    trans = [0, +step, 0, 0];
	    break;
	case 35:
	    // up
	    trans = [0, -step, 0, 0];
	    break;
	default:
	    console.log("keyPress", event);
	    return;
	}
	var pos = this.pos;
	vec3.add(pos, pos, trans);
	this.mMatrixUpdate();
    },

    pMatrixUpdate: function() {
	var gl = this.app.gl;
	var fieldOfViewInRadians = Math.PI * this.fov;
	var aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight;
	mat4.perspective(
	    this.pMatrix,
	    fieldOfViewInRadians,
	    aspectRatio,
	    this.nearClippingPlaneDistance,
	    this.farClippingPlaneDistance
	);
	this.app.pMatrixUpdate(this.pMatrix);
	this.overlayUpdate();
    },

    mMatrixUpdate: function() {
	var mMatrix = this.mMatrix;
	mat4.fromRotationTranslation(mMatrix, this.rotate, this.pos);
	mat4.translate(mMatrix, mMatrix, this.toOrigin);
	this.app.mMatrixUpdate(mMatrix);
	this.overlayUpdate();
    },

    degrees: function(rad) {
	var d = utils.degrees(rad) - 180;
	if (d > 180) {
	    d -= 360;
	}
	if (d < -180) {
	    d += 360;
	}
	return d;
    },

    orientation: function() {
	var rotate = this.rotate;
	return {
	    pitch: this.degrees(2*Math.acos(rotate[0])),
	    yaw: this.degrees(2*Math.acos(rotate[1])),
	    roll: this.degrees(2*Math.acos(rotate[2]))
	};
    },

    overlayUpdate: function() {
	var pos = this.pos;
	var o = this.orientation();
	this.overlay.show({
	    pitch: o.pitch.toFixed(1) + "\u00b0",
	    yaw: o.yaw.toFixed(1) + "\u00b0",
	    roll: o.roll.toFixed(1) + "\u00b0",
	    X: pos[0].toFixed(1),
	    Y: pos[1].toFixed(1),
	    Z: pos[2].toFixed(1),
	    FOV: (this.fov * 180).toFixed(1) + "\u00b0"
	});
    }
};

utils.boundingBox = function(coords) {
    var xmin = coords[0];
    var xmax = coords[0];
    var ymin = coords[1];
    var ymax = coords[1];
    var zmin = coords[2];
    var zmax = coords[2];

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

utils.ArrayBuffer = utils.extend(utils.Object, {
    /// number of components per attribute
    size: 3,

    /// component type
    type: WebGLRenderingContext.FLOAT,

    /// true if normalized
    normalized: false,

    /// buffer stride and offset in bytes
    stride: 0,
    offset: 0,

    /// drawing mode
    mode: WebGLRenderingContext.TRIANGLES,

    /// buffer target
    target: WebGLRenderingContext.ARRAY_BUFFER,

    /// buffer usage
    //usage: WebGLRenderingContext.STATIC_DRAW,
    usage: WebGLRenderingContext.DYNAMIC_DRAW,

    init: function(gl, name, data) {
	this.name = name;
	this.buffer = gl.createBuffer();
	this.data = null;
	this.dirty = false;
	if (data) {
	    this.set(data);
	}
	return this;
    },

    set: function(data) {
	data = this.typeNormalize(data);
	if (this.data != data) {
	    this.data = data;
	    this.dirty = true;
	}
    },

    typeName: function(type) {
	if (type == undefined) {
	    type = this.type;
	}
	switch (type) {
	case WebGLRenderingContext.FLOAT:
		return "FLOAT";
	case WebGLRenderingContext.UNSIGNED_SHORT:
		return "UNSIGNED_SHORT";
	case WebGLRenderingContext.UNSIGNED_INT:
		return "UNSIGNED_INT";
	default:
		return type.toString();
	}
    },

    typeCheck: function(actualType) {
	if (this.type != actualType) {
	    throw new Error(
		this.name +
		": buffer data is type " + this.typeName(actualType) +
		" but expected " + this.typeName(type)
	    );
	}
    },

    typeNormalize: function(data) {
	if (data instanceof Uint16Array) {
	    this.typeCheck(WebGLRenderingContext.UNSIGNED_SHORT);
	} else if (data instanceof Uint32Array) {
	    this.typeCheck(WebGLRenderingContext.UNSIGNED_INT);
	} else if (data instanceof Float32Array) {
	    this.typeCheck(WebGLRenderingContext.FLOAT);
	} else if (data) {
	    if (this.type == WebGLRenderingContext.UNSIGNED_SHORT) {
		data = new Uint16Array(data);
	    } else if (this.type == WebGLRenderingContext.UNSIGNED_INT) {
		data = new Uint32Array(data);
	    } else {
		data = new Float32Array(data);
	    }
	}
	return data;
    },

    targetName: function() {
	switch (this.target) {
	case WebGLRenderingContext.ARRAY_BUFFER:
		return "ARRAY_BUFFER";
	case WebGLRenderingContext.ELEMENT_ARRAY_BUFFER:
		return "ELEMENT_ARRAY_BUFFER";
	default:
		return this.target.toString();
	}
    },

    modeName: function() {
	switch (this.mode) {
	case WebGLRenderingContext.TRIANGLES:
		return "TRIANGLES";
	case WebGLRenderingContext.LINES:
		return "LINES";
	default:
		return this.mode.toString();
	}
    },

    usageName: function() {
	switch (this.usage) {
	case WebGLRenderingContext.STATIC_DRAW:
		return "STATIC_DRAW";
	case WebGLRenderingContext.STREAM_DRAW:
		return "STREAM_DRAW";
	case WebGLRenderingContext.DYNAMIC_DRAW:
		return "DYNAMIC_DRAW";
	default:
		return this.usage.toString();
	}
    },

    bindBuffer: function(gl) {
	var buf;
	switch (this.target) {
	case WebGLRenderingContext.ARRAY_BUFFER:
	    buf = gl.getParameter(gl.ARRAY_BUFFER_BINDING);
	    break;
	case WebGLRenderingContext.ELEMENT_ARRAY_BUFFER:
	    buf = gl.getParameter(gl.ELEMENT_ARRAY_BUFFER_BINDING);
	    break;
	default:
	    // unknown target
	    return;
	}
	if (buf != this.buffer) {
	    utils.debug > 0 && console.log("bindBuffer", this.name, this.targetName());
	    gl.bindBuffer(this.target, this.buffer);
	}
    },

    update: function(gl) {
	if (!this.dirty) {
	    return;
	}
	this.dirty = false;
	this.bindBuffer(gl);
	utils.debug > 1 && console.log(
	    "bufferData", this.name, this.targetName(), this.data,
	    this.usageName()
	);
	gl.bufferData(this.target, this.data, this.usage);
    },

    draw: function(gl) {
	this.update(gl);
	this.bindBuffer(gl);
	utils.debug > 1 && console.log(
	    "drawArrays", this.name,
	    this.modeName(),
	    0, Math.floor(this.data.length / this.size)
	);
	gl.drawArrays(this.mode, 0, Math.floor(this.data.length / this.size));
    }
});

utils.ArrayBuffer3f = utils.ArrayBuffer;
utils.ArrayBuffer2f = utils.extend(utils.ArrayBuffer, {
    /// number of components per attribute
    size: 2
});
utils.ArrayBuffer4f = utils.extend(utils.ArrayBuffer, {
    /// number of components per attribute
    size: 4
});

utils.ElementBuffer = utils.extend(utils.ArrayBuffer, {
    target: WebGLRenderingContext.ELEMENT_ARRAY_BUFFER,
    type: WebGLRenderingContext.UNSIGNED_SHORT,

    draw: function(gl) {
	this.update(gl);
	this.bindBuffer(gl);
	utils.debug > 1 && console.log(
	    "drawElements", this.name,
	    this.modeName(),
	    this.data.length
	);
	gl.drawElements(this.mode, this.data.length, this.type, 0);
    }
});

utils.ElementBuffer3i = utils.ElementBuffer;
utils.ElementBuffer2i = utils.extend(utils.ElementBuffer, {
    /// number of components per attribute
    size: 2
});
utils.ElementBuffer2ui = utils.extend(utils.ElementBuffer, {
    size: 2,
    type: WebGLRenderingContext.UNSIGNED_INT
});

utils.Texture = utils.extend(utils.Object, {
    /// texture target
    target: WebGLRenderingContext.TEXTURE_2D,

    /// texture wrap
    wrap_s: WebGLRenderingContext.CLAMP_TO_EDGE,
    wrap_t: WebGLRenderingContext.CLAMP_TO_EDGE,

    /// texture filters
    min_filter: WebGLRenderingContext.LINEAR,
    mag_filter: WebGLRenderingContext.LINEAR,

    /// image format
    flipY: true,
    internalFormat: WebGLRenderingContext.RGBA,
    format: WebGLRenderingContext.RGBA,

    /// texture unit
    textureUnit: 0,

    /// if true, generate mip maps
    mipMaps: false,

    init: function(gl, name, image) {
	this.name = name;
	this.texture = gl.createTexture();
	this.bindTexture(gl);
	gl.texParameteri(this.target, gl.TEXTURE_WRAP_S, this.wrap_s);
	gl.texParameteri(this.target, gl.TEXTURE_WRAP_T, this.wrap_t);
	gl.texParameteri(this.target, gl.TEXTURE_MIN_FILTER, this.min_filter);
	gl.texParameteri(this.target, gl.TEXTURE_MAG_FILTER, this.mag_filter);
	this.image = null;
	this.dirty = false;
	if (image) {
	    this.set(image);
	}
	return this;
    },

    targetName: function() {
	switch (this.target) {
	case WebGLRenderingContext.TEXTURE_2D:
		return "TEXTURE_2D";
	case WebGLRenderingContext.TEXTURE_CUBE_MAP:
		return "CUBE_MAP";
	default:
		return this.target.toString();
	}
    },

    bindTexture: function(gl) {
	var tu = gl.TEXTURE0 + this.textureUnit;
	if (gl.getParameter(gl.ACTIVE_TEXTURE) != tu) {
	    utils.debug > 2 && console.log(
		"activeTexture", this.textureUnit
	    );
	    gl.activeTexture(tu);
	}
	var texture;
	switch (this.target) {
	case WebGLRenderingContext.TEXTURE_2D:
	    texture = gl.getParameter(gl.TEXTURE_BINDING_2D);
	    break;
	case WebGLRenderingContext.TEXTURE_CUBE_MAP:
	    texture = gl.getParameter(gl.TEXTURE_BINDING_CUBE_MAP);
	    break;
	default:
	    // unknown target
	    return;
	}
	if (texture != this.texture) {
	    utils.debug > 2 && console.log(
		"bindTexture", this.textureUnit, this.name, this.targetName()
	    );
	    gl.bindTexture(this.target, this.texture);
	}
    },

    set: function(image) {
	this.image = image;
	this.dirty = true;
    },

    update: function(gl) {
	if (!this.dirty) {
	    return;
	}
	this.dirty = false;
	this.bindTexture(gl);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, this.flipY);
	gl.texImage2D(
	    this.target, 0, this.internalFormat, this.format, gl.UNSIGNED_BYTE,
	    this.image
	);
	if (this.mipMaps) {
	    gl.generateMipmap(this.target);
	}
    }
});

utils.Texture2D = utils.Texture;

/**
 * Cube map texture.
 */
utils.TextureCubeMap = utils.extend(utils.Texture, {
    /// texture target
    target: WebGLRenderingContext.TEXTURE_CUBE_MAP,

    // side targets
    sideTargets: {
	front:  WebGLRenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_Z,
	back:   WebGLRenderingContext.TEXTURE_CUBE_MAP_POSITIVE_Z,
	top:    WebGLRenderingContext.TEXTURE_CUBE_MAP_POSITIVE_Y,
	bottom: WebGLRenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_Y,
	left:   WebGLRenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_X,
	right:  WebGLRenderingContext.TEXTURE_CUBE_MAP_POSITIVE_X
    },

    /// texture wrap
    wrap_r: WebGLRenderingContext.CLAMP_TO_EDGE,

    init: function(gl, name, images) {
	utils.Texture.init.call(this, gl, name);
	if (gl.TEXTURE_WRAP_R) {
	    console.log("wrap r", this.target, gl.TEXTURE_WRAP_R, this.wrap_r);
	    gl.texParameteri(this.target, gl.TEXTURE_WRAP_R, this.wrap_r);
	}
	this.sides = {};
	if (images) {
	    this.set(images);
	}
	return this;
    },

    set: function(images) {
	for (var side in images) {
	    if (this.sideTargets[side] == undefined) {
		throw new Error(side + ": invalid cube map side");
	    }
	    var rec = this.sides[side];
	    if (!rec) {
		this.sides[side] = rec = {};
	    }
	    rec.image = images[side];
	    rec.dirty = true;
	    this.dirty = true;
	}
    },

    update: function(gl) {
	if (!this.dirty) {
	    return;
	}
	this.dirty = false;
	this.bindTexture(gl);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, this.flipY);
	for (var side in this.sideTargets) {
	    var rec = this.sides[side];
	    if (!rec) {
		throw new Error(side + ": missing cube map side");
	    }
	    if (!rec.dirty) {
		continue;
	    }
	    rec.dirty = false;
	    gl.texImage2D(
		this.sideTargets[side], 0, this.internalFormat, this.format,
		gl.UNSIGNED_BYTE,
		rec.image
	    );
	}
    }
});

/**
 * Sky map texture.
 * The vertex shader rotates the texture cube map 180d around the x-axis,
 * so we need to swap the following sides:
 *	front/back textures are swapped
 *	top/bottom textures are swapped
 */
utils.TextureSkyMap = utils.extend(utils.TextureCubeMap, {
    // side targets
    sideTargets: {
	// swap front and back
	back: WebGLRenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_Z,
	front: WebGLRenderingContext.TEXTURE_CUBE_MAP_POSITIVE_Z,

	// swap top and bottom
	bottom: WebGLRenderingContext.TEXTURE_CUBE_MAP_POSITIVE_Y,
	top: WebGLRenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_Y,

	left:   WebGLRenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_X,
	right:  WebGLRenderingContext.TEXTURE_CUBE_MAP_POSITIVE_X
    }
});

/**
 * A WebGL shader program.
 */
utils.Program = utils.extend(utils.Object, {
    init: function(gl, name, program) {
	this.name = name;
	this.program = program;
	this.items = [];
	this.attributes = {};
	this.uniforms = {};
	return this;
    },

    useProgram: function(gl) {
	gl.useProgram(this.program);
    },

    attributeInit: function(gl, name, attr) {
	attr.setup(gl, name, this);
	this.items.push(attr);
	this.attributes[name] = attr;
	return attr;
    },

    attributesInit: function(gl, attrs) {
	for (var name in attrs) {
	    this.attributeInit(gl, name, attrs[name]);
	}
    },

    uniformInit: function(gl, name, uniform) {
	uniform.setup(gl, name, this);
	this.items.push(uniform);
	this.uniforms[name] = uniform;
    },

    uniformsInit: function(gl, uniforms) {
	for (var name in uniforms) {
	    this.uniformInit(gl, name, uniforms[name]);
	}
    },

    update: function(gl) {
	for (var i = 0, n = this.items.length; i < n; ++i) {
	    var item = this.items[i];
	    item.update(gl);
	}
    }
});

utils.ProgramItem = utils.extend(utils.Object, {
    setup: function(name, programName) {
	this.name = name;
	this.programName = programName;
	this.location = null;
	this.value = null;
	this.dirty = false;
	return this;
    },

    displayName: function() {
	return this.programName + "." + this.name;
    },

    set: function(value) {
	this.value = value;
	this.dirty = true;
    }
});

utils.Uniform = utils.extend(utils.ProgramItem, {
    setup: function(gl, name, program) {
	utils.ProgramItem.setup.call(this, name, program.name);
	this.location = gl.getUniformLocation(program.program, name);
    }
});

utils.Uniform1i = utils.extend(utils.Uniform, {
    update: function(gl) {
	if (!this.dirty) {
	    return;
	}
	this.dirty = false;
	utils.debug > 2 && console.log(
	    "uniform1i", this.displayName(), this.value
	);
	gl.uniform1i(this.location, this.value);
    }
});

utils.Uniform2f = utils.extend(utils.Uniform, {
    update: function(gl) {
	if (!this.dirty) {
	    return;
	}
	this.dirty = false;
	utils.debug > 2 && console.log(
	    "uniform2f", this.displayName(), this.value
	);
	gl.uniform2f(this.location, this.value[0], this.value[1]);
    }
});

utils.Uniform3f = utils.extend(utils.Uniform, {
    update: function(gl) {
	if (!this.dirty) {
	    return;
	}
	this.dirty = false;
	utils.debug > 2 && console.log(
	    "uniform3fv", this.displayName(), this.value
	);
	gl.uniform3fv(this.location, this.value);
    }
});

utils.Uniform4f = utils.extend(utils.Uniform, {
    update: function(gl) {
	if (!this.dirty) {
	    return;
	}
	this.dirty = false;
	utils.debug > 2 && console.log(
	    "uniform4fv", this.displayName(), this.value
	);
	gl.uniform4fv(this.location, this.value);
    }
});

utils.UniformMat3 = utils.extend(utils.Uniform, {
    update: function(gl) {
	if (!this.dirty) {
	    return;
	}
	this.dirty = false;
	utils.debug > 2 && console.log(
	    "uniformMatrix3fv", this.displayName(), this.value
	);
	gl.uniformMatrix3fv(this.location, false, this.value);
    }
});

utils.UniformMat4 = utils.extend(utils.Uniform, {
    update: function(gl) {
	if (!this.dirty) {
	    return;
	}
	this.dirty = false;
	utils.debug > 2 && console.log(
	    "uniformMatrix4fv", this.displayName(), this.value
	);
	gl.uniformMatrix4fv(this.location, false, this.value);
    }
});

utils.Attribute = utils.extend(utils.ProgramItem, {
    setup: function(gl, name, program) {
	utils.ProgramItem.setup.call(this, name, program.name);
	this.location = gl.getAttribLocation(program.program, name);
    }
});

utils.AttributeBuffer = utils.extend(utils.Attribute, {
    set: function(value) {
	utils.assert && utils.assert(
	    value && value.target == WebGLRenderingContext.ARRAY_BUFFER,
	    this.displayName() + ":  setting to an invalid buffer value"
	);
	utils.Attribute.set.call(this, value);
    },

    update: function(gl) {
	var value = this.value;
	utils.assert && utils.assert(
	    value,
	    this.displayName() + ": value is null"
	);
	if (!this.dirty && !value.dirty) {
	    return;
	}
	this.dirty = false;
	value.update(gl);
	value.bindBuffer(gl);
	utils.debug > 2 && console.log(
	    "enableVertexAttribArray", this.displayName()
	);
	gl.enableVertexAttribArray(this.location);
	utils.debug > 2 && console.log(
	    "enableVertexAttribPointer", this.displayName(), value.name,
	    value.size, value.typeName(), value.normalized,
	    value.stride, value.offset
	);
	gl.vertexAttribPointer(
	    this.location, value.size, value.type, value.normalized,
	    value.stride, value.offset
	);
    }
});

/**
 * WebGL shader loader
 */
utils.AssetShader = utils.extend(utils.AssetLoader, {
    init: function(config) {
	utils.AssetLoader.init.call(this, config);

	var gl = config.gl;
	this.batch({
	    vertexShader: utils.AssetRequest.create({
		url: this.config.vertexShaderURL
	    }),
	    fragmentShader: utils.AssetRequest.create({
		url: this.config.fragmentShaderURL
	    })
	});
	return this;
    },

    cleanup: function() {
	utils.AssetLoader.cleanup.call(this);
	this.program = null;
    },

    compile: function(sourceCode, type) {
	var gl = this.config.gl;
	var shader = gl.createShader(type);
	gl.shaderSource(shader, sourceCode);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
	    var info = gl.getShaderInfoLog(shader);
	    this.error("Could not compile WebGL program.\n\n" + info);
	    return null;
	}
	return shader;
    },

    ready: function() {
	var gl = this.config.gl;
	var vertexShader = this.compile(
	    this.cache.vertexShader.responseText(),
	    gl.VERTEX_SHADER
	);
	if (!vertexShader) {
	    return;
	}
	var fragmentShader = this.compile(
	    this.cache.fragmentShader.responseText(),
	    gl.FRAGMENT_SHADER
	);
	if (!fragmentShader) {
	    return;
	}

	var program = gl.createProgram();
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
	    var info = gl.getProgramInfoLog(program);
	    this.error("Could not link WebGL program.\n\n" + info);
	    return;
	}
	this.program = utils.Program.create(gl, this.config.name, program);
	if (this.config.uniforms) {
	    this.program.uniformsInit(gl, this.config.uniforms);
	}
	if (this.config.attributes) {
	    this.program.attributesInit(gl, this.config.attributes);
	}
	utils.AssetLoader.ready.call(this);
    }
});

/**
 * Prototype cubemap texture loader.
 * @mixin
 * @mixes utils.AssetLoader
 */
utils.AssetTextureCubeMap = utils.extend(utils.AssetLoader, {
    /// face names
    FACES: ['front', 'back', 'top', 'bottom', 'left', 'right'],

    /**
     * tile pattern A:
     *	---- top    ----- ----
     *	left front  right back
     *	---- bottom ----- ----
     */
    TILE_PATTERN_A: {
	// tile offsets
	front: { tx: 1, ty: 1 },
	back: { tx: 3, ty: 1 },
	top: { tx: 1, ty: 0 },
	bottom: { tx: 1, ty: 2 },
	left: { tx: 0, ty: 1 },
	right: { tx: 2, ty: 1 },

	// tile rows and columns
	rows: 3,
	columns: 4
    },

    /**
	var configTiles = {
	    src: "images/cube_map.jpg",
	    pattern: utils.CubeMapLoader.TILE_PATTERN_A,
	    border: 0,
	    crop: 2,
	    faces: {
		front: {
		    flipH: true,
		    flipV: false
		}
	    }
	};
	var configImages = {
	    border: 0,
	    crop: 0,
	    faces: {
		front: {
		    src: "images/skybox/front.jpg",
		    flipH: true
		},
		back: {
		    src: "images/skybox/back.jpg"
		},
		top: {
		    src: "images/skybox/top.jpg"
		},
		bottom: {
		    src: "images/skybox/bottom.jpg"
		},
		left: {
		    src: "images/skybox/left.jpg"
		},
		right: {
		    src: "images/skybox/right.jpg"
		}
	    }
	};
     */
    init: function(config) {
	utils.AssetLoader.init.call(this, config);
	this.configDefaults(config);
	this.textures = {};
	var images = {};
	var src = config.src;
	if (src) {
	    images[src] = utils.AssetImage.create({
		src: src
	    });
	}
	var faces = config.faces;
	for (var name in faces) {
	    var face = faces[name];
	    src = face.src;
	    if (src) {
		images[src] = utils.AssetImage.create({
		    src: src
		});
	    }
	}
	this.batch(images);
	return this;
    },

    configDefaults: function(config) {
	var faces = config.faces;
	if (!faces) {
	    faces = config.faces = {};
	}
	for (var i = 0, n = this.FACES.length; i < n; ++i) {
	    var name = this.FACES[i];
	    if (!faces[name]) {
		faces[name] = {};
	    }
	}
    },

    ready: function() {
	var faces = this.config.faces;
	var tileSrc = this.config.src;
	var tileImg;
	if (tileSrc) {
	    tileImg = this.cache[tileSrc].image;
	}
	var patterns = this.config.pattern || this.TILE_PATTERN_A;
	for (var i = 0, n = this.FACES.length; i < n; ++i) {
	    var name = this.FACES[i];
	    var face = faces[name];
	    if (tileSrc) {
		var pattern = patterns[name];
		if (pattern) {
		    this.tileExtract(tileImg, patterns, pattern, face);
		}
	    }
	    var src = face.src;
	    if (src) {
		face.image = this.cache[src].image;
	    }
	    this.faceFlip(face);
	    this.faceDebug(face, name);
	    this.textures[name] = face.canvas || face.image;
	}
	utils.AssetLoader.ready.call(this);
    },

    cleanup: function() {
	utils.AssetLoader.cleanup.call(this);
	this.textures = {};
	if (this.config) {
	    var faces = this.config.faces;
	    for (var name in faces) {
		var face = faces[name];
		face.image = null;
		face.canvas = null;
	    }
	}
    },

    tileExtract: function(img, patterns, pattern, face) {
	var border = this.config.border || 0;
	var rows = patterns.rows;
	var cols = patterns.columns;
	var tw = Math.floor((img.width - (cols + 1) * border) / cols);
	var th = Math.floor((img.height - (rows + 1) * border) / rows);
	var tx = pattern.tx * (tw + border) + border;
	var ty = pattern.ty * (th + border) + border;

	var size = this.config.size || 512;	
	if (size < tw || size < th) {
	    size = Math.max(tw, th);
	    console.log("resize texture canvas", this.config.size, size);
	}
	var canvas = document.createElement('canvas');
	canvas.style.visibility = 'hidden';
	canvas.style.width = size + 'px';
	canvas.style.height = size + 'px';
	canvas.width = size;
	canvas.height = size;

	var crop = this.config.crop; // crop image to reduce texture seams
	if (crop != undefined) {
	    tx += crop;
	    ty += crop;
	    tw -= 2 * crop;
	    th -= 2 * crop;
	}
	var ctx = canvas.getContext('2d');
	ctx.drawImage(img, tx, ty, tw, th, 0, 0, size, size);
	face.canvas = canvas;
	return canvas;
    },

    faceCanvas: function(face) {
	if (face.canvas) {
	    return face.canvas;
	}

	var img = face.image;
	var w = img.width;
	var h = img.height;
	var canvas = document.createElement('canvas');
	canvas.style.visibility = 'hidden';
	canvas.style.width = w + 'px';
	canvas.style.height = h + 'px';
	canvas.width = w;
	canvas.height = h;
	var ctx = canvas.getContext('2d');
	ctx.drawImage(img, 0, 0, w, h);
	face.canvas = canvas;
	return canvas;
    },

    faceFlip: function(face) {
	var flipH = face.flipH;
	var flipV = face.flipV;
	if (!flipH && !flipV) {
	    return;
	}

	var src = this.faceCanvas(face);
	var w = src.width;
	var h = src.height;
	var dest = document.createElement('canvas');
	dest.style.visibility = 'hidden';
	dest.style.width = w + 'px';
	dest.style.height = h + 'px';
	dest.width = w;
	dest.height = h;
	var ctx = dest.getContext('2d');
	ctx.save();
	ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
	ctx.drawImage(src, flipH ? -w : 0, flipV ? -h : 0, w, h);
	ctx.restore();
	face.canvas = dest;
    },

    faceDebug: function(face, text) {
	if (!this.config.debug && !face.debug) {
	    return;
	}

	var canvas = this.faceCanvas(face);
	var ctx = canvas.getContext('2d');
	ctx.save();
	var color = this.config.color || 'black';
	ctx.strokeStyle = color;
	ctx.fillStyle = color;
	ctx.font = this.config.font || "48px serif";
	var tm = ctx.measureText(text);
	var w = canvas.width;
	var h = canvas.height;
	var x = (w - tm.width) / 2;
	var y = (w - (tm.fontBoundingBoxAscent || 0)) / 2;
	ctx.fillText(text, x, y);
	var inset = this.config.inset || 20;
	var insetMin = Math.min(w, h) / 3;
	if (inset > insetMin) {
	    inset = insetMin;
	}
	ctx.strokeRect(10, 10, w - inset, h - inset);
	ctx.restore();
    }
});
