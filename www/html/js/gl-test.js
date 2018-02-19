utils.debug = 1;

var App = utils.extend(utils.WebVR, {
    VR_ENABLE: true,
    MORPHS_ENABLE: true,
    ANIMATION_SPEED: 1,
    ROTATION: 0,
    ROTATION_SPEED: 0,

    initAssets: function() {
        var gl = this.gl;
        this.context = GL.Context.create(gl);
        this.overlay = utils.Overlay.create();
        this.renderTimer = utils.EMA.create(utils.EMA.alphaN(100));
        this.animateTimer = utils.EMA.create(utils.EMA.alphaN(100));
        this.transformTimer = utils.EMA.create(utils.EMA.alphaN(100));
        this.normalsTimer = utils.EMA.create(utils.EMA.alphaN(100));
        this.drawTimer = utils.EMA.create(utils.EMA.alphaN(100));

        GL.MeshDqs.initAssets(this.context, this.loader);
        var assets = {
            figure: utils.AssetFigure.create({
                url: "lib/models/Victoria 7/model.json",
                scripts: [
                    "lib/js/mods-g3f.js",
                    "lib/js/mods-v7.js"
                ],
                loadImages: false
            }),
            hair: utils.AssetFigure.create({
                url: "lib/models/Cordia Hair/model.json",
                //url: "lib/models/Krayon Hair/model.json",
                scripts: [
                    "lib/js/mods-cordia.js"
                    //"lib/js/mods-krayon.js"
                ],
                loadImages: false
            }),
            clothes: utils.AssetFigure.create({
                url: "lib/models/HY MiniDress for V7/model.json",
                scripts: [
                    "lib/js/mods-hongyu-minidress-v7.js"
                ],
                loadImages: false
            })
        };
        this.poses = [
            { name: "walk",
              url: "lib/poses/anim-walk-flat-inplace.json" },
            { name: "run",
              url: "lib/poses/anim-run-inplace.json" },
            { name: "shoulder shimmy",
              url: "lib/poses/anim-bellydance-shoulder-shimmy-v7.json" },
            { name: "black ice 1",
              url: "lib/poses/anim-ma-black-ice-1-v7.json" }
/*
	    { name: "snake hips",
              url: "lib/poses/anim-bellydance-standing-snake-hips-v7.json" },
            { name: "barrel turn",
              url: "lib/poses/anim-bellydance-barrel-turns-v7.json" },
            { name: "idle A 1",
              url: "lib/poses/anim-G3F Idle A 1.json" }
*/
        ];
        for (var i = 0, n = this.poses.length; i < n; ++i) {
            var url = this.poses[i].url;
            assets[url] = utils.AssetRequest.create({
                responseType: 'json',
                url: url
            });
        }
        this.loader.batch(assets);
    },

    readyAssets: function() {
        var context = this.context;
        var gl = context.gl;

        GL.MeshDqs.readyAssets(this.context, this.loader);

        this.figure = this.loader.cache.figure.get();
        this.hair = this.loader.cache.hair.get();
        this.clothes = this.loader.cache.clothes.get();

        this.figureMesh = GL.MeshDqs.create(this.context, {
            name: "figure",
            mesh: this.figure
        });
        this.figureMesh.ENABLE = true;
        this.meshes = [this.figureMesh];
        if (true) {
            this.hairMesh = GL.MeshDqs.create(this.context, {
                name: "hair",
                mesh: this.hair
            });
            this.hairMesh.ENABLE = true;
            this.meshes.push(this.hairMesh);
        }
        if (true) {
            this.clothesMesh = GL.MeshDqs.create(this.context, {
                name: "clothes",
                mesh: this.clothes
            });
            this.clothesMesh.ENABLE = true;
            this.meshes.push(this.clothesMesh);
        }
        /*
         * TBD: why do I get this error?
         *	Error: WebGL warning: drawElements: Driver rejected indexed draw call, possibly due to out-of-bounds indices.
         *
         * Workaround seems to be to draw meshes in increasing
         * ELEMENT_ARRAY_BUFFER size.
         */
        this.meshes.sort(function(a, b) {
            return a.numIndices - b.numIndices;
        });

        var bounds = utils.boundingBox(this.figureMesh.coords);
        console.log("bounds", bounds);

        this.mMatrix = mat4.create();
        var scale = 1.55 / bounds.ymax;
        mat4.scale(this.mMatrix, this.mMatrix, [ scale, scale, scale ]);

        this.vMatrix = mat4.create();
        this.vMatrixVR = mat4.create();
        // full
        mat4.translate(this.vMatrix, this.vMatrix, [0, -0.75, -2.2]);
        // face
        //mat4.translate(this.vMatrix, this.vMatrix, [0, -1.5, -0.5]);

        this.pMatrix = mat4.create();

        this.programs = [
            GL.MeshDqs.normalsDebugProgram
        ];
        for (var i = 0, n = this.programs.length; i < n; ++i) {
            var program = this.programs[i];
            if (program.uniforms.mMatrix) {
                program.uniforms.mMatrix.set(this.mMatrix);
            }
            if (program.uniforms.vMatrix) {
                program.uniforms.vMatrix.set(this.vMatrix);
            }
        }

        for (var i = 0, n = this.poses.length; i < n; ++i) {
            var pose = this.poses[i];
            pose.keyFrames = this.loader.cache[pose.url].responseJSON();
        }
        this.poseSelect(this.poses[0]);

        this.frameCounter = 0;
        this.reportFrame = 0;
        this.reportTime = self.performance.now();
        this.uiCreate();
    },
    poseSelect: function(pose) {
        if (this.pose == pose) {
            return;
        }
        this.pose = pose;

        var basePose = {
            CTRLVictoria7: 0.65,
            PBMBreastsSize: 0.25,
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
        this.uiMorphsEnableCreate(elements);
        this.uiHairEnableCreate(elements);
        this.uiClothesEnableCreate(elements);
        this.uiAnimSpeedCreate(elements);
        true && this.uiRotationCreate(elements);
        false && this.uiRotationSpeedCreate(elements);

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
        if (!this.clothesMesh) {
            return;
        }
        this.uiClothesEnable = document.createElement('input');
        this.uiClothesEnable.type = 'checkbox';
        this.uiClothesEnable.checked = this.clothesMesh.ENABLE;
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
        this.clothesMesh.ENABLE = this.uiClothesEnable.checked;
        if (this.clothesMesh.ENABLE) {
            this.clothesMesh.anim.t = this.figureMesh.anim.t;
            this.animResync = true;
        }
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
        var text;
        if (value == 0) {
            text = "Animation Off";
        } else {
            text = "Animation " + value.toFixed(1) + "\u00d7";
        }
        utils.contentText(this.uiAnimSpeedLabel, text);
    },

    uiRotationCreate: function(elements) {
        this.uiRotationLabel = document.createElement('span');
        utils.contentText(this.uiRotationLabel, "Rotation");
        this.uiRotation = document.createElement('input');
        this.uiRotation.type = 'range';
        this.uiRotation.min = '-180';
        this.uiRotation.max = '180';
        this.uiRotation.step = '1';
        this.uiRotation.value = this.ROTATION.toString();
        utils.on(this.uiRotation, 'input', this.uiRotationInput, this);
        elements.push({label: this.uiRotationLabel, ui: this.uiRotation});
    },
    uiRotationInput: function() {
        var value = parseFloat(this.uiRotation.value);
        this.ROTATION = value;
        utils.contentText(
            this.uiRotationLabel,
            "Rotation " + value.toFixed(0) + "\u00b0"
        );
    },

    uiRotationSpeedCreate: function(elements) {
        this.uiRotationSpeed = document.createElement('input');
        this.uiRotationSpeed.type = 'range';
        this.uiRotationSpeed.min = '0';
        this.uiRotationSpeed.max = '60';
        this.uiRotationSpeed.step = '1';
        this.uiRotationSpeed.value = this.ROTATION_SPEED.toString();
        utils.on(this.uiRotationSpeed, 'input', this.uiRotationSpeedInput, this);
        elements.push({label: "Rotation Speed", ui: this.uiRotationSpeed});
    },
    uiRotationSpeedInput: function() {
        var value = parseFloat(this.uiRotationSpeed.value);
        this.ROTATION_SPEED = value;
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

        for (var i = 0, n = this.programs.length; i < n; ++i) {
            var program = this.programs[i];
            if (program.uniforms.pMatrix) {
                program.uniforms.pMatrix.set(this.pMatrix).dirty = true;
            }
        }
    },

    animate: function(t) {
        if (this.frameCounter < 30) {
            return;
        }

        /* compute seconds elapsed since last call */
        var dt = 0;
        var last = this.animateLast;
        if (last != null) {
            dt = (t - last) / 1000;
        }
        this.animateLast = t;

        if (this.ANIMATION_SPEED != 0 || this.animResync) {
            this.animResync = false;

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

        var rotateY = this.debugRotateY;
        if (this.ROTATION_SPEED != 0) {
            var rt = this.rotateTime;
            if (rt == undefined) {
                rt = this.rotateTime = 0;
            } else {
                /* advance the rotation timestamp */
                rt += dt * this.ROTATION_SPEED;
                this.rotateTime = rt;
            }
            rotateY = (rt * 6) % 360; // 60 sec = 360 deg
        } else {
            rotateY = this.ROTATION;
        }

        if (this.rotateYLast != rotateY) {
            this.rotateYLast = rotateY;
            var mat = this.debugM;
            if (!mat) {
                mat = mat4.create();
            }
            mat4.identity(mat);
            mat4.rotateY(mat, mat, utils.radians(rotateY));
            mat4.multiply(mat, this.mMatrix, mat);
            utils.debug && console.log("debugM", mat);
            for (var i = 0, n = this.programs.length; i < n; ++i) {
                var program = this.programs[i];
                if (program.uniforms.mMatrix) {
                    program.uniforms.mMatrix.set(mat).dirty = true;
                }
            }
        }
    },

    render: function() {
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

        gl.enable(gl.RASTERIZER_DISCARD);

        this.transformTimer.start();
        GL.MeshDqs.transformApplyProgram.useProgram();
        for (var i = 0, n = meshes.length; i < n; ++i) {
            var mesh = meshes[i];
            if (!mesh.ENABLE) {
                continue;
            }
            mesh.transformApply();
        }
        this.transformTimer.stop();

        this.normalsTimer.start();
        GL.MeshDqs.normalsComputeProgram.useProgram();
        for (var i = 0, n = meshes.length; i < n; ++i) {
            var mesh = meshes[i];
            if (!mesh.ENABLE) {
                continue;
            }
            mesh.normalsCompute();
        }
        gl.disable(gl.RASTERIZER_DISCARD);
        this.normalsTimer.stop();

        gl.enable(gl.DEPTH_TEST);

        this.drawTimer.start();
        var program = GL.MeshDqs.normalsDebugProgram;
        program.useProgram();
        for (var i = 0, n = meshes.length; i < n; ++i) {
            var mesh = meshes[i];
            if (!mesh.ENABLE) {
                continue;
            }
            program.uniforms.uCoords.set(mesh.uCoordsTex);
            program.uniforms.uNormals.set(mesh.uNormalsTex);
            program.flush();
            mesh.debugIndices.bind(gl.ELEMENT_ARRAY_BUFFER);
            this.context.drawElements(gl.TRIANGLES,
                                      mesh.numIndices,
                                      gl.UNSIGNED_INT, 0);
        }
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
                "render": this.renderTimer.ema.toFixed(2) + " ms",
                "animate": this.animateTimer.ema.toFixed(2) + " ms",
                "DQS": this.transformTimer.ema.toFixed(2) + " ms",
                "normals": this.normalsTimer.ema.toFixed(2) + " ms",
                "draw": this.drawTimer.ema.toFixed(2) + " ms"
            }, ["fps", "render", "animate", "DQS", "normals", "draw"]);
        }

        if (true) {
            //return;
        }
        if (true) {
            utils.debug = 0;
            this.renderRequest();
        } else {
            if (this.frameCounter < 2) {
                this.renderRequest();
            } else {
                utils.debug = 0;
            }
        }
    },

    vrDrawPre: function(frameData) {
        var start = this.renderTimer.start();

        ++this.frameCounter;
        utils.debug && console.info("vrDrawPre", this.frameCounter);

        var context = this.context;
        var gl = context.gl;
        var meshes = this.meshes;

        gl.clearColor(0.3, 0.3, 0.3, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        this.animateTimer.start();
        this.animate(start);
        this.animateTimer.stop();

        gl.enable(gl.RASTERIZER_DISCARD);

        this.transformTimer.start();
        GL.MeshDqs.transformApplyProgram.useProgram();
        for (var i = 0, n = meshes.length; i < n; ++i) {
            meshes[i].transformApply();
        }
        this.transformTimer.stop();

        this.normalsTimer.start();
        GL.MeshDqs.normalsComputeProgram.useProgram();
        for (var i = 0, n = meshes.length; i < n; ++i) {
            meshes[i].normalsCompute();
        }
        this.normalsTimer.stop();

        gl.disable(gl.RASTERIZER_DISCARD);
        gl.enable(gl.DEPTH_TEST);
        this.drawTimer.start();
    },

    VR_VIEW_TRANSLATE: [0, -1.5, -0.5],

    vrDraw: function(pMatrix, vMatrix) {
        utils.debug && console.info("vrDraw", this.frameCounter);

        mat4.translate(this.vMatrixVR, vMatrix, this.VR_VIEW_TRANSLATE);

        var context = this.context;
        var gl = context.gl;
        var meshes = this.meshes;

        var program = GL.MeshDqs.normalsDebugProgram;
        program.useProgram();
        for (var i = 0, n = meshes.length; i < n; ++i) {
            var mesh = meshes[i];
            program.uniforms.pMatrix.set(pMatrix).dirty = true;
            program.uniforms.vMatrix.set(this.vMatrixVR).dirty = true;
            program.uniforms.uCoords.set(mesh.uCoordsTex);
            program.uniforms.uNormals.set(mesh.uNormalsTex);
            program.flush();
            mesh.debugIndices.bind(gl.ELEMENT_ARRAY_BUFFER);
            this.context.drawElements(gl.TRIANGLES,
                                      mesh.numIndices,
                                      gl.UNSIGNED_INT, 0);
        }
    },

    vrDrawPost: function(frameData) {
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
                "render": this.renderTimer.ema.toFixed(2) + " ms",
                "animate": this.animateTimer.ema.toFixed(2) + " ms",
                "DQS": this.transformTimer.ema.toFixed(2) + " ms",
                "normals": this.normalsTimer.ema.toFixed(2) + " ms",
                "draw": this.drawTimer.ema.toFixed(2) + " ms"
            }, ["fps", "render", "animate", "DQS", "normals", "draw"]);
        }

        utils.debug = 0;
    }
});
