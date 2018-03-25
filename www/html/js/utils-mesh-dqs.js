/**
 * @file WebGL utility classes and functions
 * https://www.khronos.org/registry/webgl/specs/latest/2.0/
 */

/**
 * Manage a dual quarternion blended mesh.
 * Based on "Skinning with Dual Quarternions" by
 * Ladislav Kavan, Steven Collins, Jira Zara, Carol O'Sullivan
 *
 * Passes:
 *
 *  animate
 *    compute bone DQs and apply morphs
 *  dqs
 *    transform vertices using the DQ bone weight map
 *  normals
 *    compute vertex normals
 *  tangents
 *    compute tangents
 *  draw
 *    draw the mesh
 *
 * textureUnit assignments:
 *                        dqs normals tangents draw
 *	uCoords           -   0       0        0
 *	uNormals          -   -       1        1
 *	uWeights          2   -       -        -
 *	uBones            3   -       -        -
 *	uNeighbors        -   2       -        -
 *      uTexNeighbors     -   -       2        -
 *      uTexDeltas        -   -       3        -
 *	uDiffuseTexture   -   -       -        2
 *	uNormalTexture    -   -       -        3
 *	uBumpTexture      -   -       -        4
 *	uSpecularTexture  -   -       -        5
 *	uCutoutTexture    -   -       -        6
 */
GL.MeshDqs = utils.extend(utils.Object, {
    /**
     * For arrays that could be longer than MAX_TEXTURE_SIZE,
     * use ARRAY_CHUNK to turn the array index into a texture UV.
     *
     * Here is a function for remapping the array index:
     *    ivec2 texUV(uint i) {
     *    	return ivec2(i % ARRAY_CHUNK, int(i / ARRAY_CHUNK));
     *    }
     */
    ARRAY_CHUNK: 256,

    UNIFORM_DEFAULTS: {
        uToneMapScale: 0.6,
        uCutoutThreshold: 0.8,
        uRoughness: 0.5,
        uMetallic: 0.0,
        uTransparent: false
    },

    /*
     * render passes
     */

    /// transform meshes with multi-bone DQS weighting
    passDqsBones: [],

    /// transform meshes with single bone DQS weighting
    passDqsBone: [],

    /// compute normals 
    passNormals: [],

    /// compute tangents for meshes w/normal maps
    passTangents: [],

    /// fit meshes
    passMeshFits: [],

    /// draw materials w/out tangent space texture maps
    passDraw: [],

    /// draw materials w/tangent space texture maps
    passDrawTangents: [],

    /// draw materials w/cutouts
    passDrawCutouts: [],

    /// performance timers
    transformTimer: utils.EMA.create(utils.EMA.alphaN(100)),
    normalsTimer: utils.EMA.create(utils.EMA.alphaN(100)),
    tangentsTimer: utils.EMA.create(utils.EMA.alphaN(100)),
    meshFitTimer: utils.EMA.create(utils.EMA.alphaN(100)),

    /// all meshes
    meshes: [],

    /**
     * If true, use the current frame's transform feedback buffers
     * instead of the previous frame's.
     *
     * TBD: copy transform feedback buffers from previous frame or
     * copy as needed during the current frame?
     * Copying during the current frame may cause pipeline stalls
     * but produces more correct results.
     */
    IMMEDIATE: true,

    renderPre: function() {
        var context = App.context;
        var gl = context.gl;
        var meshes, i, n;

        if (!this.IMMEDIATE) {
            meshes = this.meshes;
            n = meshes.length;
            for (i = 0; i < n; ++i) {
                var mesh = meshes[i];
                mesh.coordsCopy();
                mesh.normalsCopy();
                var materials = mesh.materials;
                for (var j = 0, m = materials.length; j < m; ++j) {
                    var material = materials[j];
                    var groups = material.groups;
                    for (var k = 0, l = groups.length; k < l; ++k) {
                        var group = groups[k];
                        group.tangentsCopy();
                    }
                }
            }
        }

        gl.enable(gl.RASTERIZER_DISCARD);

        this.transformTimer.start();
        meshes = this.passDqsBones;
        n = meshes.length;
        if (n > 0) {
            this.dqsBonesProgram.useProgram();
            for (i = 0; i < n; ++i) {
                var mesh = meshes[i];
                if (mesh.ENABLE && mesh.dirty) {
                    mesh.dqsBones();
                }
            }
        }
        meshes = this.passDqsBone;
        n = meshes.length;
        if (n > 0) {
            this.dqsBoneProgram.useProgram();
            for (i = 0; i < n; ++i) {
                var mesh = meshes[i];
                if (mesh.ENABLE && mesh.dirty) {
                    mesh.dqsBone();
                }
            }
        }
        this.transformTimer.stop();

        this.normalsTimer.start();
        meshes = this.passNormals;
        n = meshes.length;
        if (n > 0) {
            this.normalsProgram.useProgram();
            for (i = 0; i < n; ++i) {
                var mesh = meshes[i];
                if (mesh.ENABLE && mesh.dirty) {
                    mesh.normalsCompute();
                }
            }
        }
        this.normalsTimer.stop();

        this.tangentsTimer.start();
        var materials = this.passTangents;
        n = materials.length;
        if (n > 0) {
            this.tangentsProgram.useProgram();
            for (i = 0; i < n; ++i) {
                var material = materials[i];
                var mesh = material.mesh;
                if (mesh.ENABLE && mesh.dirty) {
                    material.tangentsCompute();
                }
            }
        }
        this.tangentsTimer.stop();

        this.meshFitTimer.start();
        meshes = this.passMeshFits;
        n = meshes.length;
        if (n > 0 && App.uiConstraintsEnable.checked) {
            this.meshFitProgram.useProgram();
            for (i = 0; i < n; ++i) {
                var mesh = meshes[i];
                if (mesh.ENABLE && mesh.dirty) {
                    mesh.meshFit();
                }
            }
        }
        this.meshFitTimer.stop();

        gl.disable(gl.RASTERIZER_DISCARD);

        meshes = this.meshes;
        for (i = 0, n = meshes.length; i < n; ++i) {
            var mesh = meshes[i];
            if (mesh.ENABLE && mesh.dirty) {
                mesh.dirty = false;
            }
        }
    },

    lightingSet: function(program) {
        if (program.uniforms.uToneMap) {
            program.uniforms.uToneMap.set(App.TONE_MAP_ENABLE);
        }
        if (program.uniforms.uAmbientColor) {
            program.uniforms.uAmbientColor.set(
                App.AMBIENT_ENABLE ?
                    App.ambientColor :
                    App.blackColor
            );
        }
    },

    renderView: function(pMatrix, vMatrix) {
        var context = App.context;
        var gl = context.gl;

        gl.enable(gl.DEPTH_TEST);
	gl.depthMask(true);
        gl.depthFunc(gl.LESS);
        gl.disable(gl.BLEND);
        gl.enable(gl.CULL_FACE);

        this.lightingSet(this.materialProgram);
        this.lightingSet(this.materialTangentsProgram);

        var materials = this.passDraw;
        var i, n = materials.length;
        if (n > 0) {
            var lastMesh = null;
            var program = this.materialProgram;
            program.useProgram();
            for (i = 0; i < n; ++i) {
                var material = materials[i];
                if (material.uniformGet('uTransparent')) {
                    continue;
                }
                var mesh = material.mesh;
                if (mesh.ENABLE) {
                    if (mesh != lastMesh) {
                        mesh.viewSet(program, pMatrix, vMatrix);
                        lastMesh = mesh;
                    }
                    material.draw();
                }
            }
        }

        materials = this.passDrawTangents;
        n = materials.length;
        if (n > 0) {
            var lastMesh = null;
            var program = this.materialTangentsProgram;
            program.useProgram();
            for (i = 0; i < n; ++i) {
                var material = materials[i];
                var mesh = material.mesh;
                if (mesh.ENABLE) {
                    if (mesh != lastMesh) {
                        mesh.viewSet(program, pMatrix, vMatrix);
                        lastMesh = mesh;
                    }
                    material.drawTangents();
                }
            }
        }

        materials = this.passDrawCutouts;
        n = materials.length;
        if (n > 0) {
            var lastMesh = null;
            var program = this.materialProgram;
            program.useProgram();

            /* depth pass */
            gl.disable(gl.CULL_FACE);
            program.uniforms.uCutoutBlend.set(false);
            for (i = 0; i < n; ++i) {
                var material = materials[i];
                var mesh = material.mesh;
                if (mesh.ENABLE) {
                    if (mesh != lastMesh) {
                        mesh.viewSet(program, pMatrix, vMatrix);
                        lastMesh = mesh;
                    }
                    material.draw();
                }
            }

            /* alpha pass */
            gl.depthMask(false);
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
            program.uniforms.uCutoutBlend.set(true);
            for (i = 0; i < n; ++i) {
                var material = materials[i];
                var mesh = material.mesh;
                if (mesh.ENABLE) {
                    material.draw();
                }
            }
        }
    },

    // scratch variables
    _v0: vec3.create(),
    _v1: vec3.create(),
    _q0: quat.create(),
    _q1: quat.create(),
    _q2: quat.create(),
    _q3: quat.create(),
    _dq0: dquat.create(),

    /**
     * Load shared assets.
     * @static
     */
    initAssets: function(loader) {
        var context = App.context;
        var gl = context.gl;

        console.assert(
            gl.getParameter(gl.MAX_TEXTURE_SIZE) >= this.ARRAY_CHUNK,
            "MAX_TEXTURE_SIZE must be >= ARRAY_CHUNK"
        );
        console.assert(
            gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) >= 5,
            "MAX_VERTEX_TEXTURE_IMAGE_UNITS must be >= 5"
        );

        var defines = {
            ARRAY_CHUNK: this.ARRAY_CHUNK + 'u'
        };
        this.shaderLoader = GL.ShaderLoader.create(loader, {
            shaders: [
                { name: "shaders/mesh-dqs.inc",
                  type: "#include" },
                { name: "shaders/tone-mapping.inc",
                  type: "#include" },
                { name: "shaders/pbr.inc",
                  type: "#include" },
                { name: "shaders/specular-ks.inc",
                  type: "#include" },

                { name: "shaders/mesh-dqs.vert",
                  type: gl.VERTEX_SHADER,
                  defines: defines },
                { name: "shaders/mesh-dqs-bone.vert",
                  type: gl.VERTEX_SHADER,
                  defines: defines },
                { name: "shaders/mesh-dqs.frag",
                  type: gl.FRAGMENT_SHADER,
                  defines: defines },
                { name: "shaders/mesh-normals.vert",
                  type: gl.VERTEX_SHADER,
                  defines: defines },
                { name: "shaders/mesh-tangents.vert",
                  type: gl.VERTEX_SHADER,
                  defines: defines },
                { name: "shaders/mesh-material.vert",
                  type: gl.VERTEX_SHADER,
                  defines: defines },
                { name: "shaders/mesh-material.frag",
                  type: gl.FRAGMENT_SHADER,
                  defines: defines },
                { name: "shaders/mesh-material-tangents.vert",
                  type: gl.VERTEX_SHADER,
                  defines: defines },
                { name: "shaders/mesh-material-tangents.frag",
                  type: gl.FRAGMENT_SHADER,
                  defines: defines },
                { name: "shaders/mesh-fit.vert",
                  type: gl.VERTEX_SHADER,
                  defines: defines }
/*
                { name: "shaders/mesh-dqs-project.vert",
                  type: gl.VERTEX_SHADER,
                  defines: defines },
                { name: "shaders/mesh-constraints.vert",
                  type: gl.VERTEX_SHADER,
                  defines: defines },
                { name: "shaders/mesh-normals-debug.vert",
                  type: gl.VERTEX_SHADER,
                  defines: defines },
                { name: "shaders/mesh-normals-debug.frag",
                  type: gl.FRAGMENT_SHADER,
                  defines: defines  },
                { name: "shaders/mesh-fit-debug.vert",
                  type: gl.VERTEX_SHADER,
                  defines: defines  },
                { name: "shaders/mesh-fit-debug.frag",
                  type: gl.FRAGMENT_SHADER,
                  defines: defines  }
*/
            ],
            programs: [
                { name: "dqsBonesProgram",
                  vertexShader: "shaders/mesh-dqs.vert",
                  fragmentShader: "shaders/mesh-dqs.frag",
                  varyings: [
                      'vCoord'
                  ],
                  bufferMode: gl.SEPARATE_ATTRIBS },
                { name: "dqsBoneProgram",
                  vertexShader: "shaders/mesh-dqs-bone.vert",
                  fragmentShader: "shaders/mesh-dqs.frag",
                  varyings: [
                      'vCoord'
                  ],
                  bufferMode: gl.SEPARATE_ATTRIBS },
                { name: "normalsProgram",
                  vertexShader: "shaders/mesh-normals.vert",
                  fragmentShader: "shaders/mesh-dqs.frag",
                  varyings: [
                      'vNormal'
                  ],
                  bufferMode: gl.SEPARATE_ATTRIBS },
                { name: "tangentsProgram",
                  vertexShader: "shaders/mesh-tangents.vert",
                  fragmentShader: "shaders/mesh-dqs.frag",
                  varyings: [
                      'vTangent',
                      'vTexScale'
                  ],
                  bufferMode: gl.SEPARATE_ATTRIBS },
                { name: "materialProgram",
                  vertexShader: "shaders/mesh-material.vert",
                  fragmentShader: "shaders/mesh-material.frag" },
                { name: "materialTangentsProgram",
                  vertexShader: "shaders/mesh-material-tangents.vert",
                  fragmentShader: "shaders/mesh-material-tangents.frag" },
                { name: "meshFitProgram",
                  vertexShader: "shaders/mesh-fit.vert",
                  fragmentShader: "shaders/mesh-dqs.frag",
                  varyings: [
                      'vCoord'
                  ],
                  bufferMode: gl.SEPARATE_ATTRIBS }
/*
                { name: "projectApplyProgram",
                  vertexShader: "shaders/mesh-dqs-project.vert",
                  fragmentShader: "shaders/mesh-dqs.frag",
                  varyings: [
                      'vCoord'
                  ],
                  bufferMode: gl.SEPARATE_ATTRIBS },
                { name: "constraintsProgram",
                  vertexShader: "shaders/mesh-constraints.vert",
                  fragmentShader: "shaders/mesh-dqs.frag",
                  varyings: [
                      'vCoord'
                  ],
                  bufferMode: gl.SEPARATE_ATTRIBS },
                { name: "normalsDebugProgram",
                  vertexShader: "shaders/mesh-normals-debug.vert",
                  fragmentShader: "shaders/mesh-normals-debug.frag" },
                { name: "fitDebugProgram",
                  vertexShader: "shaders/mesh-fit-debug.vert",
                  fragmentShader: "shaders/mesh-fit-debug.frag" }
*/
            ]
        });
    },

    /**
     * Create the shared asssets.
     * @static
     */
    readyAssets: function() {
        var context = App.context;
        var gl = context.gl;
        this.programs = [];
        this.shaderLoader.compile(this, this.programs);
        this.shaderLoader = null;

        /* shared transform feedback objects */
        this.coordsFeedback = GL.TransformFeedback.create({
            name: "meshDqs.coordsFeedback"
        });
        this.normalsFeedback = GL.TransformFeedback.create({
            name: "meshDqs.normalsFeedback"
        });

        /* shared texture samplers */
        this.dataSampler = GL.Sampler.create({
            name: "meshDqs.dataSampler",
            params: {
                MAG_FILTER: gl.NEAREST,
                MIN_FILTER: gl.NEAREST,
                WRAP_S: gl.CLAMP_TO_EDGE,
                WRAP_T: gl.CLAMP_TO_EDGE
            }
        });
        this.mipMapLinearSampler = GL.Sampler.create({
            name: "meshDqs.linearSampler",
            params: {
                MAG_FILTER: gl.LINEAR,
                MIN_FILTER: gl.LINEAR_MIPMAP_LINEAR,
                MIN_FILTER: gl.LINEAR,
                WRAP_S: gl.CLAMP_TO_EDGE,
                WRAP_T: gl.CLAMP_TO_EDGE
            }
        });
    },

    /**
     * Initialize the mesh instance.
     * config = {
     *   name: <string>,
     *   mesh: <object>
     * }
     */
    init: function(config) {
        this.config = config;
        this.mvMatrix = mat4.create();
        this.nMatrix = mat4.create();
        this.ivMatrix = mat3.create();
        this.lightDirection = vec3.create();
        this.initMesh();
        this.initBoneWeights();
        this.initBones();
        this.initNeighbors();
        this.initMaterials();
        this.initDebug();
        this.initVAOs();
        this.dirty = true;
        GL.MeshDqs.meshes.push(this);

        console.log(config.mesh.name, {
            vertices: config.mesh.vertices.length,
            polygons:  config.mesh.polygons.length,
            materials: config.mesh.materials.length,
            bones: this.bones.length
        });

        return this;
    },

    initMesh: function() {
        var context = App.context;
        var gl = context.gl;
        var mesh = this.config.mesh;
        var numVertices = mesh.vertices.length;
        this.numVertices = numVertices;

        // unpack the vertices
        this.coordsBase = utils.arrayUnpack3f(mesh.vertices);
        this.boundsBase = utils.boundingBox(this.coordsBase);

        /*
         * attribute providing the pre-transform vertex coordinates
         */
        this.aCoord = GL.Buffer.create({
            name: this.config.name + ".aCoord"
        });
        this.aCoordSetDataParams = {
            srcData: this.coordsBase,
            length: this.coordsBase.length,
            usage: gl.DYNAMIC_READ
        };
        this.aCoord.setData(this.aCoordSetDataParams);
        this.aCoordAttribute = {
            buffer: this.aCoord
        };

        /*
         * texture for accessing the post-transform vertex coordinates
         *	RGB32F(x,y,z) = uCoords[texUV(vertex_index)]
         */
        var uCoordsW = this.ARRAY_CHUNK;
        var uCoordsH = Math.ceil(numVertices / this.ARRAY_CHUNK);
        this.uCoords = GL.Texture.create({
            name: this.config.name + ".uCoords",
            internalFormat: gl.RGB32F,
            type: gl.FLOAT,
            width: uCoordsW,
            height: uCoordsH,
            format: gl.RGB
        });
        this.uCoordsUniform = {
            textureUnit: 0,
            texture: this.uCoords,
            sampler: this.dataSampler
        };

        /*
         * transform feedback buffer for receving the transformed vertices
         * @note vCoord is padded out to be the same size as uCoords
         */
        this.vCoord = GL.Buffer.create({
            name: this.config.name + ".vCoord"
        });
        this.vCoord.setData({
            size: uCoordsW * uCoordsH * 3 * 4,
            usage: gl.DYNAMIC_COPY
        });
        this.vCoord.setSubData({
            dstByteOffset: 0,
            srcData: this.coordsBase
        });
        this.vCoordCopyBufferParams = {
            buffer: this.vCoord
        };

        this.coordsOut = new Float32Array(this.numVertices * 3);
        this.coordsOutCopyBufferParams = {
            target: gl.COPY_READ_BUFFER,
            dstData: this.coordsOut
        };
    },

    initBoneWeights: function() {
        var context = App.context;
        var gl = context.gl;
        var mesh = this.config.mesh;
        var index = mesh.vertex_weights.index;
        var weights = mesh.vertex_weights.weights;
        if (weights.length == 2) {
            /* a single bone controls the entire mesh */
            this.boneIndex = weights[0];
            GL.MeshDqs.passDqsBone.push(this);
            return;
        }

        /*
         * attribute for providing the uWeights offset, count
         * for the vertex's block of bone weights.
         */
        this.aWeightIndex = GL.Buffer.create({
            name: this.config.name + ".aWeightIndex"
        });
        this.aWeightIndex.setData({
            srcData: new Uint32Array(index),
            usage: gl.STATIC_READ
        });
        this.aWeightIndexAttribute = {
            buffer: this.aWeightIndex
        };
        
        /*
         * texture for accessing the vertex's bone weights:
         *	RG32F(bone, weight) = uWeights[texUV(offset)]
         *      ...
         *	RG32F(bone, weight) = uWeights[texUV(offset + count - 1)]
         */
        var numWeights = weights.length / 2;
        var uWeightsW = this.ARRAY_CHUNK;
        var uWeightsH = Math.ceil(numWeights / this.ARRAY_CHUNK);
        this.uWeights = GL.Texture.create({
            name: this.config.name + ".uWeights",
            internalFormat: gl.RG32F,
            type: gl.FLOAT,
            width: uWeightsW,
            height: uWeightsH,
            format: gl.RG
        });
        var weightData = new Float32Array(uWeightsW * uWeightsH * 2);
        weightData.set(weights);
        this.uWeights.setData({
            srcData: weightData
        });
        this.uWeightsUniform = {
            textureUnit: 2,
            texture: this.uWeights,
            sampler: this.dataSampler
        };
        GL.MeshDqs.passDqsBones.push(this);
    },

    initBones: function() {
        var context = App.context;
        var gl = context.gl;
        var mesh = this.config.mesh;
        this.bones = [];
        this.boneMap = {};
        this.boneAliases = {};
        this.initBone(mesh.figure, null);
        this.initControls();

        /*
         * Create dual quarternions for each bone.
         * The dual quarternions are views into a single buffer
         * to make it easier to update the uBones texture.
         */
        var numBones = this.bones.length;
        this.boneBuf = new Float32Array(numBones * 8);
        var buffer = this.boneBuf.buffer;
        var byteOffset = 0;
        for (var i = 0; i < numBones; ++i) {
            var bone = this.bones[i];
            utils.assert && utils.assert(
                bone,
                "missing bone for index " + i
            );

            var r = new Float32Array(buffer, byteOffset, 4);
            byteOffset += 16;
            var d = new Float32Array(buffer, byteOffset, 4);
            byteOffset += 16;
            var dq = [r, d];
            dquat.identity(dq);
            this.bones[i].dq = dq;
            this.bones[i].ldq = dquat.create();
        }

        /*
         * texture for accessing the bone's dual quarternion
         *	RGBA32F(rx,ry,rz,rw) = uBones[0, bone_index]
         *	RGBA32F(dx,dy,dz,dw) = uBones[1, bone_index]
         */
        var uBonesW = 2;
        var uBonesH = numBones;
        this.uBones = GL.Texture.create({
            name: this.config.name + ".uBones",
            internalFormat: gl.RGBA32F,
            type: gl.FLOAT,
            width: uBonesW,
            height: uBonesH,
            format: gl.RGBA
        });
        this.uBonesUniform = {
            textureUnit: 3,
            texture: this.uBones,
            sampler: this.dataSampler
        };
        this.uBonesSetDataParams ={
            srcData: this.boneBuf
        };
        this.uBones.setData(this.uBonesSetDataParams);
    },

    initBone: function(bone, parent) {
        bone.parent = parent;
        this.bones[bone.index] = bone;
        this.boneMap[bone.id] = bone;
        if (bone.alias) {
            this.boneAliases[bone.alias] = bone;
        }
        if (bone.rotation_order) {
            bone.rIndices = this.rotationIndices(bone.rotation_order);
        }

        var children = bone.children;
        if (children) {
            for (var i = 0, n = children.length; i < n; ++i) {
                this.initBone(children[i], bone);
            }
        }
    },

    initControls: function() {
        var numBones = this.bones.length;
        var props = utils.ModifierDict.BONE_PROPERTY_LIST;
        var numProps = props.length;
        var channels = utils.ModifierDict.BONE_CHANNEL_LIST;
        var numSlots = numBones * utils.ModifierDict.BONE_NUM_CHANNELS;

        this.controlBuf = new Float32Array(numSlots);
        var buffer = this.controlBuf.buffer;
        var byteOffset = 0;
        for (var i = 0; i < numBones; ++i) {
            var bone = this.bones[i];
            var boneMod = utils.ModifierDict.boneGet(bone.id);
            bone.controls = {};
            for (var j = 0; j < numProps; ++j) {
                var propName = props[j].name;
                var propId = boneMod.properties[propName];
                var size = propId.type.size;
                var value;
                if (propId.type.quarternion) {
                    size = 4;
                    value = new Float32Array(buffer, byteOffset, size);
                    quat.identity(value, value);
                    var initVal = bone[propName];
                    if (initVal) {
                        this.rotationApply(value, bone.rIndices, initVal);
                    }
                } else {
                    value = new Float32Array(buffer, byteOffset, size);
                    var initVal = bone[propName];
                    if (initVal) {
                        value.set(initVal);
                    }
                    if (propId.type.name == 'scale') {
                        if (initVal) {
                            value[3] = bone.general_scale || 1;
                        } else {
                            value.fill(1);
                        }
                    }
                }
                bone.controls[propName] = value;
                byteOffset += size * 4;
            }
        }
        // save the initial control values
        this.controlInitBuf = new Float32Array(this.controlBuf);
    },

    initNeighbors: function() {
        var context = App.context;
        var gl = context.gl;

        /* for each vertex, get its neighboring polygons */
        var polygons = this.config.mesh.polygons;
        var n = polygons.length;
        var neighborMap = {};
        var count = 0;
        for (var i = 0; i < n; ++i) {
            var poly = polygons[i];
            var m = poly.length;
            utils.assert && utils.assert(
                m == 4,
                this.config.name + " poly is not a quad",
                i, poly
            );

            for (var j = 0; j < 4; ++j) {
                var v = poly[j];
                var neighbors = neighborMap[v];
                if (!neighbors) {
                    neighbors = neighborMap[v] = [];
                }
                neighbors.push(
                    poly[(j + 1) % 4],
                    poly[(j + 2) % 4],
                    poly[(j + 3) % 4]
                );
                ++count;
            }
        }

        /*
         * texture for accessing the vertex's neighbor polygons
         *	RGB32UI(p1,p2,p3) = uNeighbors[texUV(offset)]
         *	..
         *	RGB32UI(p1,p2,p3) = uNeighbors[texUV(offset + count - 1)]
         * @note p0 is the current vertex
         */
        n = this.numVertices;
        var uNeighborsW = this.ARRAY_CHUNK;
        var uNeighborsH = Math.ceil(count / this.ARRAY_CHUNK);
        var indexBuf = new Uint32Array(n * 2);
        var neighborBuf = new Uint32Array(uNeighborsW * uNeighborsH * 3);
        var offset = 0;
        var ii = 0, jj = 0;
        for (i = 0; i < n; ++i) {
            var neighbors = neighborMap[i];
            var m = neighbors ? neighbors.length : 0;
            if (m == 0) {
                console.error("vertex has no neighbors", i);
            }
            var l = Math.floor(m / 3);
            indexBuf[ii++] = offset;
            indexBuf[ii++] = l;
            offset += l;
            for (var j = 0; j < m; ++j) {
                neighborBuf[jj++] = neighbors[j];
            }
        }
        this.uNeighbors = GL.Texture.create({
            name: this.config.name + ".uNeighbors",
            internalFormat: gl.RGB32UI,
            type: gl.UNSIGNED_INT,
            width: uNeighborsW,
            height: uNeighborsH,
            format: gl.RGB_INTEGER
        });
        this.uNeighbors.setData({
            srcData: neighborBuf
        });
        this.uNeighborsUniform = {
            textureUnit: 2,
            texture: this.uNeighbors,
            sampler: this.dataSampler
        };

        /*
         * attribute providing the offset, count into uNeighbors
         * for the vertex's block of neighboring polygons
         */
        this.aNeighborIndex = GL.Buffer.create({
            name: this.config.name + ".aNeighborIndex"
        });
        this.aNeighborIndex.setData({
            srcData: indexBuf,
            usage: gl.STATIC_READ
        });
        this.aNeighborIndexAttribute = {
            buffer: this.aNeighborIndex
        };

        /*
         * uNormals texture for accessing the computed vertex normals
         *	RGB32F(x,y,z) = uNormals[texUV(vertex_index)]
         */
        var uNormalsW = this.ARRAY_CHUNK;
        var uNormalsH = Math.ceil(this.numVertices / this.ARRAY_CHUNK);
        this.uNormals = GL.Texture.create({
            name: this.config.name + ".uNormals",
            internalFormat: gl.RGB32F,
            type: gl.FLOAT,
            width: uNormalsW,
            height: uNormalsH,
            format: gl.RGB
        });
        this.uNormalsUniform = {
            textureUnit: 1,
            texture: this.uNormals,
            sampler: this.dataSampler
        };

        /*
         * vNormal varying buffer for receving the computed vertex normals
         *	Nx = vNormal[vertex_index * 3]
         *	Ny = vNormal[vertex_index * 3 + 1]
         *	Nz = vNormal[vertex_index * 3 + 2]
         * @note vNormal is padded out to be the same size as uNormals
         */
        this.vNormal = GL.Buffer.create({
            name: this.config.name + ".vNormal"
        });
        this.vNormal.setData({
            size: uNormalsW * uNormalsH * 3 * 4,
            usage: gl.DYNAMIC_COPY
        });
        this.vNormalCopyBufferParams = {
            buffer: this.vNormal
        };

        this.normals = new Float32Array(this.numVertices * 3);
        this.normalsCopyBuffer = {
            target: gl.COPY_READ_BUFFER,
            dstData: this.normals
        };
        GL.MeshDqs.passNormals.push(this);
    },

    initMaterials: function() {
        this.materials = [];
        var materials = this.config.mesh.materials;
        for (var i = 0, n = materials.length; i < n; ++i) {
            var material = GL.Material.create(this, materials[i]);
            this.materials.push(material);
        }
        var groups = this.config.mesh.material_groups;
        for (var i = 0, n = groups.length; i < n; ++i) {
            var group = groups[i];
            var material = this.materials[group.material];
            material.groups.push(GL.MaterialGroup.create(this, material, groups[i]));
        }
    },

    initDebug: function() {
        var context = App.context;
        var gl = context.gl;
        var polygons = this.config.mesh.polygons;
        var indices = [];
        for (var i = 0, n = polygons.length; i < n; ++i) {
            var poly = polygons[i];
            if (poly.length == 4) {
                indices.push(
                    poly[0], poly[1], poly[2],
                    poly[2], poly[3], poly[0]
                );
            } else {
                console.log("invalid poly", i, poly);
            }
        }
        this.numIndices = indices.length;
        this.debugIndices = GL.Buffer.create({
            name: this.config.name + ".debugIndices",
            target: gl.ELEMENT_ARRAY_BUFFER
        });
        this.debugIndices.setData({
            srcData: new Uint32Array(indices),
            usage: gl.STATIC_DRAW
        });
        this.debugIndices.unbind();
    },

    initFit: function(fit) {
        this.initPinConstraints(fit);
        this.initDistanceConstraints(fit);
        this.meshFitVAO = GL.VertexArray.create({
            name: this.config.name + ".meshFitVAO",
            program: this.meshFitProgram
        });
        this.meshFitVAO.attributes.aBaseVertex.set({
            buffer: this.aBaseVertex
        });
        this.meshFitVAO.attributes.aDistanceIndex.set({
            buffer: this.aDistanceIndex
        });
        GL.MeshDqs.passMeshFits.push(this);
    },

    initPinConstraints: function(fit) {
        var context = App.context;
        var gl = context.gl;
        var baseVertex = [];
        for (var i = 0, n = fit.length; i < n; ++i) {
            var matches = fit[i];
            if (matches) {
                for (var j = 0, m = matches.length; j < 4; ++j) {
                    if (j < m) {
                        var match = matches[j];
                        baseVertex.push(match[0]);
                    } else {
                        baseVertex.push(-1);
                    }
                }
            } else {
                for (var j = 0; j < 4; ++j) {
                    baseVertex.push(-1);
                }
            }
        }
        this.aBaseVertex = GL.Buffer.create({
            name: this.config.name + ".aBaseVertex"
        });
        this.aBaseVertex.setData({
            srcData: new Int32Array(baseVertex),
            usage: gl.STATIC_DRAW
        });

        this.uCoordsBaseUniform = {
            textureUnit: 2,
            texture: this.parent.uCoords,
            sampler: this.dataSampler
        };
        this.uNormalsBaseUniform = {
            textureUnit: 3,
            texture: this.parent.uNormals,
            sampler: this.dataSampler
        };
    },

    initDistanceConstraints: function() {
        var context = App.context;
        var gl = context.gl;
        var polygons = this.config.mesh.polygons;
        var n = polygons.length;

        this.edges = {};
        this.vertexEdges = {};
        for (var i = 0; i < n; ++i) {
            var poly = polygons[i];
            var m = poly.length;
            utils.assert && utils.assert(
                m == 4,
                this.config.name + " poly is not a quad",
                i, poly
            );

            var p = poly[m - 3];
            for (var j = 0; j < m; ++j) {
                var v = poly[j];
                this.initEdge(p, v);
            }
        }
        var offset = 0;
        var indexBuf = [];
        var constraintBuf = [];
        for (i = 0, n = this.numVertices; i < n; ++i) {
            var edges = this.vertexEdges[i];
            if (edges) {
                for (var j = 0, m = edges.length; j < m; ++j) {
                    var edge = edges[j];
                    console.assert(
                        i == edge.a || i == edge.b,
                        "i == edge.a || i == edge.b",
                        i, edge
                    );
                    var vi = i == edge.a ? edge.b : edge.a;
                    constraintBuf.push(vi, edge.len, 0.1);
                }
                indexBuf.push(offset, m);
                offset += m;
            } else {
                indexBuf.push(0, 0);
            }
        }

        this.aDistanceIndex = GL.Buffer.create({
            name: this.config.name + ".aDistanceIndex"
        });
        this.aDistanceIndex.setData({
            srcData: new Uint32Array(indexBuf),
            usage: gl.STATIC_READ
        });

        var numConstraints = offset;
        var uDistancesW = this.ARRAY_CHUNK;
        var uDistancesH = Math.ceil(numConstraints / this.ARRAY_CHUNK);
        this.uDistances = GL.Texture.create({
            name: this.config.name + ".uDistances",
            internalFormat: gl.RGB32F,
            type: gl.FLOAT,
            width: uDistancesW,
            height: uDistancesH,
            format: gl.RGB
        });
        var srcData = new Float32Array(uDistancesW * uDistancesH * 3);
        srcData.set(constraintBuf);
        this.uDistances.setData({
            srcData: srcData
        });
        this.uDistancesUniform = {
            textureUnit: 4,
            texture: this.uDistances,
            sampler: this.dataSampler
        };
    },

    initEdge: function(a, b) {
        if (a > b) {
            var tmp = a;
            a = b;
            b = tmp;
        }
        var edgeMap = this.edges[a];
        if (!edgeMap) {
            edgeMap = this.edges[a] = {};
        }
        var edge = edgeMap[b];
        if (!edge) {
            var vertices = this.config.mesh.vertices;
            vec3.sub(this._v0, vertices[a], vertices[b]);
            edge = edgeMap[b] = {
                a: a,
                b: b,
                len: vec3.length(this._v0)
            };
            
            var edges = this.vertexEdges[a];
            if (!edges) {
                this.vertexEdges[a] = [edge];
            } else {
                edges.push(edge);
            }
            edges = this.vertexEdges[b];
            if (!edges) {
                this.vertexEdges[b] = [edge];
            } else {
                edges.push(edge);
            }
        }
        return edge;
    },

    initVAOs: function() {
        if (this.aWeightIndex) {
            this.dqsBonesVAO = GL.VertexArray.create({
                name: this.config.name + ".dqsBonesVAO",
                program: GL.MeshDqs.dqsBonesProgram
            });
            this.dqsBonesVAO.attributes.aCoord.set(this.aCoordAttribute);
            this.dqsBonesVAO.attributes.aWeightIndex.set(this.aWeightIndexAttribute);
        } else {
            this.dqsBoneVAO = GL.VertexArray.create({
                name: this.config.name + ".dqsBoneVAO",
                program: GL.MeshDqs.dqsBoneProgram
            });
            this.dqsBoneVAO.attributes.aCoord.set(this.aCoordAttribute);
        }

        this.normalsVAO = GL.VertexArray.create({
            name: this.config.name + ".normalsVAO",
            program: GL.MeshDqs.normalsProgram
        });
        this.normalsVAO.attributes.aNeighborIndex.set(this.aNeighborIndexAttribute);
    },

    dqsBones: function() {
        var context = App.context;
        var gl = context.gl;
        var program = this.dqsBonesProgram;

        program.uniforms.uBones.set(this.uBonesUniform);
        program.uniforms.uWeights.set(this.uWeightsUniform);
        program.flush();

        this.dqsBonesVAO.bind();
        this.dqsBonesVAO.flush();

        program.varyings.vCoord.bufferBase(this.vCoord);
        this.coordsFeedback.begin(program, gl.POINTS);
        context.drawArrays(gl.POINTS, 0, this.numVertices);
        this.coordsFeedback.end();

        this.dqsBonesVAO.unbind();
        this.coordsUpdated = true;
    },
    dqsBone: function() {
        var context = App.context;
        var gl = context.gl;
        var program = this.dqsBoneProgram;

        var dq = this.bones[this.boneIndex].dq;
        program.uniforms.uR.set(dq[0]).dirty = true;
        program.uniforms.uD.set(dq[1]).dirty = true;
        program.flush();

        this.dqsBoneVAO.bind();
        this.dqsBoneVAO.flush();

        program.varyings.vCoord.bufferBase(this.vCoord);
        this.coordsFeedback.begin(program, gl.POINTS);
        context.drawArrays(gl.POINTS, 0, this.numVertices);
        this.coordsFeedback.end();

        this.dqsBoneVAO.unbind();
        this.coordsUpdated = true;
    },
    coordsCopy: function() {
        if (this.coordsUpdated) {
            // copy vCoord to uCoords
            App.context.activeTexture(this.uCoordsUniform.textureUnit);
            this.uCoords.copyBuffer(this.vCoordCopyBufferParams);
            this.coordsUpdated = false;
        }
    },

    meshFit: function() {
        var context = App.context;
        var gl = context.gl;
        var program = this.meshFitProgram;

        // get updated uCoords and uNormals
        GL.MeshDqs.IMMEDIATE && this.parent.coordsCopy();
        GL.MeshDqs.IMMEDIATE && this.parent.normalsCopy();
        GL.MeshDqs.IMMEDIATE && this.coordsCopy();

        program.uniforms.uCoordsBase.set(this.uCoordsBaseUniform);
        program.uniforms.uNormalsBase.set(this.uNormalsBaseUniform);
        program.uniforms.uCoords.set(this.uCoordsUniform);
        if (program.uniforms.uNormals) {
            GL.MeshDqs.IMMEDIATE && this.normalsCopy();
            program.uniforms.uNormals.set(this.uNormalsUniform);
        }
        program.uniforms.uDistances.set(this.uDistancesUniform);
        program.flush();

        this.meshFitVAO.bind();
        this.meshFitVAO.flush();

        program.varyings.vCoord.bufferBase(this.vCoord);
        this.coordsFeedback.begin(program, gl.POINTS);
        context.drawArrays(gl.POINTS, 0, this.numVertices);
        this.coordsFeedback.end();

        this.meshFitVAO.unbind();
        this.coordsUpdated = true;
    },

    normalsCompute: function() {
        var context = App.context;
        var gl = context.gl;
        var program = this.normalsProgram;

        GL.MeshDqs.IMMEDIATE && this.coordsCopy();

        program.uniforms.uCoords.set(this.uCoordsUniform);
        program.uniforms.uNeighbors.set(this.uNeighborsUniform);
        program.flush();

        this.normalsVAO.bind();
        this.normalsVAO.flush();

        program.varyings.vNormal.bufferBase(this.vNormal);
        this.normalsFeedback.begin(program, gl.POINTS);
        context.drawArrays(gl.POINTS, 0, this.numVertices);
        this.normalsFeedback.end();

        this.normalsVAO.unbind();
        this.normalsUpdated = true;
    },
    normalsCopy: function() {
        if (this.normalsUpdated) {
            // copy vNormal to uNormals
            App.context.activeTexture(this.uNormalsUniform.textureUnit);
            this.uNormals.copyBuffer(this.vNormalCopyBufferParams);
            this.normalsUpdated = false;
        }
    },

    mMatrixGet: function(vMatrix) {
        if (this.parent) {
            return this.parent.mMatrixGet(vMatrix);
        }
        return this.mMatrix;
    },

    viewSet: function(program, pMatrix, vMatrix) {
        var mMatrix = this.mMatrixGet();
        var mvMatrix = this.mvMatrix;
        var nMatrix = this.nMatrix;
        if (mMatrix) {
            mat4.multiply(mvMatrix, vMatrix, mMatrix);
        } else {
            mat4.copy(mvMatrix, vMatrix);
        }
        mat4.invert(nMatrix, mvMatrix);
        mat4.transpose(nMatrix, nMatrix);
        program.uniforms.pMatrix.set(pMatrix).dirty = true;
        program.uniforms.pMatrix.set(pMatrix).dirty = true;
        program.uniforms.mvMatrix.set(mvMatrix).dirty = true;
        program.uniforms.nMatrix.set(nMatrix).dirty = true;
        if (program.uniforms.uLightDirection) {
            /* transform light direction from world to view space */
            var ivMatrix = this.ivMatrix;
            mat3.fromMat4(ivMatrix, vMatrix);
            mat3.invert(ivMatrix, ivMatrix);
            mat3.transpose(ivMatrix, ivMatrix);
            var lightDir = this.lightDirection;
            vec3.transformMat3(lightDir, App.lightDirection, ivMatrix);
            program.uniforms.uLightDirection.set(lightDir).dirty = true;
            program.uniforms.uLightColor.set(App.lightColor);
        }
    },

    normalsDebugDraw: function() {
        var context = App.context;
        var gl = context.gl;
        var program = this.normalsDebugProgram;

        // get updated uNormals
        GL.MeshDqs.IMMEDIATE && this.normalsCopy();

        program.uniforms.uCoords.set(this.uCoordsUniform);
        program.uniforms.uNormals.set(this.uNormalsUniform);
        program.uniforms.uColorMode.set(this.uColorMode || 0);
        program.flush();
        this.debugIndices.bind(gl.ELEMENT_ARRAY_BUFFER);
        context.drawElements(gl.TRIANGLES,
                             this.numIndices,
                             gl.UNSIGNED_INT, 0);
    },

/*
    fitDebugDraw: function() {
        var context = App.context;
        var gl = context.gl;
        var program = this.fitDebugProgram;

        program.uniforms.uCoordsBase.set(this.fitBase.uCoordsUniform);
        program.uniforms.uCoordsTarget.set(this.uCoordsTargetUniform);
        program.flush();
        this.fitDebugVAO.bind();
        this.fitDebugVAO.flush();
        context.drawArrays(gl.LINES, 0, this.aCoordFitLen);
        //context.drawArrays(gl.POINTS, 0, this.aCoordFitLen);
        this.fitDebugVAO.unbind();
    },
*/

    animate: function(sampler, t) {
        var coords = App.coordsBlock.array;
        coords.set(this.coordsBase);
        this.controlBuf.set(this.controlInitBuf);
        sampler.output(t);
        var bones = this.bones;
        for (var i = 0, n = bones.length; i < n; ++i) {
            this.boneTransformLocal(bones[i]);
        }
        this.boneTransformGlobal(this.config.mesh.figure);
        this.uBones.setData(this.uBonesSetDataParams);
        this.aCoordSetDataParams.srcData = coords;
        this.aCoord.setData(this.aCoordSetDataParams);
        this.dirty = true;
    },

    boneTransformLocal: function(bone) {
        var controls = bone.controls;
	var tmpVec = this._v0;
        var tmpDq = this._dq0;
        var o_inv = this._q0;
        var q = this._q1;
        var ldq = bone.ldq;

        quat.multiply(q, controls.orientation, controls.rotation);
        quat.conjugate(o_inv, controls.orientation);
        quat.multiply(q, q, o_inv);

	vec3.add(tmpVec, controls.center_point, controls.translation);
        dquat.fromRotationTranslation(ldq, q, tmpVec);

	vec3.negate(tmpVec, controls.center_point);
        dquat.fromTranslation(tmpDq, tmpVec);
        dquat.multiply(ldq, ldq, tmpDq);

        // TBD: handle scaling
    },

    boneTransformGlobal: function(bone) {
        var dq = bone.dq;
        if (bone.parent) {
            dquat.multiply(dq, bone.parent.dq, bone.ldq);
            dquat.normalize(dq, dq);
        } else {
            dquat.copy(dq, bone.ldq);
        }

	var children = bone.children;
	if (children) {
	    for (var i = 0, n = children.length; i < n; ++i) {
		var child = children[i];
		this.boneTransformGlobal(child);
	    }
	}
    },

    rotationIndices: function(order) {
        var indices = [];
        for (var i = 0; i < 3; ++i) {
            switch (order[i]) {
	    case 'X':
                indices.push(0);
	        break;
	    case 'Y':
                indices.push(1);
	        break;
	    case 'Z':
                indices.push(2);
	        break;
            }
        }
        return indices;
    },

    ROTATION_AXES: [
        quat.rotateX,
        quat.rotateY,
        quat.rotateZ
    ],

    rotationApply: function(q, indices, rotation) {
        /* apply the rotations in reverse order */
        var funcs = this.ROTATION_AXES;
        var i = indices[2],
            j = indices[1],
            k = indices[0];
        funcs[i](q, q, utils.radians(rotation[i]));
        funcs[j](q, q, utils.radians(rotation[j]));
        funcs[k](q, q, utils.radians(rotation[k]));
    }
});

/**
 * A material.
 */
GL.Material = utils.extend(utils.Object, {
    init: function(mesh, material) {
        this.mesh = mesh;
        this.material = material;
        this.materialUniforms = (mesh.config.materialUniforms &&
                                 mesh.config.materialUniforms[material.id]);
        this.groups = [];
        this.initTextures();
        if (this.normalTexture) {
            GL.MeshDqs.passTangents.push(this);
            GL.MeshDqs.passDrawTangents.push(this);
        } else {
            if (this.cutoutTexture) {
                GL.MeshDqs.passDrawCutouts.push(this);
            } else {
                GL.MeshDqs.passDraw.push(this);
            }
        }
        console.log(material.id, this.info());
        return this;
    },
    info: function() {
        var rec = {};
        if (this.diffuseTexture) {
            rec.diffuse = this.diffuseTexture.name;
        } else if (this.diffuseColor) {
            rec.diffuse = this.diffuseColor;
        }
        if (this.normalTexture) {
            rec.normals = this.normalTexture.name;
        }
        if (this.bumpTexture) {
            rec.bump = this.bumpTexture.name;
        }
        if (this.specularTexture) {
            rec.specular = this.specularTexture.name;
        }
        if (this.cutoutTexture) {
            rec.cutout = this.cutoutTexture.name;
        }
        return rec;
    },

    initTextures: function() {
        var gl = App.context.gl;
        var material = this.material;
        var mesh = this.mesh;
        var images = mesh.config.mesh.images;
        var diffuse = material.diffuse;
        if (diffuse && diffuse.image != undefined) {
            var image = images[diffuse.image];
            if (image) {
                this.diffuseTexture = App.textureGet(image, {
                    internalFormat: gl.RGB,
                    format: gl.RGB,
                    flipY: true,
                    mipMaps: true
                });
                this.diffuseTextureUniform = {
                    textureUnit: 2,
                    texture: this.diffuseTexture,
                    sampler: mesh.mipMapLinearSampler
                };
            }
        }
        if (diffuse && diffuse.color) {
            this.diffuseColor = diffuse.color;
        } else {
            this.diffuseColor = App.blackColor;
        }

        var normalMap = material.normalMap;
        if (normalMap && normalMap.image != undefined) {
            var image = images[normalMap.image];
            if (image) {
                this.normalTexture = App.textureGet(image);
                this.normalTextureUniform = {
                    textureUnit: 3,
                    texture: this.normalTexture,
                    sampler: mesh.mipMapLinearSampler
                };
            }

            /* TBD: handle bumpMap w/out a normalMap */
            var bumpMap = material.bumpMap;
            if (bumpMap && bumpMap.image != undefined) {
                var image = images[bumpMap.image];
                if (image) {
                    this.bumpStrength = bumpMap.value || 1.0;
                    this.bumpTexture = App.textureGet(image);
                    this.bumpTextureUniform = {
                        textureUnit: 4,
                        texture: this.bumpTexture,
                        sampler: mesh.mipMapLinearSampler
                    };
                    // TBD
                    //this.initBumpMap();
                }
            }
        }

	var specularMap = material.specularMap;
	if (specularMap && specularMap.image != undefined) {
            var image = images[specularMap.image];
            if (image) {
	        this.specularTexture = App.textureGet(image);
                this.specularTextureUniform = {
	            textureUnit: 5,
                    texture: this.specularTexture,
                    sampler: mesh.mipMapLinearSampler
	        };
	    }
        }

	var cutout = material.cutout;
	if (cutout && cutout.image != undefined) {
            var image = images[cutout.image];
            if (image) {
	        this.cutoutTexture = App.textureGet(image);
                this.cutoutTextureUniform = {
	            textureUnit: 6,
                    texture: this.cutoutTexture,
                    sampler: mesh.mipMapLinearSampler
	        };
	    }
        }
    },
    initSSS: function() {
        var gl = App.context.gl;
        var tex = this.diffuseTexture;

        tex.sssTexture = GL.Texture.create({
            name: tex.name + ".sss"
        });
        tex.sssTexture.setStorage({
            internalFormat: gl.RGB8,
            width: tex.srcWidth,
            height: tex.srcHeight
        });
        tex.fbo = GL.Framebuffer.create({
            name: tex.name + ".FBO"
        });
        tex.fbo.texture2D({
            attachment: gl.COLOR_ATTACHMENT0,
            texture: tex.sssTexture
        });
        tex.fbo.checkStatus();
        tex.fbo.unbind();
    },

    tangentsCompute: function() {
        var context = App.context;
        var gl = context.gl;
        var program = GL.MeshDqs.tangentsProgram;
        var mesh = this.mesh;
        var groups = this.groups;

        GL.MeshDqs.IMMEDIATE && mesh.coordsCopy();
        GL.MeshDqs.IMMEDIATE && mesh.normalsCopy();
        program.uniforms.uCoords.set(mesh.uCoordsUniform);
        program.uniforms.uNormals.set(mesh.uNormalsUniform);
        for (var i = 0, n = groups.length; i < n; ++i) {
            groups[i].tangentsCompute();
        }
    },

    uniformGet: function(name) {
        var value;
        var config = this.mesh.config;
        var uniforms = this.materialUniforms;
        if (uniforms) {
            value = uniforms[name];
            if (value != undefined) {
                return value;
            }
        }
        uniforms = config.meshUniforms;
        if (uniforms) {
            value = uniforms[name];
            if (value != undefined) {
                return value;
            }
        }
        return GL.MeshDqs.UNIFORM_DEFAULTS[name];
    },

    uniformsSet: function(program) {
        for (var name in GL.MeshDqs.UNIFORM_DEFAULTS) {
            if (program.uniforms[name]) {
                program.uniforms[name].set(this.uniformGet(name));
            }
        }
    },

    draw: function() {
        var context = App.context;
        var gl = context.gl;
        var mesh = this.mesh;
        var program = GL.MeshDqs.materialProgram;

        GL.MeshDqs.IMMEDIATE && mesh.coordsCopy();
        GL.MeshDqs.IMMEDIATE && mesh.normalsCopy();
        program.uniforms.uCoords.set(mesh.uCoordsUniform);
        program.uniforms.uNormals.set(mesh.uNormalsUniform);

        program.uniforms.uDiffuseColor.set(this.diffuseColor);
        if (this.diffuseTextureUniform && App.TEXTURES_ENABLE) {
            program.uniforms.uHasDiffuseTexture.set(true);
            program.uniforms.uDiffuseTexture.set(this.diffuseTextureUniform);
        } else {
            // TBD: need dummy textures
            program.uniforms.uHasDiffuseTexture.set(false);
        }
        if (this.cutoutTextureUniform) {
            program.uniforms.uHasCutoutTexture.set(true);
            program.uniforms.uCutoutTexture.set(this.cutoutTextureUniform);
        } else {
            // TBD: need dummy textures
            program.uniforms.uHasCutoutTexture.set(false);
        }
        this.uniformsSet(program);
        program.flush();

        var groups = this.groups;
        for (var i = 0, n = groups.length; i < n; ++i) {
            groups[i].draw();
        }
    },

    drawTangents: function() {
        var context = App.context;
        var gl = context.gl;
        var mesh = this.mesh;
        var program = GL.MeshDqs.materialTangentsProgram;

        program.uniforms.uCoords.set(mesh.uCoordsUniform);
        program.uniforms.uNormals.set(mesh.uNormalsUniform);

        program.uniforms.uDiffuseColor.set(this.diffuseColor);
        if (this.diffuseTextureUniform && App.TEXTURES_ENABLE) {
            program.uniforms.uHasDiffuseTexture.set(true);
            program.uniforms.uDiffuseTexture.set(this.diffuseTextureUniform);
        } else {
            // TBD: need dummy texture
            program.uniforms.uHasDiffuseTexture.set(false);
        }
        if (this.normalTextureUniform) {
            program.uniforms.uHasNormalTexture.set(true);
            program.uniforms.uNormalTexture.set(this.normalTextureUniform);
        } else {
            // TBD: need dummy texture
            program.uniforms.uHasNormalTexture.set(false);
        }
        if (this.bumpTextureUniform && App.BUMP_MAP_ENABLE) {
            program.uniforms.uHasBumpTexture.set(true);
            program.uniforms.uBumpTexture.set(this.bumpTextureUniform);
            program.uniforms.uBumpStrength.set(this.bumpStrength * 0.01);
        } else {
            // TBD: need dummy texture
            program.uniforms.uHasBumpTexture.set(false);
        }
        if (this.specularTextureUniform && App.SPECULAR_ENABLE) {
            program.uniforms.uHasSpecularTexture.set(true);
            program.uniforms.uSpecularTexture.set(this.specularTextureUniform);
        } else {
            // TBD: need dummy texture
            program.uniforms.uHasSpecularTexture.set(false);
        }
        this.uniformsSet(program);
        program.flush();

        var groups = this.groups;
        for (var i = 0, n = groups.length; i < n; ++i) {
            groups[i].drawTangents();
        }
    }
});

/**
 * A material group.
 */
GL.MaterialGroup = utils.extend(utils.Object, {
    init: function(mesh, material, group) {
        this.mesh = mesh;
        this.material = material;
        this.group = group;
        this.texCoords = [];
        this.texCoordBuf = [];
        this.texCoordMap = {};
        this.texNeighborMap = {};
        this.indices = [];
        this.initGroup(group);
        this.initBuffers();
    },

    tangentsCompute: function() {
        var context = App.context;
        var gl = context.gl;
        var program = GL.MeshDqs.tangentsProgram;

        program.uniforms.uTexNeighbors.set(this.uTexNeighborsUniform);
        program.uniforms.uTexDeltas.set(this.uTexDeltasUniform);
        program.flush();

        this.tangentsVAO.bind();
        this.tangentsVAO.flush();

        program.varyings.vTangent.bufferBase(this.vTangent);
        program.varyings.vTexScale.bufferBase(this.vTexScale);
        this.tangentsFeedback.begin(program, gl.POINTS);
        context.drawArrays(gl.POINTS, 0, this.numTexCoords);
        this.tangentsFeedback.end();

        this.tangentsVAO.unbind();
        this.tangentsUpdated = true;
    },
    tangentsCopy: function(mesh) {
        if (this.tangentsUpdated) {
            // copy vTangent to aTangent
            this.aTangent.copyBufferSubData(this.vTangentCopyParams);
            // copy vTexScale to aTexScale
            this.aTexScale.copyBufferSubData(this.vTexScaleCopyParams);

            this.tangentsUpdated = false;
        }
    },

    draw: function() {
        var context = App.context;
        var gl = context.gl;

        this.materialVAO.bind();
        this.materialVAO.flush();
        this.indices.bind(gl.ELEMENT_ARRAY_BUFFER);
        context.drawElements(gl.TRIANGLES,
                             this.numIndices,
                             gl.UNSIGNED_INT, 0);
        this.indices.unbind();
        this.materialVAO.unbind();
    },

    drawTangents: function() {
        var context = App.context;
        var gl = context.gl;

        /* get updated tangents */
        GL.MeshDqs.IMMEDIATE && this.tangentsCopy();

        this.materialTangentsVAO.bind();
        this.materialTangentsVAO.flush();
        this.indices.bind(gl.ELEMENT_ARRAY_BUFFER);
        context.drawElements(gl.TRIANGLES,
                             this.numIndices,
                             gl.UNSIGNED_INT, 0);
        this.indices.unbind();
        this.materialTangentsVAO.unbind();
    },

    initBuffers: function() {
        var context = App.context;
        var gl = context.gl;
        var mesh = this.mesh;
        var baseName = mesh.config.name + "." + this.group.id;

        /*
         * The texture coordinate and vertex_index for each texture vertex
         *	vec3(u, v, vertex_index) = aTexCoord;
         */
        var numTexCoords = Math.floor(this.texCoords.length);
        var texCoordBuf = new Float32Array(this.texCoordBuf);
        this.numTexCoords = numTexCoords;
        this.aTexCoord = GL.Buffer.create({
            name: baseName + ".aTexCoord"
        });
        this.aTexCoord.setData({
            srcData: texCoordBuf,
            usage: gl.STATIC_DRAW
        });

        /*
         * The triangle indices for drawing the material group's mesh.
         */
        var indices = new Uint32Array(this.indices);
        this.numIndices = indices.length;
        this.indices = GL.Buffer.create({
            name: baseName + ".indices",
            target: gl.ELEMENT_ARRAY_BUFFER
        });
        this.indices.setData({
            srcData: indices,
            usage: gl.STATIC_DRAW
        });

        if (this.material.normalTexture) {
            this.initTangentBuffers();
        } else {
            this.materialVAO = GL.VertexArray.create({
                name: baseName + ".materialVAO",
                program: GL.MeshDqs.materialProgram
            });
            this.materialVAO.attributes.aTexCoord.set({
                buffer: this.aTexCoord
            });
        }

        delete this.texCoords;
        delete this.texCoordBuf;
        delete this.texCoordMap;
        delete this.texNeighborMap;
        delete this.texDeltaBuf;
        delete this.texNeighborMap;
    },

    initTangentBuffers: function() {
        var context = App.context;
        var gl = context.gl;
        var mesh = this.mesh;
        var baseName = mesh.config.name + "." + this.group.id;

        var numTexCoords = this.numTexCoords;
        var offset = 0;
        var texIndex = [];
        var texNeighbors = [];
        var texDeltas = [];
        for (var i = 0; i < numTexCoords; ++i) {
            var rec = this.texCoords[i];
            var neighbors = this.texNeighborMap[i];
            var count = neighbors ? Math.floor(neighbors.tris.length / 2) : 0;
            texIndex.push(offset, count, rec.pi);
            if (count > 0) {
                offset += count;
                utils.append(texNeighbors, neighbors.tris);
                utils.append(texDeltas, neighbors.deltas);
            }
        }

        /*
         * The neighboring triangles:
         *	RG32UI(b, c) = uTexNeighbors[texUV(offset)]
         *	...
         *	RG32UI(b, c) = uTexNeighbors[texUV(offset + count - 1)]
         * @note a is the current vertex
         */
        var uTexNeighborsW = mesh.ARRAY_CHUNK;
        var uTexNeighborsH = Math.max(1, Math.ceil(offset / mesh.ARRAY_CHUNK));
        var texNeighborBuf = new Uint32Array(uTexNeighborsW * uTexNeighborsH * 2);
        texNeighborBuf.set(texNeighbors);
        this.uTexNeighbors = GL.Texture.create({
            name: baseName + ".uTexNeighbors",
            internalFormat: gl.RG32UI,
            type: gl.UNSIGNED_INT,
            width: uTexNeighborsW,
            height: uTexNeighborsH,
            format: gl.RG_INTEGER
        });
        this.uTexNeighbors.setData({
            srcData: texNeighborBuf
        });
        this.uTexNeighborsUniform = {
            textureUnit: 2,
            texture: this.uTexNeighbors,
            sampler: mesh.dataSampler
        };

        /*
         * The neighboring triangle UV deltas:
         *	RGBA32F(du1,dv1,du2,dv2) = uTexDeltas[texUV(offset)]
         *	...
         *	RGBA32F(du1,dv1,du2,dv2) = uTexDeltas[texUV(offset + count - 1)]
         */
        var uTexDeltasW = mesh.ARRAY_CHUNK;
        var uTexDeltasH = Math.max(1, Math.ceil(offset / mesh.ARRAY_CHUNK));
        var texDeltaBuf = new Float32Array(uTexDeltasW * uTexDeltasH * 4);
        texDeltaBuf.set(texDeltas);
        this.uTexDeltas = GL.Texture.create({
            name: baseName + ".uTexDeltas",
            internalFormat: gl.RGBA32F,
            type: gl.FLOAT,
            width: uTexDeltasW,
            height: uTexDeltasH,
            format: gl.RGBA
        });
        this.uTexDeltas.setData({
            srcData: texDeltaBuf
        });
        this.uTexDeltasUniform = {
            textureUnit: 3,
            texture: this.uTexDeltas,
            sampler: mesh.dataSampler
        };

        /*
         * The uTexNeighbors offset and count plus the vertex_index:
         *	uvec3(offset, count, vertex_index) = aTexIndex
         */
        this.aTexIndex = GL.Buffer.create({
            name: baseName + ".aTexIndex"
        });
        this.aTexIndex.setData({
            srcData: new Uint32Array(texIndex),
            usage: gl.STATIC_DRAW
        });

        /*
         * The transform feedback buffer for the computed tangents:
         *	vec4(Tx, Ty, Tz, H) = vTangent
         */
        this.vTangent = GL.Buffer.create({
            name: baseName + ".vTangent"
        });
        this.vTangent.setData({
            size: numTexCoords * 4 * 4,
            usage: gl.DYNAMIC_COPY
        });
        this.vTangentCopyParams = {
            readBuffer: this.vTangent,
            size: numTexCoords * 4 * 4
        };
        this.aTangent = GL.Buffer.create({
            name: baseName + ".aTangent"
        });
        this.aTangent.setData({
            size: numTexCoords * 4 * 4,
            usage: gl.DYNAMIC_DRAW
        });

        /*
         * The transform feedback buffer for the texture scales:
         *	flat(texture/model) = vTexScale
         */
        this.vTexScale = GL.Buffer.create({
            name: baseName + ".vTexScale"
        });
        this.vTexScale.setData({
            size: numTexCoords * 4,
            usage: gl.DYNAMIC_COPY
        });
        this.vTexScaleCopyParams = {
            readBuffer: this.vTexScale,
            size: numTexCoords * 4
        };
        this.aTexScale = GL.Buffer.create({
            name: baseName + ".aTexScale"
        });
        this.aTexScale.setData({
            size: numTexCoords * 4,
            usage: gl.DYNAMIC_DRAW
        });

        this.tangentsVAO = GL.VertexArray.create({
            name: baseName + ".tangentsVAO",
            program: GL.MeshDqs.tangentsProgram
        });
        this.tangentsVAO.attributes.aTexIndex.set({
            buffer: this.aTexIndex
        });

        this.tangentsFeedback = GL.TransformFeedback.create({
            name: baseName + ".tangentsFeedback"
        });

        this.materialTangentsVAO = GL.VertexArray.create({
            name: baseName + ".materialTangentsVAO",
            program: GL.MeshDqs.materialTangentsProgram
        });
        this.materialTangentsVAO.attributes.aTexCoord.set({
            buffer: this.aTexCoord
        });
        this.materialTangentsVAO.attributes.aTexScale.set({
            buffer: this.aTexScale
        });
        this.materialTangentsVAO.attributes.aTangent.set({
            buffer: this.aTangent
        });
    },

    initGroup: function(group) {
        var mesh = this.mesh;
        var config = mesh.config;
        var vertices = config.mesh.vertices;
        var uvs = config.mesh.uv_sets[this.material.material.uv_set].uvs;
        var polys = group.polygons;
        var uv_polys = group.uvs;
        utils.assert && utils.assert(
            polys.length == uv_polys.length,
            "material group polygon and uvs lengths mismatch",
            group, polys.length, uv_polys.length
        );

        var polygons = config.mesh.polygons;
        for (var i = 0, n = polys.length; i < n; ++i) {
            var poly = polygons[polys[i]];
            var uv_poly = uv_polys[i];
            utils.assert && utils.assert(
                poly.length == 4 && uv_poly.length == 4,
                "material group polygon and uv polygon must be quads",
                group, i, poly, uv_poly
            );
            this.initPoly(poly, vertices, uv_poly, uvs);
        }
    },

    initPoly: function(poly, vertices, uv_poly, uvs) {
	/*
         * Split the quads into triangles using the diagonal
         * having the shortest length.
         */
        var p0 = poly[0],
            p1 = poly[1],
            p2 = poly[2],
            p3 = poly[3];
	var uv0 = uv_poly[0],
            uv1 = uv_poly[1],
	    uv2 = uv_poly[2],
	    uv3 = uv_poly[3];
	var a = vertices[p0],
            b = vertices[p1],
	    c = vertices[p2],
	    d = vertices[p3];

        var dx = c[0] - a[0];
        var dy = c[1] - a[1];
        var dz = c[2] - a[2];
        var ac = dx*dx + dy*dy + dz*dz;

        dx = d[0] - b[0];
        dy = d[1] - b[1];
        dz = d[2] - b[2];
        var bd = dx*dx * dy*dy + dz*dz;

        if (ac <= bd) {
            /* split along ac */
            this.initTriangle(uvs, uv0, uv1, uv2, p0, p1, p2);
            this.initTriangle(uvs, uv2, uv3, uv0, p2, p3, p0);
        } else {
            /* split along bd */
            this.initTriangle(uvs, uv1, uv2, uv3, p1, p2, p3);
            this.initTriangle(uvs, uv3, uv0, uv1, p3, p0, p1);
        }
    },
    initTriangle: function(uvs, uv0, uv1, uv2, p0, p1, p2) {
        uv0 = this.texCoordAdd(uvs, uv0, p0);
        uv1 = this.texCoordAdd(uvs, uv1, p1);
        uv2 = this.texCoordAdd(uvs, uv2, p2);
        this.indices.push(uv0.index, uv1.index, uv2.index);
        if (!this.material.normalTexture) {
            /* only need tangent space if there's a normal map */
            return;
        }

        /* store precomputed duv1, duv2 instead of uv0,uv1,uv2 */
        var uv_tri = [uv0, uv1, uv2];
        this.texDeltaAdd(0, uv_tri);
        this.texDeltaAdd(1, uv_tri);
        this.texDeltaAdd(2, uv_tri);
    },
    texCoordAdd: function(uvs, uvi, pi) {
        var texCoordMap = this.texCoordMap;
        var texCoordBuf = this.texCoordBuf;
        var texCoords = this.texCoords;
        var rec = texCoordMap[uvi];
        if (rec == undefined) {
            var uv = uvs[uvi];
            /* remove the UDIM component */
            var u = uv[0];
            var v = uv[1];
            u = u - Math.floor(u);
            v = v - Math.floor(v);
            rec = {
                index: texCoords.length,
                pi: pi,
                u: u,
                v: v
            };
            texCoordMap[uvi] = rec;
            texCoords.push(rec);
            texCoordBuf.push(u, v, pi);
        } else {
            utils.assert && utils.assert(
                rec.pi == pi,
                "uv is mapped to multiple vertices"
            );
        }
        return rec;
    },
    texDeltaAdd: function(i, uv_tri) {
        var uv0 = uv_tri[i];
        var uv1 = uv_tri[(i + 1) % 3];
        var uv2 = uv_tri[(i + 2) % 3];

        var du1 = uv1.u - uv0.u;
        var dv1 = uv1.v - uv0.v;
        var du2 = uv2.u - uv0.u;
        var dv2 = uv2.v - uv0.v;
        var neighbors = this.texNeighborMap[uv0.index];
        if (!neighbors) {
            neighbors = this.texNeighborMap[uv0.index] = {
                tris: [],
                deltas: []
            };
        }
        neighbors.deltas.push(du1, dv1, du2, dv2);
        neighbors.tris.push(uv1.pi, uv2.pi);
    }
});
