utils.debug = 3;

utils.WorkerQueue = {
    /// enable/disable pose reset in the worker
    POSE_RESET: true,

    init: function(config) {
	this.config = config;
	this.workers = [];
	this.idle = [];
	this.states = [];
	this.i = 0;
	this.figure = null;
	this.poses = [];
	this.zeroKeys = {};
	this.framesIn = 0;
	this.framesOut = 0;
	this.frames = [];
	this.framesGood = 0;
	this.framesMissed = 0;
	this.frameTs = 0;	// timestamp for the next animation frame
	this.frameInterval = 0;	// time interval in msec between frames
	this.elapsed = utils.EMA.create(utils.EMA.alphaN(100));
	this.run = false;
	this.ts = null;
	var onmessage = this.messageHandler.bind(this);
	for (var i = 0, n = config.numWorkers || 1; i < n; ++i) {
	    var worker = new Worker(config.script);
	    worker.onmessage = onmessage;
	    this.workers.push(worker);
	    this.idle.push(i);
	}
    },

    messageHandler: function(event) {
	var data = event.data;
	var tag = data.tag;
	var state = data.state;
	utils.debug && console.log("messageHandler", tag);
	if (tag && state) {
	    var frame = tag.frame;
	    if (frame != undefined) {
		if (tag.start) {
		    this.elapsed.update(self.performance.now() - tag.start);
		}
		this.animateReady(frame, state);
		this.idle.push(tag.id);
		if (this.run) {
		    this.animateQueue();
		}
	    } else {
		var transferList = [];
		this.figure.transfer(state, transferList);
		this.states.push([state, transferList]);
	    }
	}
    },

    /**
     * Add a pose to the stack.
     */
    posePush: function(pose) {
	var poses = this.poses;
	for (var i = 0, n = poses.length; i < n; ++i) {
	    if (poses[i] === pose) {
		/* already added */
		return false;
	    }
	}
	pose.reset();
	poses.push(pose);
	if (pose.nkeys > 1) {
	    this.animated = true;
	}
	var zeroKeys = this.zeroKeys;
	var anim = pose.nkeys > 1 ? pose.config.states : pose.config.anim;
	for (var ctrl in anim) {
	    if (zeroKeys[ctrl] == undefined) {
		var zeroKey = 0.0;
		if (ctrl.indexOf('/scale/') >= 1) {
		    /* zeroKey for scale parameters is one */
		    zeroKey = 1.0;
		}
		zeroKeys[ctrl] = zeroKey;
	    }
	}
	return true;
    },

    /**
     * Remove a pose from the stack.
     */
    poseRemove: function(pose) {
	if (!utils.arrayRemove(this.poses, pose)) {
	    /* not found */
	    return;
	}
	this.animated = false;
	for (var i = 0, n = this.poses.length; i < n; ++i) {
	    if (this.poses[i].nkeys > 1) {
		this.animated = true;
	    }
	}
    },

    /**
     * Blend all of the poses in the stack.
     */
    poseNext: function() {
	var stack = [];
        if (!this.POSE_RESET) {
            var zeroKeys = this.zeroKeys;
            if (zeroKeys) {
                stack.push(zeroKeys);
            }
        }
	var poses = this.poses;
	for (var i = 0, n = poses.length; i < n; ++i) {
	    var pose = poses[i];
	    var ctrls = pose.nkeys == 1 ? pose.ctrls0 : pose.next();
            stack.push(ctrls);
	}
	return stack;
    },

    animateStart: function(options) {
	console.log("animateStart");
	this.fps = options && options.fps || 24;
	this.frameInterval = 1000.0 / this.fps;
	this.run = true;
	this.animateQueue();
    },

    animateStop: function() {
	console.log("animateStop");
	this.run = false;
	this.ts = null;
	this.framesGood = 0;
	this.framesMissed = 0;
	this.elapsed.reset();
    },

    animateQueue: function() {
	while (this.idle.length > 0 &&
	       this.frames.length < Math.max(this.workers.length, 3)) {
	    if (this.animatePost()) {
		if (!this.animated) {
		    this.run = false;
		    break;
		}
	    } else {
		break;
	    }
	}
    },

    animatePost: function() {
	if (this.idle.length == 0) {
	    /* no idle workers available */
	    return false;
	}

	var id = this.idle.shift();
	var tag = {
	    id: id,
	    frame: this.framesOut++,
	    start: self.performance.now()
	};
	utils.debug && console.log("animatePost", tag);

	var msg = {
	    tag: tag,
            reset: this.POSE_RESET,
	    controls: this.poseNext()
	};
	if (this.states.length > 0) {
	    /* transfer a cached state to the worker */
	    var rec = this.states.pop();
	    msg.state = rec[0];
	    this.workers[id].postMessage(msg, rec[1]);
	} else {
	    this.workers[id].postMessage(msg);
	}
	return true;
    },

    animateReady: function(idx, state) {
	if (idx < this.framesIn) {
	    /* discard out-of-order animation frames */
	    return;
	}

	var frames = this.frames;
	var n = frames.length;
	if (n == 0 || frames[n - 1][0] < idx) {
	    frames.push([idx, state]);
	}
	for (var i = 0; i < n; ++i) {
	    var rec = frames[i];
	    if (idx < rec[0]) {
		frames.splice(i, 0, [idx, state]);
		break;
	    }
	}
    },

    animateShow: function() {
	if (!this.run) {
	    /* no animations running */
	    //return;
	}
	if (this.frames.length == 0) {
	    /* no animation frames are ready yet */
	    if (this.run) {
		++this.framesMissed;
		this.animateQueue();
	    }
	    return;
	}
	var now = self.performance.now();
	var ts = this.frameTs;
	if (ts == 0) {
	    this.frameTs = ts = now;
	} else if (now < ts) {
	    /* wait */
	    return;
	}
	this.animateOutput();

	ts += this.frameInterval;
	if (ts < now) {
	    ++this.framesMissed;
	    ts = now + this.frameInterval;
	}
	this.frameTs = ts;
    },

    animateOutput: function() {
	var frames = this.frames;
	var n = frames.length;
	if (n > 0) {
	    var rec = frames[0];
	    var framesIn = this.framesIn;
	    if (rec[0] == framesIn) {
		this.framesIn = framesIn + 1;
		frames.shift();
		var transferList = [];
		this.figure.transfer(rec[1], transferList);
		this.states.push([rec[1], transferList]);
	    }
	    ++this.framesGood;
	} else {
	    ++this.framesMissed;
	}

	if (this.run) {
	    this.animateQueue();
	} else {
	    if (frames.length == 0) {
		//this.ts = null;
		return;
	    }
	}

	var now = self.performance.now();
	var ts = this.ts;
	if (ts == null) {
	    this.ts = now;
	    this.start = now;
	    return;
	}
	var elapsed = now - ts;
	if (elapsed >= 2000) {
	    var fps = 1000 * this.framesGood / (now - this.start);
	    false && console.log(
		"frame stats: queue=" + n,
		" good=" + this.framesGood,
		" missed=" + this.framesMissed,
		" fps=" + fps.toFixed(1),
		" worker=" + this.elapsed.ema.toFixed(2)
	    );
	    this.ts = now;
	    if (this.overlay) {
		this.overlay.show({
		    "fps": fps.toFixed(1),
		    "frames": this.framesGood.toFixed(0),
		    "missed": this.framesMissed.toFixed(0),
		    "render": App.renderTime.ema.toFixed(2) + " ms",
		    "worker": this.elapsed.ema.toFixed(2) + " ms \u00d7" +  this.workers.length
		});
	    }
	}
    },

    postMessage: function(msg) {
	var i = this.i++;
	var n = this.workers.length;
	if (i >= n) {
	    i = this.i = 0;
	}
	var tag = msg.tag;
	if (!tag) {
	    tag = msg.tag = {};
	}
	tag.id = i;
	this.workers[i].postMessage(msg);
    },

    broadcastMessage: function(msg) {
	var tag = msg.tag;
	if (!tag) {
	    tag = msg.tag = {};
	}
	tag.broadcast = true;
	for (var i = 0, n = this.workers.length; i < n; ++i) {
	    tag.id = i;
	    this.workers[i].postMessage(msg);
	    tag.noreply = true; // only need reply from the first msg
	}
    }
};

var App = utils.extend(utils.WebVR, {
    VR_ENABLE: true,
    WORKER_ENABLE: true,

    initAssets: function() {
	var gl = this.gl;

	var assets = {
	    shaderSkyBox: utils.AssetShader.create({
		gl: gl,
		name: "shaderSkyBox",
		vertexShaderURL: "shaders/cube-map.vert",
		fragmentShaderURL: "shaders/cube-map.frag",
		uniforms: {
		    mMatrix: utils.UniformMat4.create(),
		    vMatrix: utils.UniformMat4.create(),
		    pMatrix: utils.UniformMat4.create()
		},
		attributes: {
		    aCoord: utils.AttributeBuffer.create()
		}
	    }),
	    skyBox: utils.AssetTextureCubeMap.create(Assets.skybox),
	    shaderSurface: utils.AssetShader.create({
		gl: gl,
		name: "shaderSurface",
		vertexShaderURL: "shaders/surface.vert",
		fragmentShaderURL: "shaders/surface.frag",
		uniforms: {
		    mMatrix: utils.UniformMat4.create(),
		    vMatrix: utils.UniformMat4.create(),
		    pMatrix: utils.UniformMat4.create(),
		    nMatrix: utils.UniformMat4.create(),
		    uColor: utils.Uniform3f.create(),
		    uLightColor: utils.Uniform3f.create(),
		    uLightDirection: utils.Uniform3f.create(),
		    uAmbientColor: utils.Uniform3f.create(),
		    uSpecularColor: utils.Uniform3f.create(),
		    uShininess: utils.Uniform1f.create(),
		    uHasDiffuseTexture: utils.Uniform1i.create(),
		    uDiffuseTexture: utils.Uniform1i.create(),
		    uHasNormalTexture: utils.Uniform1i.create(),
		    uNormalTexture: utils.Uniform1i.create(),
		    uHasBumpTexture: utils.Uniform1i.create(),
		    uBumpTexture: utils.Uniform1i.create(),
		    uBumpTextureSize: utils.Uniform1i.create(),
		    uBumpStrength: utils.Uniform1f.create(),
		    uHasSpecularTexture: utils.Uniform1i.create(),
		    uSpecularTexture: utils.Uniform1i.create(),
		    uHasCutoutTexture: utils.Uniform1i.create(),
		    uCutoutTexture: utils.Uniform1i.create(),
		    uCutoutThreshold: utils.Uniform1f.create(),
		    uTranslucent: utils.Uniform1i.create(),
		    uTransparencyPhase: utils.Uniform1i.create(),
		    uSkin: utils.Uniform1i.create(),
		    uTexScaleMin: utils.Uniform1f.create(),
		    uTexScaleMax: utils.Uniform1f.create()
		},
		attributes: {
		    aCoord: utils.AttributeBuffer.create(),
		    aNormal: utils.AttributeBuffer.create(),
		    aTangent: utils.AttributeBuffer.create(),
		    aTexCoord: utils.AttributeBuffer.create(),
		    aTexScale: utils.AttributeBuffer.create()
		}
	    }),
	    shaderLine: utils.AssetShader.create({
		gl: gl,
		name: "shaderLine",
		vertexShaderURL: "shaders/line.vert",
		fragmentShaderURL: "shaders/line.frag",
		uniforms: {
		    mMatrix: utils.UniformMat4.create(),
		    vMatrix: utils.UniformMat4.create(),
		    pMatrix: utils.UniformMat4.create(),
		    nMatrix: utils.UniformMat4.create(),
		    uColor: utils.Uniform3f.create()
		},
		attributes: {
		    aCoord: utils.AttributeBuffer.create()
		}
	    }),
	    platform: utils.AssetFigure.create({
		url: "lib/models/platform.json"
	    })
	};
	for (var i = 0, n = Assets.poses.length; i < n; ++i) {
	    var pose = Assets.poses[i];
	    if (!pose.enabled) {
		continue;
	    }
	    assets[pose.url] = utils.AssetRequest.create({
		responseType: 'json',
		url: pose.url
	    });
	}
	this.poseReverse = false;

	var model = Assets.model;
	this.preset = model.preset || {};
	assets.figure = utils.AssetFigure.create({
	    url: model.figure,
            remap: model.remap
	});
	if (true && model.scripts) {
	    this.modelScripts = model.scripts;
	    for (var i = 0, n = model.scripts.length; i < n; ++i) {
		var script = model.scripts[i];
		assets[script] = utils.AssetScript.create({
		    src: script
		});
	    }
	}

	if (Assets.hair) {
	    assets.hair = utils.AssetFigure.create(Assets.hair);
	}
        if (Assets.wearables) {
            for (var i = 0, n = Assets.wearables.length; i < n; ++i) {
                var wearable = Assets.wearables[i];
                var url = wearable.url;
	        assets[url] = utils.AssetFigure.create({
	            url: url,
                    remap: wearable.remap
	        });
                var script = wearable.script;
                if (script) {
	            assets[script] = utils.AssetScript.create({
		        src: script
	            });
	            this.modelScripts.push(script);
                }
                if (wearable.preset) {
                    utils.merge(this.preset, wearable.preset);
                }
            }
        }
	this.loader.batch(assets);
    },

    poseTweak: function(pose) {
	var n = pose.length;
	if (n <= 1) {
	    return pose;
	}
	var init = {};
	for (var i = 0; i < n; ++i){
	    var ctrls = pose[i][1];
	    for (var ctrl in ctrls) {
		init[ctrl] = ctrls[ctrl];
	    }
	    for (ctrl in init) {
		if (ctrls[ctrl] == undefined) {
		    //console.log("pose missing", i, ctrl, init[ctrl]);
		    ctrls[ctrl] = init[ctrl];
		}
	    }
	}
	return pose;
    },

    readyAssets: function() {
	this.renderTime = utils.EMA.create(utils.EMA.alphaN(100));

	var library = {};
	if (this.loader.cache.figure) {
	    this.figure = this.loader.cache.figure.get(library);
            this.figure.preset = this.preset;
	}
        var wearables = [];
        if (Assets.wearables) {
            for (var i = 0, n = Assets.wearables.length; i < n; ++i) {
                var url = Assets.wearables[i].url;
                if (this.loader.cache[url]) {
                    var asset = this.loader.cache[url].get(library);
                    wearables.push(asset);
                }
            }
        }
	this.poseIdx = 0;
	this.poses = [];
        if (false) {
            var anims = [];
            var first = null;
            for (var i = 0, n = Assets.poses.length; i < n; ++i) {
	        var pose = Assets.poses[i];
	        if (!pose.enabled) {
	            continue;
	        }
                var anim = this.loader.cache[pose.url].responseJSON();
                anims.push(anim);
                if (!first) {
                    first = pose;
                }
            }
            this.poses = [
                [first, utils.AnimationMapSampler.sequence(anims)]
            ];
        } else {
            for (var i = 0, n = Assets.poses.length; i < n; ++i) {
	        var pose = Assets.poses[i];
	        if (!pose.enabled) {
	            continue;
	        }
	        this.poses.push(
                    [pose, this.loader.cache[pose.url].responseJSON()]
                );
            }
        }
	for (var i = 0, n = this.poses.length; i < n; ++i) {
	    var rec = this.poses[i];
            var pose = rec[0];
	    var anim = rec[1];
	    utils.assert && utils.assert(
		!Array.isArray(anim),
		"anim " + pose.url + " is an array"
	    );
	    if (this.figure.figure.id == 'Genesis8Female') {
                // TBD: need to know what pose adjustments to apply
		utils.AnimationMapSampler.patch(anim, 'lShldrBend/rotation/z', 45);
		utils.AnimationMapSampler.patch(anim, 'rShldrBend/rotation/z', -45);
		utils.AnimationMapSampler.patch(anim, 'lThighBend/rotation/z', -6);
		utils.AnimationMapSampler.patch(anim, 'rThighBend/rotation/z', 6);
	    }
	    var patch = pose.patch;
	    if (patch) {
		for (var ctrl in patch) {
		    utils.AnimationMapSampler.patch(anim, ctrl, patch[ctrl]);
		}
	    }
	    this.poses[i] = utils.AnimationSampler.create({
		name: pose.url,
		anim: anim,
		//fps: 90
		//fps: 30
		fps: 45
	    });
	}

	var gl = this.gl;

	this.shaderSkyBox = this.loader.cache.shaderSkyBox.program;
	this.shaderSkyBox.uniforms.vMatrix.set(mat4.create());

	this.skyBox = utils.SkyBox.create(gl);
	this.skyBox.mMatrix = mat4.create();
	mat4.rotateY(this.skyBox.mMatrix, this.skyBox.mMatrix, utils.radians(180));
	this.skyBox.vMatrix = mat4.create();
	this.skyBox.texture = utils.TextureSkyMap.extend(
	    { flipY: true },
	    gl, "skyBox", this.loader.cache.skyBox.textures
	);

	var lightDirection = vec3.fromValues(0.85, 0.8,0.75);
	vec3.normalize(lightDirection, lightDirection);
	this.lightDirection = lightDirection;
	this.uLightDirection = vec3.clone(lightDirection);
	this.ivMatrix = mat3.create();

	this.shaderSurface = this.loader.cache.shaderSurface.program;
	//this.shaderSurface.uniforms.uLightColor.set([0.5, 0.5, 0.5]);
	var brightness = 0.6;
	this.shaderSurface.uniforms.uLightColor.set([brightness*255/255, brightness*147/255, brightness*41/255]);
	//this.shaderSurface.uniforms.uLightColor.set([1.0, 1.0, 1.0]);
	this.shaderSurface.uniforms.uLightDirection.set(this.uLightDirection);
	this.shaderSurface.uniforms.uAmbientColor.set([0.4, 0.4, 0.4]);
	this.shaderSurface.uniforms.uSpecularColor.set([0.35, 0.45, 0.5]);
	this.shaderSurface.uniforms.uShininess.set(3.0);
	this.shaderSurface.uniforms.uHasDiffuseTexture.set(false);
	this.shaderSurface.uniforms.uDiffuseTexture.set(0);
	this.shaderSurface.uniforms.uHasNormalTexture.set(false);
	this.shaderSurface.uniforms.uNormalTexture.set(1);
	this.shaderSurface.uniforms.uHasBumpTexture.set(false);
	this.shaderSurface.uniforms.uBumpTexture.set(2);
	this.shaderSurface.uniforms.uBumpStrength.set(1.0);
	this.shaderSurface.uniforms.uHasSpecularTexture.set(false);
	this.shaderSurface.uniforms.uSpecularTexture.set(3);
	this.shaderSurface.uniforms.uHasCutoutTexture.set(false);
	this.shaderSurface.uniforms.uCutoutTexture.set(4);
	this.shaderSurface.uniforms.uCutoutThreshold.set(0.8);
	this.shaderSurface.uniforms.uTransparencyPhase.set(false);

        for (var i = 0, n = wearables.length; i < n; ++i) {
            var wearable = wearables[i];
            // TBD: need per-model uniforms
            switch (wearable.figure.id) {
            case 'aprilyshVossHairG8F_80330':
	        this.shaderSurface.uniforms.uCutoutThreshold.set(0.55);
                break;
            case 'GwenniliHairA_49547':
	        this.shaderSurface.uniforms.uCutoutThreshold.set(0.65);
                break;
            }
	}

	this.shaderLine = this.loader.cache.shaderLine.program;

	var wireframe = utils.Surface.debug;
	if (this.WORKER_ENABLE && window.Worker) {
	    utils.WorkerQueue.init({
		numWorkers: 3,
		script: "js/figure-worker.js"
	    });
	    this.worker = utils.WorkerQueue;
	    this.worker.overlay = utils.Overlay.create();
	    this.worker.broadcastMessage({
		scripts: this.modelScripts,
		models: {
		    wireframe: wireframe,
		    figure: this.figure,
		    items: wearables
		}
	    });
	}	
	utils.listeners(document, {
	    keypress: this.keyPressEvent,
	    scope: this
 	});

	this.platform = utils.Surface.create(gl, this.loader.cache.platform.get(library), library);
	this.platform.mMatrix = mat4.create();

	this.models = [];
	if (this.figure) {
	    this.figure = utils.Surface.create(
		gl,
		this.figure,
		library,
		wireframe
	    );
            if (false) {
                // test octree and cindex
                var octree = utils.Octree.create(this.figure.coords);
                false && octree.load(this.figure.coords);
                octree.validate();
                var cindex = utils.CoordIndex.create(this.figure.coords);
                false && cindex.load(this.figure.coords);
                cindex.validate();
            }
	    this.controls = this.figure.controls;
            for (var i = 0, n = wearables.length; i < n; ++i) {
		var wearable = utils.Surface.create(
		    gl,
		    wearables[i],
		    library,
		    wireframe
		);
                wearables[i] = wearable;
		this.models.push(wearable);
		this.figure.followers.push(wearable);
		false && utils.AutoFit.create(wearable, this.figure, 30);
            }

	    var controls = this.preset; 
            true && this.controls.start(controls);
	    if (this.worker) {
		this.worker.figure = this.figure;
                if (this.worker.POSE_RESET) {
	            this.controls.start(controls);
		    this.figure.transform(this.controls);
                    this.figure.meshUpdate();
                } else {
	            this.worker.broadcastMessage({
		        tag: {
		            msg: "initial controls"
		        },
		        controls: controls
		    });
                }
	    } else {
		true && this.controls.start(controls);
		true && this.pose && this.controls.start(this.pose[0][1]);
		true && this.figure.transform(this.controls);
	    }

	    if (this.worker) {
/*
		this.worker.broadcastMessage({
		    tag: {
			msg: "initial pose"
		    },
		    controls: this.poses[this.poseIdx].ctrls0
		});
*/
		this.worker.posePush(this.poses[this.poseIdx]);
	    }

	    this.visemes = [];
	    for (var ctrl in ModifierLibrary.Genesis3Female) {
		if (ctrl.startsWith("eCTRLv")) {
		    var anim = {};
		    anim[ctrl] = 1.0;
		    this.visemes.push(utils.AnimationSampler.create({
			anim: anim
		    }));
		}
	    }
	    this.models.push(this.figure);
	}

	var bounds = this.models[0].bounds;
	var size = Math.max(
	    bounds.width,
	    bounds.height,
	    bounds.depth
	);
	var center = [
	    (bounds.xmax + bounds.xmin) / 2,
	    (bounds.ymax + bounds.ymin) / 2,
	    (bounds.zmax + bounds.zmin) / 2
	];
	var mMatrix = Assets.mMatrix(this.VR_ENABLE, bounds);
	for (var i = 0, n = this.models.length; i < n; ++i) {
	    this.models[i].mMatrix = mMatrix;
	}

	var vMatrix = mat4.create();
	this.vMatrixUpdate(vMatrix, vMatrix);
	utils.ModelController.init(this, this.figure.boneMap.hip.center_point);

	utils.debug = 0;
    },

    keyPressEvent: function(event){
	switch (event.key) {
	case ' ':
	    /* start/stop animation */
	    this.frameRun = !this.frameRun;
	    if (this.frameRun) {
		this.worker.animateStart({
		    //fps: this.VR_ENABLE ? 12 : 24
		});
	    } else {
		this.worker.animateStop();
	    }
	    break;
	case 'p':
	    if (this.poses.length <= 1) {
		break;
	    }
	    this.frameRun = true;
	    this.worker.animateStop();
	    this.worker.poseRemove(this.poses[this.poseIdx]);
	    if (++this.poseIdx >= this.poses.length) {
		this.poseIdx = 0;
	    }
	    console.log("pose", this.poses[this.poseIdx].config.name);
	    this.worker.posePush(this.poses[this.poseIdx]);
	    this.worker.animateStart({
		//fps: this.VR_ENABLE ? 12 : 24
	    });
	    break;
	case 'v':
	case 'V':
	    /* show/clear random viseme */
	    if (this.visemePrev) {
		this.worker.poseRemove(this.visemePrev);
		this.visemePrev = null;
	    }
	    if (event.key == 'v') {
		var n = this.visemes.length;
		var viseme = this.visemes[Math.floor(Math.random() * n)];
		console.log("viseme", viseme);
		this.worker.posePush(viseme);
		this.visemePrev = viseme;
	    }
	    break;
	}
    },
    frameNext: function() {
	if (this.blendPose) {
	    var mix = this.blendCtrl + this.blendStep * this.blendDir;
	    if (mix < this.blendMin) {
		mix = this.blendMin + this.blendStep;
		this.blendDir = +1;
	    }
	    if (mix > this.blendMax) {
		mix = this.blendMax - this.blendStep;
		this.blendDir = -1;
	    }
	    this.blendCtrl = mix;

	    var blend = {};
	    var pose = this.pose[0][1];
	    for (var id in pose) {
		blend[id] = pose[id] * mix;
	    }
	    pose = this.blendPose[0][1];
	    mix = 1.0 - mix;
	    for (id in pose) {
		var val = blend[id];
		if (val == undefined) {
		    val = 0;
		}
		blend[id] = val + pose[id] * mix;
	    }
	    var start = window.performance.now();
	    this.controls.start(blend);
	    this.figure.transform(this.controls);
	    var elapsed = window.performance.now() - start;
	    utils.debug && console.log("blend", this.blendCtrl, blend, elapsed);
	    return;
	}
	var frameIdx = this.frameIdx;
	var frame = this.pose[frameIdx];
	if (this.poseReverse) {
	    if (this.frameReverse) {
		if (--frameIdx < 0) {
		    frameIdx = 0;
		    this.frameReverse = false;
		}
	    } else {
		if (++frameIdx >= this.pose.length) {
		    this.frameReverse = true;
		    frameIdx = this.pose.length - 1;
		}
	    }
	} else {
		if (++frameIdx >= this.pose.length) {
		    frameIdx = 0;
		}
	}
	this.frameIdx = frameIdx;
	if (this.worker){
	    this.worker && this.worker.postMessage({
		msg: "frame #" + this.frameIdx,
		controls: frame[1]
	    }); 
	} else {
	    var start = window.performance.now();
	    this.controls.start(frame[1]);
	    this.figure.transform(this.controls);
	    var elapsed = window.performance.now() - start;
	    utils.debug && console.log("frame", this.frameIdx, elapsed);
	}
    },

    resize: function() {
	utils.App.resize.call(this);
	utils.ModelController.pMatrixUpdate();
    },

    pMatrixUpdate: function(pMatrix) {
	console.log("pMatrixUpdate");
        this.shaderSkyBox.uniforms.pMatrix.set(pMatrix);
        this.shaderSurface.uniforms.pMatrix.set(pMatrix);
        this.shaderLine.uniforms.pMatrix.set(pMatrix);
    },
    vMatrixUpdate: function(vMatrix, vMatrixFixed) {
	console.log("vMatrixUpdate");
        this.shaderSkyBox.uniforms.vMatrix.set(vMatrixFixed);
        this.shaderSurface.uniforms.vMatrix.set(vMatrix);
        this.shaderLine.uniforms.vMatrix.set(vMatrix);
    },
    mMatrixUpdate: function(mMatrix) {
	utils.debug && console.log("mMatrixUpdate");
	for (var i = 0, n = this.models.length; i < n; ++i) {
	    this.models[i].mMatrixUpdate(mMatrix);
	}
    },

    renderPasses: [
	{ name: "opaque", transparency: false },
	{ name: "transparency", transparency: true }
    ],

    renderDebugPass: { name: "debug", debug: true },

    render: function() {
        var now = self.performance.now();
	if (this.worker) {
	    this.worker.animateShow();
	}

	var gl = this.gl;
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.enable(gl.CULL_FACE);

if (true) {
	this.shaderSkyBox.useProgram(gl);
	this.skyBox.draw(gl, this.shaderSkyBox);
}

	var m = this.models.length;

if (true) {
	this.shaderLine.useProgram(gl);
	gl.enable(gl.DEPTH_TEST);
	gl.depthMask(true);

	for (var j = 0; j < m; ++j) {
	    this.models[j].draw(gl, this.shaderLine, this.renderDebugPass);
	}
}

if (true) {
	this.shaderSurface.useProgram(gl);

	// TBD: make back face culling material dependent
	//gl.enable(gl.CULL_FACE);
	// some of the hair backfaces need to be displayed
	//gl.disable(gl.CULL_FACE);

	for (var i = 0, n = this.renderPasses.length; i < n; ++i) {
	    var renderPass = this.renderPasses[i];
	    if (renderPass.transparency) {
		this.shaderSurface.uniforms.uTransparencyPhase.set(true);
		gl.depthMask(false);
		gl.enable(gl.BLEND);
		// pre-multiplied alpha
		gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
	    } else {
		this.shaderSurface.uniforms.uTransparencyPhase.set(false);
		gl.enable(gl.DEPTH_TEST);
		gl.depthMask(true);
		gl.depthFunc(gl.LESS);
		gl.disable(gl.BLEND);
	    }
	    for (var j = 0; j < m; ++j) {
		this.models[j].draw(gl, this.shaderSurface, renderPass);
	    }
	}
}

	utils.debug = 0;
        this.renderRequest();
	this.renderTime.update(self.performance.now() - now);
    },

    vrRender: function(timestamp, frameData) {
	var now = timestamp;
	if (this.worker) {
	    this.worker.animateShow();
	}

	var gl = this.gl;
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.enable(gl.CULL_FACE);

	var canvas = this.canvas;
	var w = canvas.width * 0.5;
	var h = canvas.height;

	this.shaderSkyBox.useProgram(gl);

	gl.viewport(0, 0, w,  h);
	this.vrDrawSkyBox(frameData.leftProjectionMatrix,
			  frameData.leftViewMatrix);

	gl.viewport(w, 0, w, h);
	this.vrDrawSkyBox(frameData.rightProjectionMatrix,
			  frameData.rightViewMatrix);

	this.shaderSurface.useProgram(gl);

	// TBD: make back face culling material dependent
	//gl.enable(gl.CULL_FACE);
	// some of the hair backfaces need to be displayed
	//gl.disable(gl.CULL_FACE);

	gl.viewport(0, 0, w,  h);
	this.vrDraw(frameData.leftProjectionMatrix,
		    frameData.leftViewMatrix);

	gl.viewport(w, 0, w, h);
	this.vrDraw(frameData.rightProjectionMatrix,
		    frameData.rightViewMatrix);

	this.renderTime.update(self.performance.now() - now);
    },

    vrDrawSkyBox: function(pMatrix, vMatrix) {
	var gl = this.gl;
	var program = this.shaderSkyBox;

	var v = this.skyBox.vMatrix;
	mat4.copy(v, vMatrix);
	v[12] = v[13] = v[14] = 0;
	program.uniforms.pMatrix.set(pMatrix);
	program.uniforms.vMatrix.set(v);

	this.skyBox.draw(gl, program);
    },

    vrDraw: function(pMatrix, vMatrix) {
	var gl = this.gl;
	var program = this.shaderSurface;

	var ivMatrix = this.ivMatrix;
	mat3.fromMat4(ivMatrix, vMatrix);
	mat3.invert(ivMatrix, ivMatrix);
	mat3.transpose(ivMatrix, ivMatrix);
	var uLightDirection = this.uLightDirection;
	vec3.transformMat3(uLightDirection,
			   this.lightDirection,
			   ivMatrix);

	program.uniforms.uLightDirection.set(uLightDirection);
	program.uniforms.pMatrix.set(pMatrix);
	program.uniforms.vMatrix.set(vMatrix);

	for (var i = 0, n = this.renderPasses.length; i < n; ++i) {
	    var renderPass = this.renderPasses[i];
	    if (renderPass.transparency) {
		this.shaderSurface.uniforms.uTransparencyPhase.set(true);
		gl.depthMask(false);
		gl.enable(gl.BLEND);
		// pre-multiplied alpha
		gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
	    } else {
		this.shaderSurface.uniforms.uTransparencyPhase.set(false);
		gl.enable(gl.DEPTH_TEST);
		gl.depthMask(true);
		gl.depthFunc(gl.LESS);
		gl.disable(gl.BLEND);
	    }

	    this.platform.draw(gl, program, renderPass);
	    for (var j = 0, m = this.models.length; j < m; ++j) {
		this.models[j].draw(gl, program, renderPass);
	    }
	}
    }
});
