//utils.debug = 3;
utils.debug = 0;

var App = utils.extend(utils.WebVR, {
    VR_ENABLE: true,
    LIGHT: 0.50,
    TEXTURES_ENABLE: true,
    AMBIENT_ENABLE: true,
    SPECULAR_ENABLE: true,
    TONE_MAP_ENABLE: true,
    BUMP_MAP_ENABLE: true,
    MORPHS_ENABLE: true,
    ANIMATION_SPEED: 1,

    initAssets: function() {
        var gl = this.gl;
        this.context = GL.Context.create(gl);
        this.overlay = utils.Overlay.create();
        this.renderTimer = utils.EMA.create(utils.EMA.alphaN(100));
        this.animateTimer = utils.EMA.create(utils.EMA.alphaN(100));
        this.constraintsTimer = utils.EMA.create(utils.EMA.alphaN(100));
        this.drawTimer = utils.EMA.create(utils.EMA.alphaN(100));
        this.memory = utils.Memory.create({
            initial: 16
        });

        GL.MeshDqs.initAssets(this.loader);
        this.loader.batch({
            meshMorph: utils.AssetWasm.create({
                url: "wasm/mesh-morph.wasm",
                importObject: {
                    js: {
                        mem: this.memory.memory
                    }
                }
            }),
            assets: utils.AssetBatch.create({
                url: "lib/assets/gl-assets.json"
            })
        });
    },

    readyAssets: function() {
        var context = this.context;
        var gl = context.gl;

        GL.MeshDqs.readyAssets(this.loader);

        this.library = {};
        this.textureCache = {};
        this.meshMorph = this.loader.cache.meshMorph.instance;

        var assets = this.loader.cache.assets.get();
        var figure = assets.figure;
        this.figureMesh = GL.MeshDqs.create({
            name: "figure",
            mesh: figure.get(this.library),
            meshUniforms: figure.config.meshUniforms,
            materialUniforms: figure.config.materialUniforms
        });
        this.figureMesh.ENABLE = true;
        this.figureMesh.uColorMode = 1;
        this.meshes = [this.figureMesh];

        var hair = assets.hair;
        if (hair) {
            this.hairMesh = GL.MeshDqs.create({
                name: "hair",
                mesh: hair.get(this.library),
                meshUniforms: hair.config.meshUniforms,
                materialUniforms: hair.config.materialUniforms
            });
            this.hairMesh.ENABLE = true;
            this.hairMesh.parent = this.figureMesh;
            this.meshes.push(this.hairMesh);
        }

        var clothing = [
            'dress',
            'shirt', 'pants'
        ];
        this.clothingMeshes = [];
        for (var i = 0, n = clothing.length; i < n; ++i) {
            var name = clothing[i];
            var asset = assets[name];
            if (!asset) {
                continue;
            }
            var item = GL.MeshDqs.create({
                name: name,
                mesh: asset.get(this.library),
                meshUniforms: asset.config.meshUniforms,
                materialUniforms: asset.config.materialUniforms
            });
            item.ENABLE = true;
            item.parent = this.figureMesh;
            var fit = assets[name + 'Fit'];
            if (fit) {
                item.initFit(fit.responseJSON());
            }
            this.meshes.push(item);
            this.clothingMeshes.push(item);
        }

        /* allocate a Wasm memory block for a mesh coords array */
        var maxVertices = 0;
        for (var i = 0, n = this.meshes.length; i < n; ++i) {
            var mesh = this.meshes[i];
            if (maxVertices < mesh.numVertices) {
                maxVertices = mesh.numVertices;
            }
        }
        this.coordsBlock = this.memory.arrayNew(Float32Array, maxVertices * 3);

        var bounds = this.figureMesh.boundsBase;
        console.log("bounds", bounds);
        this.toOrigin = vec3.fromValues(
            (bounds.xmin + bounds.xmax) / 2,
            (bounds.ymin + bounds.ymax) / 2,
            (bounds.zmin + bounds.zmax) / 2
        );
        this.elevationMax = bounds.ymax - bounds.ymin;
        this.fromOrigin = vec3.fromValues(
            -this.toOrigin[0],
            -this.toOrigin[1],
            -this.toOrigin[2]
        );

        this.blackColor = vec3.fromValues(0.0, 0.0, 0.0);
        this.whiteColor = vec3.fromValues(1.0, 1.0, 1.0);
        this.ambientColor = vec3.fromValues(0.2, 0.2, 0.2);
        this.lightColor = vec3.fromValues(this.LIGHT, this.LIGHT, this.LIGHT);
        this.lightDirection = vec3.fromValues(0.85, 0.8, 0.75);
        vec3.normalize(this.lightDirection, this.lightDirection);

        this.mMatrix = mat4.create();
        var scale = 1.55 / bounds.ymax;
        mat4.scale(this.mMatrix, this.mMatrix, [ scale, scale, scale ]);
        this.mMatrixBase = mat4.clone(this.mMatrix);
        this.figureMesh.mMatrix = this.mMatrix;

        this.vMatrix = mat4.create();
        this.vMatrixVR = mat4.create();
        // full
        mat4.translate(this.vMatrix, this.vMatrix, [0, -0.75, -2.2]);
        // face
        //mat4.translate(this.vMatrix, this.vMatrix, [0, -1.45, -0.3]);

        this.pMatrix = mat4.create();

        this.poses = [];
        var poses = assets.poses;
        for (i = 0, n = poses.length; i < n; ++i) {
            var pose = poses[i];
            this.poses.push(this.posePatch(pose));
        }
        this.poseSelect(this.poses[0]);

        this.frameCounter = 0;
        this.reportFrame = 0;
        this.reportTime = self.performance.now();
        this.uiCreate();

        /* release the library and texture cache (only needed during loading) */
        this.library = null;
        this.textureCache = null;
    },

    posePatch: function(pose) {
        var name = pose.config.name;
        var keyFrames = pose.responseJSON();
        return {
            name: name,
            keyFrames: keyFrames
        };
    },
    poseScale: function(keys, scale) {
        var scaled = [];
        for (var i = 0, n = keys.length; i < n; ++i) {
            var key = keys[i];
            scaled.push([key[0], key[1] * scale]);
        }
        return scaled;
    },

    textureGet: function(image, config) {
        var texture = this.textureCache[image.url];
        if (texture) {
            return texture;
        }
        var asset = this.library.images[image.url];
        if (!asset) {
            return null;
        }
        texture = GL.Texture.create({
            name: image.url
        });
        if (!config) {
            config = {
                flipY: true,
                mipMaps: true
            };
        }
        config.source = asset.image;
        texture.setImage(config);
        this.textureCache[image.url] = texture;
        return texture;
    },

    poseSelect: function(pose) {
        if (this.pose == pose) {
            return;
        }
        this.pose = pose;

        var basePose = {
            CTRLVictoria7: 0.65,
            FHMKaren7: 1.0,
            PBMBreastsSize: 0.25,
            PBMNipples: 0.5,
            PBMNavel: 1.0,
            FBMVoluptuous: 0.30
        };
        for (var i = 0, n = this.meshes.length; i < n; ++i) {
            var mesh = this.meshes[i];
            var animMap = mesh.animMap;
            if (!animMap) {
                animMap = mesh.animMap = {};
            }
            var anim = mesh.animMap[pose.name];
            if (!anim) {
                anim = utils.KeyFrameMapSampler.create(
                    pose.keyFrames, mesh, basePose
                );
                mesh.animMap[pose.name] = anim;
            }
            anim.reset();
            mesh.anim = anim;
        }
    },

    uiCreate: function() {
        this.pitch = 0;
        this.yaw = 0;
        this.scale = 1;
        this.elevation = vec3.create();
	utils.listeners(document, {
	    mousedown: this.mouseDownEvent,
	    mousemove: this.mouseMoveEvent,
	    mouseup: this.mouseUpEvent,
	    mouseover: this.mouseOverEvent,
	    mouseout: this.mouseOutEvent,
	    wheel: this.wheelEvent,
	    scope: this
	});

        this.uiDiv = document.createElement('div');
        utils.styleSet(this.uiDiv, {
            position: 'fixed',
            bottom: '10px',
            left: '10px',
            padding: '2px',
            background: 'white',
            opacity: 0.75
        });

        var elements = [];
        this.uiPoseCreate(elements);
        this.uiTexturesEnableCreate(elements);
        this.uiAmbientEnableCreate(elements);
        this.uiSpecularEnableCreate(elements);
        this.uiToneMapEnableCreate(elements);
        this.uiBumpMapEnableCreate(elements);
        this.uiMorphsEnableCreate(elements);
        this.uiHairEnableCreate(elements);
        if (this.clothingMeshes && this.clothingMeshes.length > 0) {
            this.uiClothesEnableCreate(elements);
            this.uiConstraintsEnableCreate(elements);
        }
        this.uiLightCreate(elements);
        this.uiAnimSpeedCreate(elements);

        var tb = utils.TableBuilder.create();
        tb.sectionAdd('thead');
        tb.rowAdd();
        for (var i = 0, n = elements.length; i < n; ++i) {
            var el = elements[i];
            var th = tb.cellAdd('th');
            if (el.padding) {
                th.style.paddingLeft = el.padding;
                th.style.paddingRight = el.padding;
            }
            var label = el.label;
            if (typeof label == 'string') {
                utils.contentText(th, label);
            } else {
                utils.contentSet(th, label);
            }
        }
        tb.sectionAdd('tbody');
        tb.rowAdd();
        for (var i = 0, n = elements.length; i < n; ++i) {
            var el = elements[i];
            var td = tb.cellAdd('td');
            if (el.align) {
                td.align = el.align;
            }
            td.appendChild(el.ui);
        }
        this.uiDiv.appendChild(tb.table);
        document.body.appendChild(this.uiDiv);
    },

    uiPoseCreate: function(elements) {
        this.uiPoseSelect = document.createElement('select');
        for (var i = 0, n = this.poses.length; i < n; ++i) {
            var pose = this.poses[i];
            var option = document.createElement('option');
            option.value = i.toString();
            option.text = pose.name;
            if (this.pose == pose) {
                option.selected = true;
            }
            this.uiPoseSelect.appendChild(option);
        }
        utils.on(this.uiPoseSelect, 'change', this.uiPoseChange, this);
        elements.push({label: "Pose", ui: this.uiPoseSelect});
    },
    uiPoseChange: function() {
        var idx = parseInt(this.uiPoseSelect.value);
        this.poseSelect(this.poses[idx]);
        this.animResync = true;
    },

    uiTexturesEnableCreate: function(elements) {
        this.uiTexturesEnable = document.createElement('input');
        this.uiTexturesEnable.type = 'checkbox';
        this.uiTexturesEnable.checked = this.TEXTURES_ENABLE;
        utils.on(this.uiTexturesEnable, 'click', this.uiTexturesEnableClick, this);
        elements.push({
                label: "Textures",
                padding: '2px',
                align: 'center',
                ui: this.uiTexturesEnable
        });
    },
    uiTexturesEnableClick: function() {
        this.TEXTURES_ENABLE = this.uiTexturesEnable.checked;
    },

    uiAmbientEnableCreate: function(elements) {
        this.uiAmbientEnable = document.createElement('input');
        this.uiAmbientEnable.type = 'checkbox';
        this.uiAmbientEnable.checked = this.AMBIENT_ENABLE;
        utils.on(this.uiAmbientEnable, 'click', this.uiAmbientEnableClick, this);
        elements.push({
                label: "Ambient",
                padding: '2px',
                align: 'center',
                ui: this.uiAmbientEnable
        });
    },
    uiAmbientEnableClick: function() {
        this.AMBIENT_ENABLE = this.uiAmbientEnable.checked;
    },

    uiSpecularEnableCreate: function(elements) {
        this.uiSpecularEnable = document.createElement('input');
        this.uiSpecularEnable.type = 'checkbox';
        this.uiSpecularEnable.checked = this.SPECULAR_ENABLE;
        utils.on(this.uiSpecularEnable, 'click', this.uiSpecularEnableClick, this);
        elements.push({
                label: "Specular",
                padding: '2px',
                align: 'center',
                ui: this.uiSpecularEnable
        });
    },
    uiSpecularEnableClick: function() {
        this.SPECULAR_ENABLE = this.uiSpecularEnable.checked;
    },

    uiToneMapEnableCreate: function(elements) {
        this.uiToneMapEnable = document.createElement('input');
        this.uiToneMapEnable.type = 'checkbox';
        this.uiToneMapEnable.checked = this.TONE_MAP_ENABLE;
        utils.on(this.uiToneMapEnable, 'click', this.uiToneMapEnableClick, this);
        elements.push({
                label: "ToneMap",
                padding: '2px',
                align: 'center',
                ui: this.uiToneMapEnable
        });
    },
    uiToneMapEnableClick: function() {
        this.TONE_MAP_ENABLE = this.uiToneMapEnable.checked;
    },

    uiBumpMapEnableCreate: function(elements) {
        this.uiBumpMapEnable = document.createElement('input');
        this.uiBumpMapEnable.type = 'checkbox';
        this.uiBumpMapEnable.checked = this.BUMP_MAP_ENABLE;
        utils.on(this.uiBumpMapEnable, 'click', this.uiBumpMapEnableClick, this);
        elements.push({
                label: "BumpMap",
                padding: '2px',
                align: 'center',
                ui: this.uiBumpMapEnable
        });
    },
    uiBumpMapEnableClick: function() {
        this.BUMP_MAP_ENABLE = this.uiBumpMapEnable.checked;
    },

    uiMorphsEnableCreate: function(elements) {
        this.uiMorphsEnable = document.createElement('input');
        this.uiMorphsEnable.type = 'checkbox';
        this.uiMorphsEnable.checked = this.MORPHS_ENABLE;
        utils.on(this.uiMorphsEnable, 'click', this.uiMorphsEnableClick, this);
        elements.push({
                label: "Morphs",
                padding: '2px',
                align: 'center',
                ui: this.uiMorphsEnable
        });
    },
    uiMorphsEnableClick: function() {
        this.MORPHS_ENABLE = this.uiMorphsEnable.checked;
        this.animResync = true;
    },

    uiHairEnableCreate: function(elements) {
        if (!this.hairMesh) {
            return;
        }
        this.uiHairEnable = document.createElement('input');
        this.uiHairEnable.type = 'checkbox';
        this.uiHairEnable.checked = this.hairMesh.ENABLE;
        utils.on(
            this.uiHairEnable, 'click',
            this.uiHairEnableClick, this
        );
        elements.push({
                label: "Hair",
                padding: '2px',
                align: 'center',
                ui: this.uiHairEnable
        });
    },
    uiHairEnableClick: function() {
        this.hairMesh.ENABLE = this.uiHairEnable.checked;
        if (this.hairMesh.ENABLE) {
            this.hairMesh.anim.t = this.figureMesh.anim.t;
            this.animResync = true;
        }
    },

    uiClothesEnableCreate: function(elements) {
        this.uiClothesEnable = document.createElement('input');
        this.uiClothesEnable.type = 'checkbox';
        this.uiClothesEnable.checked = true;
        utils.on(
            this.uiClothesEnable, 'click',
            this.uiClothesEnableClick, this
        );
        elements.push({
                label: "Clothes",
                padding: '2px',
                align: 'center',
                ui: this.uiClothesEnable
        });
    },
    uiClothesEnableClick: function() {
        for (var i = 0, n = this.clothingMeshes.length; i < n; ++i) {
            var mesh = this.clothingMeshes[i];
            mesh.ENABLE = this.uiClothesEnable.checked;
            if (mesh.ENABLE) {
                mesh.anim.t = this.figureMesh.anim.t;
                this.animResync = true;
            }
        }
    },

    uiConstraintsEnableCreate: function(elements) {
        this.uiConstraintsEnable = document.createElement('input');
        this.uiConstraintsEnable.type = 'checkbox';
        this.uiConstraintsEnable.checked = false;
        utils.on(
            this.uiConstraintsEnable, 'click',
            this.uiConstraintsEnableClick, this
        );
        elements.push({
                label: "Constraints",
                padding: '2px',
                align: 'center',
                ui: this.uiConstraintsEnable
        });
    },
    uiConstraintsEnableClick: function() {
        this.animResync = true;
    },

    uiLightCreate: function(elements) {
        this.uiLightLabel = document.createElement('span');
        utils.contentText(this.uiLightLabel, "Light");
        this.uiLight = document.createElement('input');
        this.uiLight.type = 'range';
        this.uiLight.min = '0';
        this.uiLight.max = '1';
        this.uiLight.step = '0.05';
        this.uiLight.value = this.LIGHT.toString();
        utils.on(this.uiLight, 'input', this.uiLightInput, this);
        elements.push({label: this.uiLightLabel, ui: this.uiLight});
    },
    uiLightInput: function() {
        var value = parseFloat(this.uiLight.value);
        this.LIGHT = value;
        vec3.set(this.lightColor, value, value, value);
        var ambient = Math.min(0.2, value);
        vec3.set(this.ambientColor, ambient, ambient, ambient);

        utils.contentText(
            this.uiLightLabel,
            (value == 0
             ? "Light Off"
             : "Light " + (value * 100).toFixed(0) + "%")
        );
    },

    uiAnimSpeedCreate: function(elements) {
        this.uiAnimSpeedLabel = document.createElement('span');
        utils.contentText(this.uiAnimSpeedLabel, "Animation Speed");
        this.uiAnimSpeed = document.createElement('input');
        this.uiAnimSpeed.type = 'range';
        this.uiAnimSpeed.min = '0';
        this.uiAnimSpeed.max = '2';
        this.uiAnimSpeed.step = '0.1';
        this.uiAnimSpeed.value = this.ANIMATION_SPEED.toString();
        utils.on(this.uiAnimSpeed, 'input', this.uiAnimSpeedInput, this);
        elements.push({label: this.uiAnimSpeedLabel, ui: this.uiAnimSpeed});
    },
    uiAnimSpeedInput: function() {
        var value = parseFloat(this.uiAnimSpeed.value);
        this.ANIMATION_SPEED = value;
        this.animResync = true;
        utils.contentText(
            this.uiAnimSpeedLabel,
            (value == 0
             ? "Animation Off"
             : "Animation " + value.toFixed(1) + "\u00d7")
        );
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

	    var gl = this.context.gl;
	    var d = Math.min(gl.drawingBufferWidth, gl.drawingBufferHeight);
	    var scale = 360 / d;
	    var pitch = this.pitch - dy * scale;
            if (pitch < -180) {
                pitch = -180;
            } else if (pitch > 180) {
                pitch = 180;
            }
	    var yaw = this.yaw - dx * scale;
            while (yaw > 180) {
                yaw -= 360;
            }
            while (yaw < -180) {
                yaw += 360;
            }
            this.pitch = pitch;
            this.yaw = yaw;
            this.animResync = true;
	}
    },
    dragStop: function() {
	this.mouseDrag = null;
    },

    mouseDownEvent: function(event) {
        if (event.target != this.canvas) {
            /* ignore if not the canvas */
            return;
        }
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
        if (event.shiftKey) {
            /* change elevation */
            var elevationMax = this.elevationMax;
            var elevation= this.elevation[1] + (event.deltaY < 0 ? 3 : -3);
            if (elevation < -elevationMax) {
                elevation = -elevationMax;
            }
            if (elevation > elevationMax) {
                elevation = elevationMax;
            }
            this.elevation[1] = elevation;
        } else {
            /* change scale */
            var scale = this.scale + (event.deltaY < 0 ? -1 : 1) * 0.05;
            if (scale < 0.75) {
                scale = 0.75;
            } else if (scale > 10) {
                scale = 10;
            }
            this.scale = scale;
        }
        this.animResync = true;
    },

    resize: function() {
        console.log("resize");
	utils.App.resize.call(this);

        var gl = this.gl;
        mat4.perspective(
            this.pMatrix,
            Math.PI / 4,
            gl.drawingBufferWidth / gl.drawingBufferHeight,
            0.01,
            10000
        );

        for (var i = 0, n = GL.MeshDqs.programs.length; i < n; ++i) {
            var program = GL.MeshDqs.programs[i];
            if (program.uniforms.pMatrix) {
                program.uniforms.pMatrix.set(this.pMatrix).dirty = true;
            }
        }
    },

    animate: function(t) {
        if (this.frameCounter < 30) {
            return;
        }

        var animResync = this.animResync;
        this.animResync = false;

        /* compute seconds elapsed since last call */
        var dt = 0;
        var last = this.animateLast;
        if (last != null) {
            dt = (t - last) / 1000;
        }
        this.animateLast = t;

        if (animResync || this.ANIMATION_SPEED > 0) {
            var at = this.animateTime;
            if (at == undefined) {
                at = this.animateTime = 0;
            } else {
                /* advance the animation timestamp */
                at += dt * this.ANIMATION_SPEED;
                this.animateTime = at;
            }
            for (var i = 0, n = this.meshes.length; i < n; ++i) {
                var mesh = this.meshes[i];
                if (mesh.ENABLE) {
                    mesh.animate(mesh.anim, at);
                }
            }
        }

        if (animResync) {
            var elevation = this.elevation;
            var scale = this.scale;
            var rotateX = this.pitch;
            var rotateY = this.yaw;
            var mat = this.mMatrix;
            mat4.identity(mat);
            mat4.translate(mat, mat, this.toOrigin);
            mat4.scale(mat, mat, [scale, scale, scale]);
            mat4.rotateX(mat, mat, utils.radians(rotateX));
            mat4.rotateY(mat, mat, utils.radians(rotateY));
            mat4.translate(mat, mat, this.fromOrigin);
            mat4.translate(mat, mat, elevation);
            mat4.multiply(mat, this.mMatrixBase, mat);
            utils.debug && console.log("debugM", mat);
            this.figureMesh.mMatrix = this.mMatrix;
        }
    },

    render: function() {
        this.renderPre();
        this.renderView(this.pMatrix, this.vMatrix);
        this.renderPost();

        if (false) {
            return;
        }
        if (true) {
            utils.debug = 0;
            this.context.validate = false;
            this.renderRequest();
        } else {
            if (this.frameCounter < 2) {
                this.renderRequest();
            } else {
                utils.debug = 0;
                this.context.validate = false;
            }
        }
    },

    renderPre: function() {
        var start = this.renderTimer.start();

        ++this.frameCounter;
        utils.debug && console.info("render", this.frameCounter);

        var context = this.context;
        var gl = context.gl;
        var meshes = this.meshes;

        gl.clearColor(0.3, 0.3, 0.3, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        this.animateTimer.start();
        this.animate(start);
        this.animateTimer.stop();

        GL.MeshDqs.renderPre();

        this.drawTimer.start();
    },

    renderView: function(pMatrix, vMatrix) {
        GL.MeshDqs.renderView(pMatrix, vMatrix);
    },

    renderPost: function() {
        this.drawTimer.stop();
        var end = this.renderTimer.stop();
        var elapsed = end - this.reportTime;
        if (elapsed >= 2000) {
            var frames = this.frameCounter - this.reportFrame;
            this.reportFrame = this.frameCounter;
            this.reportFps = frames / elapsed * 1000;
            this.reportTime = end;
            this.overlay.show({
                "fps": (frames / elapsed * 1000).toFixed(2),
                "animate": this.animateTimer.ema.toFixed(2) + " ms",
                "DQS": GL.MeshDqs.transformTimer.ema.toFixed(2) + " ms",
                "fit": GL.MeshDqs.meshFitTimer.ema.toFixed(2) + " ms",
                "normals": GL.MeshDqs.normalsTimer.ema.toFixed(2) + " ms",
                "tangents": GL.MeshDqs.tangentsTimer.ema.toFixed(2) + " ms",
                "draw": this.drawTimer.ema.toFixed(2) + " ms",
                "total": this.renderTimer.ema.toFixed(2) + " ms"
            }, ["fps",
                "animate", "DQS",
                "fit",
                "normals", "tangents",
                "draw",
                "total"]);
        }
    },

    vrDrawPre: function(frameData) {
        this.renderPre();
    },

    VR_VIEW_TRANSLATE: [0, -1.5, -0.5],

    vrDraw: function(pMatrix, vMatrix) {
        utils.debug && console.info("vrDraw", this.frameCounter);

        mat4.translate(this.vMatrixVR, vMatrix, this.VR_VIEW_TRANSLATE);
        this.renderView(pMatrix, this.vMatrixVR);
    },

    vrDrawPost: function(frameData) {
        this.renderPost();

        utils.debug = 0;
        this.context.validate = false;
    }
});
