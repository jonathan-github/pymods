/**
 * @file utility classes functions for WebGL
 */

/**
 * Prototype WebGL application.
 * @mixin
 */
utils.App = {
    /// resize delay in msec
    RESIZE_DELAY: 500,

    /// webgl context names
    WEBGL_CONTEXT_NAMES: [
	['webgl2', 2],
	['webgl', 1],
	['experimental-webgl', 1]
    ],

    initCanvas: function() {
	utils.debug && console.log("initCanvas");
	this.canvas = document.createElement('canvas');
	this.canvas.style.display = 'block';
	utils.userSelectSet(this.canvas, 'none');
	document.body.appendChild(this.canvas);
	this.initContext();
	this.initLoader();
    },

    initContext: function() {
	var gl, version;
	for (var i = 0, n = this.WEBGL_CONTEXT_NAMES.length; i < n; ++i) {
	    var spec = this.WEBGL_CONTEXT_NAMES[i];
	    var name = spec[0];
	    try {
		gl = this.canvas.getContext(name /*, { alpha: false }*/);
	    } catch (ex) {
		utils.debug && console.log("error creating " + name + " context", ex);
	    }
	    if (gl) {
		version = spec[1];
		break;
	    }
	}
	if (!gl) {
	    throw new Error("unable to create a webgl context");
	}
	this.gl = gl;
	this.glVersion = version;
        if (version >= 2) {
            utils.Texture.NPOT_CHECK = false;
        }

	var extensions = this.EXTENSIONS;
	if (extensions) {
	    this.ext = {};
	    for (i = 0, n = extensions.length; i < n; ++i) {
		var ext, name = extensions[i];
		if (Array.isArray(name)) {
		    for (var j = 0, m = name.length; j < m; ++j) {
			ext = gl.getExtension(name[j]);
			if (ext) {
			    name = name[j];
			    break;
			}
		    }
		} else {
		    ext = gl.getExtension(name);
		}
		if (ext) {
		    this.ext[name] = ext;
		} else {
		    console.log("WebGL extension not supported", name);
		}
	    }
	}
    },

    initLoader: function() {
	this.loader = utils.AssetLoader.create({
	    ready: this.ready,
	    error: this.error,
	    scope: this
	});
    },

    error: function(loader) {
	alert("load failed: " + loader.reason);
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
    },

    renderRequest: function() {
	var renderFunc = this.renderFunc;
	if (!renderFunc) {
	    renderFunc = this.renderFunc = this.render.bind(this);
	}
	this.renderId = window.requestAnimationFrame(renderFunc);
    },
    renderCancel: function() {
        if (this.renderId != null) {
            window.cancelAnimationFrame(this.renderId);
            this.renderId = null;
        }
    }
};

utils.AppVR = utils.extend(utils.App, {
    VR_ENABLE: false,

    init: function() {
	console.log("init");
	if (this.VR_ENABLE) {
	    this.initVR();
	} else {
	    this.initNoVR();
	}
    },

    initVR: function() {
	if (navigator.getVRDisplays) {
	    console.log("initVR");
	    navigator.getVRDisplays().then(
		this.initVRDisplays.bind(this),
		this.vrError.bind(this)
	    );
	} else {
	    alert("No VR support enabled.");
	    this.VR_ENABLE = false;
	    this.initNoVR();
	}
    },

    initVRDisplays: function(displays) {
	console.log("initVRDisplays", displays);
	for (var i = 0, n = displays.length; i < n; ++i) {
	    var display = displays[i];
	    console.log("display", i, display);
	    var layers = display.getLayers();
	    console.log("layers", layers);
	}
	if (n > 0) {
	    this.vrDisplay = displays[0];
	    utils.listeners(window, {
		vrdisplayconnect: this.vrDisplayConnect,
		vrdisplaydisconnect: this.vrDisplayDisconnect,
		vrdisplayactivate: this.vrDisplayActivate,
		vrdisplaydeactivate: this.vrDisplayDeactivate,
		vrdisplayblur: this.vrDisplayBlur,
		vrdisplayfocus: this.vrDisplayFocus,
		vrdisplaypresentchange: this.vrDisplayPresentChange,
		scope: this
	    });

	    this.button = document.createElement('button');
	    utils.contentText(this.button, "Start");
	    utils.on(this.button, 'click', this.vrStart, this);
	    document.body.appendChild(this.button);
	} else {
	    alert("No VR displays detected.");
	    //this.VR_ENABLE = false;
	    //this.initNoVR();
	}
    },

    vrError: function() {
	console.log("vrError", arguments);
    },

    vrDisplayConnect: function() {
	console.log("vrDisplayConnect", arguments);
    },
    vrDisplayDisconnect: function() {
	console.log("vrDisplayDisconnect", arguments);
    },

    vrDisplayActivate: function() {
	console.log("vrDisplayActivate", arguments);
	//this.vrStart();
    },
    vrDisplayDeactivate: function() {
	console.log("vrDisplayDeactivate", arguments);
    },

    vrDisplayBlur: function() {
	console.log("vrDisplayBlur", arguments);
    },
    vrDisplayFocus: function() {
	console.log("vrDisplayFocus", arguments);
    },

    vrDisplayPresentChange: function() {
	console.log("vrDisplayPresentChange", arguments);
    },

    vrStart: function() {
	console.log("vrStart");
	var vrDisplay = this.vrDisplay;
	var leftEye = vrDisplay.getEyeParameters("left");
	var rightEye = vrDisplay.getEyeParameters("right");
	var canvas = document.createElement('canvas');
	canvas.width = Math.max(leftEye.renderWidth, rightEye.renderWidth) * 2;
	canvas.height = Math.max(leftEye.renderHeight, rightEye.renderHeight);
	document.body.appendChild(canvas);
	this.canvas = canvas;
	this.initContext();
	this.initLoader();
	this.load();
    },

    initNoVR: function() {
	this.initCanvas();
	this.load();
    },

    load: function() {
	/*EMPTY*/
    },

    ready: function() {
	if (this.VR_ENABLE) {
	    this.loader.cleanup();
	    this.readyVR();
	} else {
	    this.readyNoVR();
	    utils.App.ready.call(this);
	}
    },

    readyVR: function() {
	this.vrDisplay.requestPresent([{ source: this.canvas }]).then(
	    this.vrPresent.bind(this),
	    this.vrError.bind(this)
	);
    },
    readyNoVR: function() {
	/*EMPTY*/
    },

    vrPresent: function() {
	this.frameData = new VRFrameData();
	this.vrFrameHandler = this.vrFrame.bind(this);
	this.vrDisplay.requestAnimationFrame(this.vrFrameHandler);
    },

    vrFrame: function() {
	var vrDisplay = this.vrDisplay;
	var frameData = this.frameData;

	vrDisplay.requestAnimationFrame(this.vrFrameHandler);
	vrDisplay.getFrameData(frameData);
	this.renderVR(frameData);
	vrDisplay.submitFrame();
    },

    renderVR: function(frameData) {
	var gl = this.gl;
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	var canvas = this.canvas;
	var w = canvas.width * 0.5;
	var h = canvas.height;

	gl.enable(gl.DEPTH_TEST);
	gl.depthMask(true);
	gl.depthFunc(gl.LESS);

	gl.viewport(0, 0, w,  h);
	// draw left eye view

	gl.viewport(w, 0, w, h);
	// draw right eye view

	utils.debug = 0;
    }
});

/**
 * Base controller parameters.
 * @mixin
 */
utils.ControllerBase = {
    /// field of view
    fov: 1/4,
    fovInit: 1/4,
    fovMin: 1/6,
    fovMax: 1/2,

    /// near and far clipping planes
    nearClippingPlaneDistance: 0.01,
    farClippingPlaneDistance: 10000,

    init: function(app) {
	this.app = app;
	this.pMatrix = mat4.create();
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
    }
};

/**
 * Prototype view controller.
 * @mixin
 */
utils.ViewController = utils.extend(utils.ControllerBase, {
    init: function(app) {
	utils.ControllerBase.init.call(this, app);
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
	var trans;
	var step = 0.5;
	switch (event.key) {
	case 'r':
	    // reset view
	    this.reset();
	    this.pMatrixUpdate();
	    this.vMatrixUpdate();
	    return;
	case 'ArrowUp':
	    // forward
	    trans = [0, 0, +step, 0];
	    break;
	case 'ArrowLeft':
	    // left
	    trans = [-step, 0, 0, 0];
	    break;
	case 'ArrowRight':
	    // right
	    trans = [+step, 0, 0, 0];
	    break;
	case 'ArrowDown':
	    // backward
	    trans = [0, 0, -step, 0];
	    break;
	case 'Home':
	    // up
	    trans = [0, +step, 0, 0];
	    break;
	case 'End':
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
	utils.ControllerBase.pMatrixUpdate.call(this);
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
});

/**
 * Prototype model controller.
 * @mixin
 */
utils.ModelController = utils.extend(utils.ControllerBase, {
    init: function(app, origin, overlay) {
	utils.ControllerBase.init.call(this, app);
	this.origin = origin || vec3.create();
	this.toOrigin = vec3.create();
	vec3.negate(this.toOrigin, this.origin);
	this.mMatrix = mat4.create();
	this.rotate = quat.create();
	this.pitch = quat.create();
	this.yaw = quat.create();
	this.reset();

	//this.overlay = utils.Overlay.create();
	this.overlay = overlay;

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
	switch (event.key) {
	case 'r':
	    this.reset();
	    this.pMatrixUpdate();
	    this.mMatrixUpdate();
	    return;
	}

	var trans, yaw = 0;
	var step = 1;
	switch (event.key) {
	case 'ArrowDown':
	case 's':
	    // forward
	    trans = [0, 0, +step, 0];
	    break;
	case 'ArrowLeft':
	    // left
	    trans = [-step, 0, 0, 0];
	    break;
	case 'ArrowRight':
	    // right
	    trans = [+step, 0, 0, 0];
	    break;
	case 'ArrowUp':
	case 'w':
	    // backward
	    trans = [0, 0, -step, 0];
	    break;
	case 'Home':
	case 'e':
	    // up
	    trans = [0, +step, 0, 0];
	    break;
	case 'End':
	case 'q':
	    // down
	    trans = [0, -step, 0, 0];
	    break;

	case 'a':
	    // yaw left
	    yaw = +5;
	    break;
	case 'd':
	    // yaw right
	    yaw = -5;
	    break;
	}
	if (trans) {
	    var pos = this.pos;
	    vec3.add(pos, pos, trans);
	}
	if (yaw) {
	    var rotate = this.rotate;
	    yaw = quat.setAxisAngle(this.yaw, [0, 1, 0], utils.radians(yaw));
	    quat.multiply(rotate, rotate, yaw);
	    quat.normalize(rotate, rotate);
	}

	this.mMatrixUpdate();
    },

    pMatrixUpdate: function() {
	utils.ControllerBase.pMatrixUpdate.call(this);
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
	if (!this.overlay) {
	    return;
	}
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
});
utils.ModelControllerNew = utils.extend(utils.ControllerBase, {
    init: function(app, origin) {
	utils.ControllerBase.init.call(this, app);
	this.origin = origin || vec3.create();
	this.toOrigin = vec3.create();
	vec3.negate(this.toOrigin, this.origin);
	this.mMatrix = mat4.create();
	this.pos = vec3.create();
	this.q = quat.create();
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
	vec3.copy(this.pos, this.origin);
	quat.identity(this.q);
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

	    var q = this.q;
	    quat.rotateY(q, q, -dx * scale);
	    quat.rotateX(q, q, -dy * scale);
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
	switch (event.key) {
	case 'r':
	    this.reset();
	    this.pMatrixUpdate();
	    this.mMatrixUpdate();
	    return;
	}

	var trans, yaw = 0, pitch = 0;
	var step = 1;
	switch (event.key) {
	case 'ArrowDown':
	    // forward
	    trans = [0, 0, +step, 0];
	    break;
	case 'ArrowLeft':
	    // left
	    trans = [-step, 0, 0, 0];
	    break;
	case 'ArrowRight':
	    // right
	    trans = [+step, 0, 0, 0];
	    break;
	case 'ArrowUp':
	    // backward
	    trans = [0, 0, -step, 0];
	    break;
	case 'Home':
	case 'e':
	    // up
	    trans = [0, +step, 0, 0];
	    break;
	case 'End':
	case 'q':
	    // down
	    trans = [0, -step, 0, 0];
	    break;

	case 'w':
	    // pitch down
	    pitch = -5;
	    break;
	case 's':
	    // pitch up
	    pitch = +5;
	    break;
	case 'a':
	    // yaw left
	    yaw = -5;
	    break;
	case 'd':
	    // yaw right
	    yaw = +5;
	    break;
	}
	if (trans) {
	    var pos = this.pos;
	    vec3.add(pos, pos, trans);
	}
	if (yaw) {
	    quat.rotateY(this.q, this.q, utils.radians(yaw));
	}
	if (pitch) {
	    quat.rotateX(this.q, this.q, utils.radians(pitch));
	}

	this.mMatrixUpdate();
    },

    pMatrixUpdate: function() {
	utils.ControllerBase.pMatrixUpdate.call(this);
	this.overlayUpdate();
    },

    mMatrixUpdate: function() {
	var mMatrix = this.mMatrix;
	mat4.fromRotationTranslation(mMatrix, this.q, this.pos);
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
	var q = this.q;
	return {
	    pitch: this.degrees(2*Math.acos(q[0])),
	    yaw: this.degrees(2*Math.acos(q[1])),
	    roll: this.degrees(2*Math.acos(q[2]))
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
});

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
	case WebGLRenderingContext.UNSIGNED_BYTE:
		return "UNSIGNED_BYTE";
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
	if (data instanceof Uint8Array) {
	    this.typeCheck(WebGLRenderingContext.UNSIGNED_BYTE);
	} else if (data instanceof Uint16Array) {
	    this.typeCheck(WebGLRenderingContext.UNSIGNED_SHORT);
	} else if (data instanceof Uint32Array) {
	    this.typeCheck(WebGLRenderingContext.UNSIGNED_INT);
	} else if (data instanceof Float32Array) {
	    this.typeCheck(WebGLRenderingContext.FLOAT);
	} else if (data) {
	    if (this.type == WebGLRenderingContext.UNSIGNED_BYTE) {
		data = new Uint8Array(data);
	    } else if (this.type == WebGLRenderingContext.UNSIGNED_SHORT) {
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
utils.ArrayBuffer1f = utils.extend(utils.ArrayBuffer, {
    /// number of components per attribute
    size: 1
});
utils.ArrayBuffer2f = utils.extend(utils.ArrayBuffer, {
    /// number of components per attribute
    size: 2
});
utils.ArrayBuffer4f = utils.extend(utils.ArrayBuffer, {
    /// number of components per attribute
    size: 4
});

utils.ElementBuffer = utils.extend(utils.ArrayBuffer, {
    size: 1,
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

utils.ElementBufferUs = utils.ElementBuffer;
utils.ElementBufferUi = utils.extend(utils.ElementBuffer, {
    type: WebGLRenderingContext.UNSIGNED_INT
});

/**
 * Determine if the size if a power of two.
 * @param {Integer} size the size
 * @returns {Boolean} true if the size is a power of two
 */
utils.isPOT = function(size) {
    while ((size & 1) == 0)  {
	size >>= 1;
    }
    return size == 1;
};

utils.Texture = utils.extend(utils.Object, {
    /// if true, check for NPOT texture limitations
    NPOT_CHECK: true,

    /// texture target
    target: WebGLRenderingContext.TEXTURE_2D,

    /// texture wrap
    wrap_s: WebGLRenderingContext.CLAMP_TO_EDGE,
    wrap_t: WebGLRenderingContext.CLAMP_TO_EDGE,

    /// texture filters
    min_filter: WebGLRenderingContext.LINEAR,
    mag_filter: WebGLRenderingContext.LINEAR,

    /// if true, generate mip maps
    mipMaps: false,

    /// image format
    flipY: true,
    internalFormat: WebGLRenderingContext.RGBA,
    format: WebGLRenderingContext.RGBA,
    type: WebGLRenderingContext.UNSIGNED_BYTE,

    /// texture unit
    textureUnit: 0,

    /// width/height
    width: undefined,
    height: undefined,

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
	if (this.NPOT_CHECK &&
            (!utils.isPOT(image.width) || !utils.isPOT(image.height))) {
	    utils.assert && utils.assert(
		(this.wrap_s == WebGLRenderingContext.CLAMP_TO_EDGE &&
		 this.wrap_t == WebGLRenderingContext.CLAMP_TO_EDGE),
		this.name + ": wrap_s and wrap_t must be CLAMP_TO_EDGE for NPOT textures"
	    );
	    utils.assert && utils.assert(
		!this.mipMaps,
		this.name + ": mipmaps require POT textures"
	    );
	}
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
	if (this.image != undefined) {
	    gl.texImage2D(
		this.target, 0, this.internalFormat,
		this.format, this.type,
		this.image
	    );
	} else if (this.width != undefined && this.height != undefined) {
	    gl.texImage2D(
		this.target, 0, this.internalFormat,
		this.width, this.height, 0,
		this.format, this.type
	    );
	}
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
	this.attributes = utils.create(utils.ProgramItems);
	this.uniforms = utils.create(utils.ProgramItems);
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
            var attr = attrs[name];
	    this.attributeInit(gl, name, attr);
	}
    },

    uniformInit: function(gl, name, uniform) {
        if (Array.isArray(uniform)) {
            utils.assert && utils.assert(
                uniform.length == 2 &&
                utils.isA(uniform[0], utils.Uniform) &&
                typeof uniform[1] == 'number',
                "invalid uniform array: " + uniform
            );
            var type = uniform[0];
            var count = uniform[1];
            var ary = [];
            for (var i = 0; i < count; ++i) {
                var elName = name + '[' + i + ']';
                var el = type.create();
                this.uniformInit(gl, elName, el);
                ary.push(el);
            }
            this.uniforms[name] = ary;
            return;
        }

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

utils.ProgramItems = {
    set: function(items) {
	for (var name in items) {
	    var item = this[name];
	    utils.assert && utils.assert(
		item !== undefined,
		name + ": unknown item"
	    );
	    item.set(items[name]);
	}
    }
};

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

utils.Uniform1f = utils.extend(utils.Uniform, {
    update: function(gl) {
	if (!this.dirty) {
	    return;
	}
	this.dirty = false;
	utils.debug > 2 && console.log(
	    "uniform1f", this.displayName(), this.value
	);
	gl.uniform1f(this.location, this.value);
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
	if (value == null){
	    return;
	}
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
 * Figure asset loader.
 */
utils.AssetFigure = utils.extend(utils.AssetRequest, {
    // default texture directory
    textureDir: "lib/textures",

    init: function(config) {
	if (!config.responseType) {
	    config.responseType = 'json';
	}
        if (!config.url && config.name) {
            config.url = "lib/models/" + config.name + "/model.json";
            this.textureDir = "lib/models";
        }
	utils.AssetRequest.init.call(this, config);
	return this;
    },

    get: function(library) {
	var images = this.model.images;
	if (images) {
	    if (!library.images) {
		library.images = {};
		library.imageMaps = {};
	    }
	    var assets = this.images;
	    for (var i = 0, n = images.length; i < n; ++i) {
		var image = images[i];
		var asset = assets[i];
                if (!asset) {
                    /* image map */
                    this.buildImageMap(library, image);
                } else {
	            library.images[image.url] = {
		        id: image.url,
		        image: asset.image
		    };
                }
	    }
	}
	return this.model;
    },

    buildImageMap: function(library, image) {
        var layers = image.map;
        var n = layers.length;
        if (n > 1) {
            console.log("TBD: image map", image);
            return;
        }
	library.imageMaps[image.id] = {
	    id: image.id,
	    image: this.images[layers[0].image].image
	};
    },

    cleanup: function() {
	this.model = null;
	this.images = null;
	utils.AssetRequest.cleanup.call(this);
    },

    ready: function() {
	this.model = this.responseJSON();
	this.imagesLoad();
	utils.AssetRequest.ready.call(this);
    },

    imagesLoad: function() {
	var images = this.model && this.model.images;
	if (images) {
	    this.images = [];
	    for (var i = 0, n = images.length; i < n; ++i) {
		var image = images[i];
                var file = image.url;
                if (!file && image.image) {
                    console.log("using obsolete image property", image);
                    file = image.image;
                    image.url = file;
                }
                if (!file) {
                    /* image maps */
                    this.images.push(null);
                    continue;
                }
                if (this.config.remap) {
                    var remap = this.config.remap[file];
                    if (remap) {
                        file = remap;
                    }
                }
		var src = this.textureDir ? this.textureDir + "/" + file : file;
		var asset = this.loader.library[src];
		if (!asset) {
		    asset = utils.AssetImage.create({
			src: src
		    });
		    this.loader.library[src] = asset;
		    this.loader.append(asset);
		}
		this.images.push(asset);
	    }
	}
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
		url: this.config.vertexShaderURL,
		responseType: 'text'
	    }),
	    fragmentShader: utils.AssetRequest.create({
		url: this.config.fragmentShaderURL,
		responseType: 'text'
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

/**
 * Compute the normals for an indexed polygon.
 */
utils.Normals = {
    /**
     * Compute the normals for the indexed polygon.
     *
     * state = {
     *   coords: [x,y,z, ...],        // input
     *   polys: [[a,b,c,d], ...],     // input
     *   normals: []                  // output
     * }
     */
    compute: function(state) {
	var normals = [];
	var polys = state.polys;
	var coords = state.coords;
        var normal = vec3.create();
	for (var i = 0, n = polys.length; i < n; ++i) {
	    var poly = polys[i];
	    utils.surfaceNormal(normal, coords, poly, /*normalize*/true);
	    for (var j = 0, m = poly.length; j < m; ++j) {
		this.update(poly[j], normal, normals);
	    }
	}
	state.normals = this.avg(normals);
    },

    update: function(index, normal, normals) {
	var sum = normals[index];
	if (!sum) {
	    normals[index] = vec3.clone(normal);
	} else {
	    vec3.add(sum, sum, normal);
	}
    },

    avg: function(normals) {
	var avgs = [];
	var missing = 0;
	for (var i = 0, n = normals.length; i < n; ++i) {
	    var sum = normals[i];
	    if (!sum) {
		console.log("missing surface normals for vertex " + i);
		++missing;
		avgs.push(0, 0, 1);
		continue;
	    }
	    vec3.normalize(sum, sum);
	    avgs.push(sum[0], sum[1], sum[2]);
	}
	if (missing > 0) {
	    console.log("missing surface normals for " + missing + " vertices");
	}
	return avgs;
    }
};

/**
 * http://www.terathon.com/code/tangent.html
 * http://www.opengl-tutorial.org/intermediate-tutorials/tutorial-13-normal-mapping/
 */
utils.Tangents = {
    compute: function(indices, coords, normals, uvs,
		      tangents, bitangents) {
	var n = indices.length;
	var m = coords.length;
	utils.assert && utils.assert(
	    (m % 3) == 0,
	    "coordinate buffer length must be a multiple of three"
	);
	utils.assert && utils.assert(
	    normals.length == m,
	    "invalid normal buffer length"
	);
	var l = m / 3;
	utils.assert && utils.assert(
	    uvs.length == l * 2,
	    "invalid uv buffer length"
	);
	this.coords = coords;
	this.normals = normals;
	this.uvs = uvs;

	if (tangents == undefined) {
	    tangents = Array(l * 4);
	} else {
	    tangents.length = l * 4;
	}
	tangents.fill(0.0);
	if (bitangents == undefined) {
	    bitangents = Array(l * 3);
	} else {
	    bitangents.length = l * 3;
	}
	bitangents.fill(0.0);
	this.tangents = tangents;
	this.bitangents = bitangents;

	for (var i = 0; i < n; i += 3) {
	    this.process(indices[i], indices[i + 1], indices[i + 2]);
	}
	for (i = 0; i < l; ++i) {
	    this.normalize(i);
	}
    },

    clear: function() {
	this.coords = null;
	this.normals = null;
	this.uvs = null;
	this.tangents = null;
	this.bitangents = null;
    },

    process: function(i0, i1, i2) {
	var coords = this.coords;
	var uvs = this.uvs;
	var bi;

	// p0
	bi = i0 * 3;
	var x0 = coords[bi];
	var y0 = coords[bi + 1];
	var z0 = coords[bi + 2];
	// uv0
	bi = i0 * 2;
	var u0 = uvs[bi];
	var v0 = uvs[bi + 1];

	// p1
	bi = i1 * 3;
	var x1 = coords[bi];
	var y1 = coords[bi + 1];
	var z1 = coords[bi + 2];
	// uv1
	bi = i1 * 2;
	var u1 = uvs[bi];
	var v1 = uvs[bi + 1];

	// p2
	bi = i2 * 3;
	var x2 = coords[bi];
	var y2 = coords[bi + 1];
	var z2 = coords[bi + 2];
	// uv2
	bi = i2 * 2;
	var u2 = uvs[bi];
	var v2 = uvs[bi + 1];

	// d1
	var dx1 = x1 - x0;
	var dy1 = y1 - y0;
	var dz1 = z1 - z0;
	// d2
	var dx2 = x2 - x0;
	var dy2 = y2 - y0;
	var dz2 = z2 - z0;

	// duv1
	var du1 = u1 - u0;
	var dv1 = v1 - v0;
	// duv2
	var du2 = u2 - u0;
	var dv2 = v2 - v0;

	var r = 1.0 / (du1 * dv2 - dv1 * du2);
	var tx = (dx1 * dv2 - dx2 * dv1) * r,
	    ty = (dy1 * dv2 - dy2 * dv1) * r,
	    tz = (dz1 * dv2 - dz2 * dv1) * r;
	var bx = (dx2 * du1 - dx1 * du2) * r,
	    by = (dy2 * du1 - dy1 * du2) * r,
	    bz = (dz2 * du1 - dz1 * du2) * r;

	this.add(i0, tx, ty, tz, bx, by, bz);
	this.add(i1, tx, ty, tz, bx, by, bz);
	this.add(i2, tx, ty, tz, bx, by, bz);
    },

    add: function(i, tx, ty, tz, bx, by, bz) {
	var tangents = this.tangents;
	var bitangents = this.bitangents;
	var bi = i * 4;
	tangents[bi] += tx;
	tangents[bi + 1] += ty;
	tangents[bi + 2] += tz;
	bi = i * 3;
	bitangents[bi] += bx;
	bitangents[bi + 1] += by;
	bitangents[bi + 2] += bz;
    },

    normalize: function(i) {
	var normals = this.normals;
	var tangents = this.tangents;
	var bitangents = this.bitangents;

	// n
	var bi = i * 3;
	var nx = normals[bi];
	var ny = normals[bi + 1];
	var nz = normals[bi + 2];
	// b
	var bx = bitangents[bi];
	var by = bitangents[bi + 1];
	var bz = bitangents[bi + 2];

	// debug: not necessary to normalize bitangent
	// b' = normalize(b')
if (false) {
	var mag = Math.sqrt(bx * bx + by * by + bz * bz);
	bx /= mag;
	by /= mag;
	bz /= mag;
	bitangents[bi] = bx;
	bitangents[bi + 1] = by;
	bitangents[bi + 2] = bz;
}

	// t
	bi = i * 4;
	var tx = tangents[bi];
	var ty = tangents[bi + 1];
	var tz = tangents[bi + 2];

	// Gram-Schmidt orthogonalize

	var t2 = (tx * tx + ty * ty + tz * tz);

	// t' = t - n * dot(n, t)
	var dot = nx * tx + ny * ty + nz * tz;
	tx -= nx * dot;
	ty -= ny * dot;
	tz -= nz * dot;

	// t' = normalize(t')
	var mag = Math.sqrt(tx * tx + ty * ty + tz * tz);
	tx /= mag;
	ty /= mag;
	tz /= mag;
	tangents[bi] = tx;
	tangents[bi + 1] = ty;
	tangents[bi + 2] = tz;

	// Calculate handedness
	// m = (dot(cross(n, t), b) < 0) ? -1 : 1
	var cx = ny * tz - nz * ty;
	var cy = nz * tx - nx * tz;
	var cz = nx * ty - ny * tx;
	dot = cx * bx + cy * by + cz * bz;
	tangents[bi + 3] = dot < 0.0 ? -1.0 : 1.0;
    }
};

/**
 * Compute the triangle indices array for a set of indexed polygons.
 */
utils.TriangleIndices = {
    /**
     * Triangulate the polygon mesh.
     *
     * state = {
     *   wireframe: true|false,       // input (optional)
     *   coords: [x,y,z, ...],        // input
     *   polys: [[a,b,c,d], ...],     // input
     *   indices: [],                 // output
     *   uv_polys: [[a,b,c,d], ...],  // input (optional)
     *   uv_indices: [],              // output (optional)
     * }
     */
    compute: function(state) {
	var polys = state.polys;
	var n = polys.length;
	if (!state.indices) {
	    state.indices = [];
	}
	var uv_polys = state.uv_polys;
	var m = 0;
	if (uv_polys) {
	    m = uv_polys.length;
	    utils.assert && utils.assert(
		n == m,
		"uv_polys length is " + m + ", but expected " + n
	    );
	    if (!state.uv_indices) {
		state.uv_indices = [];
	    }
	}
	for (var i = 0; i < n; ++i) {
	    this.polyOutput(state, polys[i], (i < m ? uv_polys[i] : null));
	}
	return state;
    },

    polyOutput: function(state, poly, uv_poly) {
	if (state.wireframe) {
	    this.polyToWireframe(state, poly, uv_poly);
	} else {
	    this.polyToTris(state, poly, uv_poly);
	}
    },

    polyToWireframe: function(state, poly, uv_poly) {
	var l = poly.length;
	var n = 0;

	utils.assert && utils.assert(
	    l == 3 || l == 4,
	    "unsupported polygon size: " + l
	);
	uv_poly && utils.assert && utils.assert(
	    l == uv_poly.length,
	    "uv polygon size is " + uv_poly.length + ", but expected " + l
	);

	if (l == 4) {
	    // quad
	    state.indices.push(
		poly[0], poly[1],
		poly[1], poly[2],
		poly[2], poly[3],
		poly[3], poly[0]
	    );
	    if (uv_poly) {
		state.uv_indices.push(
		    uv_poly[0], uv_poly[1],
		    uv_poly[1], uv_poly[2],
		    uv_poly[2], uv_poly[3],
		    uv_poly[3], uv_poly[0]
		);
	    }
	    n = 8;
	} else if (l == 3) {
	    // triangle
	    state.indices.push(
		poly[0], poly[1],
		poly[1], poly[2],
		poly[2], poly[0]
	    );
	    state.uv_indices.push(
		uv_poly[0], uv_poly[1],
		uv_poly[1], uv_poly[2],
		uv_poly[2], uv_poly[0]
	    );
	    n = 3;
	}
	return n;
    },

    polyToTris: function(state, poly, uv_poly) {
	var l = poly.length;
	var n = 0;

	utils.assert && utils.assert(
	    l == 3 || l == 4,
	    "unsupported polygon size: " + l
	);
	uv_poly && utils.assert && utils.assert(
	    l == uv_poly.length,
	    "uv polygon size is " + uv_poly.length + ", but expected " + l
	);

	if (l == 4) {
	    // split quad into tris along the shortest diagonal
	    var a = poly[0],
		b = poly[1],
		c = poly[2],
		d = poly[3];
	    var d1 = this.sqDistance(state.coords, a, c);
	    var d2 = this.sqDistance(state.coords, b, d);
	    if (d1 <= d2) {
		state.indices.push(
		    a, b, c,
		    c, d, a
		);
		if (uv_poly) {
		    state.uv_indices.push(
			uv_poly[0], uv_poly[1], uv_poly[2],
			uv_poly[2], uv_poly[3], uv_poly[0]
		    );
		}
	    } else {
		state.indices.push(
		    b, c, d,
		    d, a, b
		);
		if (uv_poly) {
		    state.uv_indices.push(
			uv_poly[1], uv_poly[2], uv_poly[3],
			uv_poly[3], uv_poly[0], uv_poly[1]
		    );
		}
	    }
	    n = 6;
	} else if (l == 3) {
	    utils.append(state.indices, poly);
	    if (uv_poly) {
		utils.append(state.uv_indices, uv_poly);
	    }
	    n = 3;
	}
	return n;
    },

    sqDistance: function(coords, a, b) {
	a *= 3;
	b *= 3;
	var dx = coords[a++] - coords[b++];
	var dy = coords[a++] - coords[b++];
	var dz = coords[a++] - coords[b++];
	return dx * dx + dy * dy + dz * dz;
    }
};

utils.Mesh = utils.extend(utils.Object, {
    init: function(gl, config) {
	this.config = config;
	this.mvMatrix = mat4.create();
	this.nMatrix = mat4.create();

	if (!config.coords) {
	    config.coords = utils.arrayUnpack3f(config.vertices);
	}
	if (!config.indices) {
	    utils.TriangleIndices.compute(config);
	}
	if (!config.normals) {
	    utils.Normals.compute(config);
	}

	this.aCoord = utils.ArrayBuffer3f.create(
	    gl, config.name + ".coords", config.coords
	);
	this.aNormal = utils.ArrayBuffer3f.create(
	    gl, config.name + ".normals", config.normals
	);
	this.indices = utils.ElementBuffer.create(
	    gl, config.name + ".normals", config.indices
	);
	this.indices.mode = config.wireframe ? gl.LINES : gl.TRIANGLES;
    },

    mMatrixUpdate: function(mMatrix) {
	if (this.mMatrix) {
	    if (!this.mMatrixBase) {
		this.mMatrixBase = this.mMatrix;
		this.mMatrix = mat4.clone(this.mMatrixBase);
	    }
	    mat4.multiply(this.mMatrix, this.mMatrixBase, mMatrix);
	}
    },

    normalMatrix: function(program) {
	var mvMatrix = this.mvMatrix;
	var nMatrix = this.nMatrix;

	mat4.multiply(mvMatrix, program.uniforms.vMatrix.value, this.mMatrix);
	mat4.invert(nMatrix, mvMatrix);
	mat4.transpose(nMatrix, nMatrix);

	program.uniforms.nMatrix.set(nMatrix);
    },

    draw: function(gl, program) {
	if (program.uniforms.mMatrix && this.mMatrix) {
	    program.uniforms.mMatrix.set(this.mMatrix);
	    if (program.uniforms.nMatrix) {
		this.normalMatrix(program);
	    }
	}
	if (program.uniforms.uColor && this.config.color) {
	    program.uniforms.uColor.set(this.config.color);
	}
	program.attributes.aCoord.set(this.aCoord);
	if (program.attributes.aNormal) {
	    program.attributes.aNormal.set(this.aNormal);
	}
	program.update(gl);
	this.indices.draw(gl);
    }
});
