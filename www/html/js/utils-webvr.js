/**
 * @file utility classes functions for WebVR
 */

utils.WebVR = utils.extend(utils.App, {
    VR_ENABLE: false,

    init: function() {
	this.initCanvas();
	this.initAssets();
	this.loader.load();
    },

    initAssets: function() {
	/*EMPTY*/
    },

    readyAssets: function() {
	/*EMPTY*/
    },

    ready: function() {
	this.readyAssets();
	this.loader.cleanup();
        this.start();
        if (this.VR_ENABLE) {
            this.vrDetect();
        }
    },

    start: function() {
	utils.App.ready.call(this);
    },

    vrDetect: function() {
	utils.debug && console.log("vrDetect");
	if (navigator.getVRDisplays) {
	    navigator.getVRDisplays().then(
		this.vrDisplayInit.bind(this),
		this.vrError.bind(this)
	    );
	} else {
	    alert("WebVR is not supported in this browser.");
	}
    },

    vrDisplayInit: function(displays) {
	var n = displays.length;
	if (utils.debug) {
	    console.log("vrDisplayInit", displays);
	    for (var i = 0; i < n; ++i) {
		var display = displays[i];
		console.log("display", i, display);
	    }
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
            this.vrButtonInit();
	} else {
	    alert("No VR displays detected.");
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
        var vrDisplay = this.vrDisplay;
        if (vrDisplay.isPresenting) {
            this.renderCancel();

            var leftEye = vrDisplay.getEyeParameters("left");
	    var rightEye = vrDisplay.getEyeParameters("right");
	    var canvas = this.canvas;
	    canvas.width = Math.max(leftEye.renderWidth, rightEye.renderWidth) * 2;
	    canvas.height = Math.max(leftEye.renderHeight, rightEye.renderHeight);

            this.vrRunning = true;
	    this.frameData = new VRFrameData();
	    this.vrFrameHandler = this.vrFrame.bind(this);
	    this.vrRequestId = this.vrDisplay.requestAnimationFrame(this.vrFrameHandler);
        } else {
            if (this.vrRequestId != null) {
                this.vrDisplay.cancelAnimationFrame(this.vrRequestId);
                this.vrRequestId = null;
            }
            this.vrRunning = false;
            this.resize();
            this.renderRequest();
        }
    },

    vrButtonInit: function() {
        this.vrButton = document.createElement('div');
        this.vrButton.title = "Click to toggle VR mode.";
        utils.styleSet(this.vrButton, {
            position: 'fixed',
            top: '10px',
            right: '10px',
            cursor: 'pointer'
        });
        var icon = document.createElement('img');
        icon.src = "icons/cardboard.svg";
        utils.styleSet(icon, {
            width: '32px',
            height: '32px',
            background: 'white'
        });
        this.vrButton.appendChild(icon);
        document.body.appendChild(this.vrButton);
        utils.on(this.vrButton, 'click', this.vrToggle, this);
    },
    vrToggle: function() {
        if (this.vrRunning) {
            console.log("vrExit");
            this.vrExit();
        } else if (this.vrDisplay) {
            console.log("vrStart");
            this.vrStart();
        } else {
	    alert("WebVR is not supported in this browser.");
        }
    },

    vrStart: function() {
	utils.debug && console.log("vrStart");
        this.renderCancel();
	this.vrDisplay.requestPresent([{ source: this.canvas }]).then(
            function() {
                // wait for vrdisplaypresentchange
            },
	    this.vrError.bind(this)
	);
    },

    vrExit: function() {
        var vrDisplay = this.vrDisplay;
        if (vrDisplay) {
            if (vrDisplay.isPresenting) {
                this.vrDisplay.exitPresent(
                    function() {
                        // wait for vrdisplaypresentchange
                    },
                    this.vrError.bind(this)
                );
            }
        }
    },

    vrFrame: function(timestamp) {
	var vrDisplay = this.vrDisplay;
	var frameData = this.frameData;

	this.vrRequestId = vrDisplay.requestAnimationFrame(this.vrFrameHandler);
	vrDisplay.getFrameData(frameData);
	this.vrRender(timestamp, frameData);
	vrDisplay.submitFrame();

	utils.debug = 0;
    },

    vrRender: function(timestamp, frameData) {
	var gl = this.gl;
	var canvas = this.canvas;
	var w = canvas.width * 0.5;
	var h = canvas.height;

        // shared pre stereo draw
        this.timestamp = timestamp;
        this.vrDrawPre(frameData);

	// draw left eye view
	gl.viewport(0, 0, w,  h);
	this.vrDraw(frameData.leftProjectionMatrix, frameData.leftViewMatrix);

	// draw right eye view
	gl.viewport(w, 0, w, h);
	this.vrDraw(frameData.rightProjectionMatrix, frameData.rightViewMatrix);

        // shared post stereo draw
        this.vrDrawPost(frameData);
    },

    vrDrawPre: function(frameData) {
	var gl = this.gl;
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.enable(gl.DEPTH_TEST);
	gl.depthMask(true);
	gl.depthFunc(gl.LESS);
    },

    vrDrawPost: function(frameData) {
        /*EMPTY*/
    }
});
