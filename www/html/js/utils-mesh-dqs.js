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
 *    compute bone transforms and apply morphs
 *    output to uBones and aCoord GL buffers
 *  transform
 *    transform vertices using vertex/bone/weight map
 *    output to uCoords GL texture
 *  normals
 *    recompute vertex normals
 *    output to uNormals GL texture
 *
 * textureUnit assignments:
 *	uCoords:    0
 *	uNormals:   1
 *	uWeights:   2
 *	uBones:     3
 *	uNeighbors: 4
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
    initAssets: function(context, loader) {
        var gl = context.gl;
        var defines = {
            ARRAY_CHUNK: this.ARRAY_CHUNK + 'u'
        };
        this.shaderLoader = GL.ShaderLoader.create(loader, {
            shaders: [
                { name: "shaders/mesh-dqs.inc",
                  type: "#include" },
                { name: "shaders/mesh-dqs.vert",
                  type: gl.VERTEX_SHADER,
                  defines: defines },
                { name: "shaders/mesh-dqs.frag",
                  type: gl.FRAGMENT_SHADER,
                  defines: defines },
                { name: "shaders/mesh-normals.vert",
                  type: gl.VERTEX_SHADER,
                  defines: defines },
                { name: "shaders/mesh-normals-debug.vert",
                  type: gl.VERTEX_SHADER,
                  defines: defines },
                { name: "shaders/mesh-normals-debug.frag",
                  type: gl.FRAGMENT_SHADER,
                  defines: defines }
            ],
            programs: [
                { name: "transformApplyProgram",
                  vertexShader: "shaders/mesh-dqs.vert",
                  fragmentShader: "shaders/mesh-dqs.frag",
                  varyings: [
                      'vCoord'
                  ],
                  bufferMode: gl.SEPARATE_ATTRIBS },
                { name: "normalsComputeProgram",
                  vertexShader: "shaders/mesh-normals.vert",
                  fragmentShader: "shaders/mesh-dqs.frag",
                  varyings: [
                      'vNormal'
                  ],
                  bufferMode: gl.SEPARATE_ATTRIBS },
                { name: "normalsDebugProgram",
                  vertexShader: "shaders/mesh-normals-debug.vert",
                  fragmentShader: "shaders/mesh-normals-debug.frag" }
            ]
        });
    },

    /**
     * Create the shared asssets.
     * @static
     */
    readyAssets: function(context) {
        var gl = context.gl;
        this.shaderLoader.compile(context, this);
        this.shaderLoader = null;

        /* shared sampler to use for data textures */
        this.dataSampler = GL.Sampler.create(context, {
            name: "meshDqs.dataSampler",
            params: {
                MAG_FILTER: gl.NEAREST,
                MIN_FILTER: gl.NEAREST,
                WRAP_S: gl.CLAMP_TO_EDGE,
                WRAP_T: gl.CLAMP_TO_EDGE
            }
        });
    },

    /**
     * Initialize the per-mesh instance.
     * config = {
     *   name: <string>,
     *   mesh: <object>
     * }
     */
    init: function(context, config) {
        this.context = context;
        this.config = config;
        this.initMesh();
        this.initBones();
        this.initNeighbors();
        this.initDebug();
        return this;
    },

    initMesh: function() {
        var gl = this.context.gl;
        var mesh = this.config.mesh;
        var numVertices = mesh.vertices.length;
        this.numVertices = numVertices;

        // unpack the vertices
        this.coords = utils.arrayUnpack3f(mesh.vertices);
        this.coordsBase = new Float32Array(this.coords);

        /*
         * aCoord attribute for the vertex's pre-transformed coordinates
         *	x = aCoord[vertex_index * 3]
         *	y = aCoord[vertex_index * 3 + 1]
         *	z = aCoord[vertex_index * 3 + 2]
         */
        this.aCoord = GL.Buffer.create(this.context, {
            name: this.config.name + ".aCoord"
        });
        this.aCoordUpdate ={
            srcData: this.coords,
            usage: gl.DYNAMIC_READ
        };
        this.aCoord.setData(this.aCoordUpdate);
        this.aCoordBuf = {
            buffer: this.aCoord
        };

        /*
         * uCoords texture for accessing the vertex's transformed vertex coordinates
         *	RGB32F(x,y,z) = uCoords[texUV(vertex_index)]
         */
        var uCoordsW = this.ARRAY_CHUNK;
        var uCoordsH = Math.ceil(numVertices / this.ARRAY_CHUNK);
        this.uCoords = GL.Texture.create(this.context, {
            name: this.config.name + ".uCoords",
            internalFormat: gl.RGB32F,
            type: gl.FLOAT,
            width: uCoordsW,
            height: uCoordsH,
            format: gl.RGB
        });
        this.uCoordsTex = {
            textureUnit: 0,
            texture: this.uCoords,
            sampler: this.dataSampler
        };

        /*
         * vCoord varying for receving the transformed vertices
         *	x = vCoord[vertex_index * 3]
         *	y = vCoord[vertex_index * 3 + 1]
         *	z = vCoord[vertex_index * 3 + 2]
         * @note vCoord is padded out to be the same size as uCoords
         */
        this.vCoord = GL.Buffer.create(this.context, {
            name: this.config.name + ".vCoord"
        });
        this.vCoord.setData({
            size: uCoordsW * uCoordsH * 3 * 4,
            usage: gl.DYNAMIC_READ
        });
        this.vCoordCopyBuffer = {
            buffer: this.vCoord
        };

        this.coordsOut = new Float32Array(this.numVertices * 3);
        this.coordsOutCopyBuffer = {
            target: gl.COPY_READ_BUFFER,
            dstData: this.coordsOut
        };

        /*
         * aWeightIndex attribute for accessing the vertex's uWeight entries
         *	UNSIGNED_INT_VEC2(offset, count) = aWeightIndex[vertex_index]
         */
        this.aWeightIndex = GL.Buffer.create(this.context, {
            name: this.config.name + ".aWeightIndex"
        });
        var index = mesh.vertex_weights.index;
        this.aWeightIndex.setData({
            srcData: new Uint32Array(index),
            usage: gl.STATIC_READ
        });
        this.aWeightIndexBuf = {
            buffer: this.aWeightIndex
        };
        
        /*
         * uWeights texture for accessing the vertex's array of (bone, weight) entries
         *	RG32F(bone, weight) = uWeights[texUV(offset)]
         *      ...
         *	RG32F(bone, weight) = uWeights[texUV(offset + count - 1)]
         */
        var weights = mesh.vertex_weights.weights;
        var numWeights = weights.length / 2;
        var uWeightsW = this.ARRAY_CHUNK;
        var uWeightsH = Math.ceil(numWeights / this.ARRAY_CHUNK);
        this.uWeights = GL.Texture.create(this.context, {
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
        this.uWeightsTex = {
            textureUnit: 2,
            texture: this.uWeights,
            sampler: this.dataSampler
        };

        this.coordsFeedback = GL.TransformFeedback.create(this.context, {
            name: this.config.name + ".coordsFeedback"
        });
        this.normalsFeedback = GL.TransformFeedback.create(this.context, {
            name: this.config.name + ".normalsFeedback"
        });
    },

    initBones: function() {
        var gl = this.context.gl;
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
         * uBones texture for accessing the bone's dual quarternion
         *	RGBA32F(rx,ry,rz,rw) = uBones[0, bone_index]
         *	RGBA32F(dx,dy,dz,dw) = uBones[1, bone_index]
         */
        var uBonesW = 2;
        var uBonesH = numBones;
        this.uBones = GL.Texture.create(this.context, {
            name: this.config.name + ".uBones",
            internalFormat: gl.RGBA32F,
            type: gl.FLOAT,
            width: uBonesW,
            height: uBonesH,
            format: gl.RGBA
        });
        // uBones uniform parameters
        this.uBonesTex = {
            textureUnit: 3,
            texture: this.uBones,
            sampler: this.dataSampler
        };
        // uBones bufferSubData parameters
        this.uBonesUpdate ={
            srcData: this.boneBuf
        };
        this.uBones.setData(this.uBonesUpdate);
    },

    initBone: function(bone, parent) {
        bone.parent = parent;
        bone.m = mat4.create();
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
        var gl = this.context.gl;

        /* for each vertex, get its neighboring polygons */
        var polygons = this.config.mesh.polygons;
        var n = polygons.length;
        var neighborMap = {};
        var count = 0;
        for (var i = 0; i < n; ++i) {
            var poly = polygons[i];
            var m = poly.length;
            if (m != 4) {
                console.log(
                    config.name,
                    "poly is not a quad",
                    i, poly
                );
                continue;
            }
            for (var j = 0; j < m; ++j) {
                var v = poly[j];
                var neighbors = neighborMap[v];
                if (!neighbors) {
                    neighborMap[v] = [poly];
                } else {
                    neighbors.push(poly);
                }
                ++count;
            }
        }

        /*
         * uNeighbors texture for accessing the vertex's neighbor polygons
         *	RGBA32UI(p0,p1,p2,p3) = uNeighbors[texUV(offset)]
         *	..
         *	RGBA32UI(p0,p1,p2,p3) = uNeighbors[texUV(offset + count - 1)]
         */
        var uNeighborsW = this.ARRAY_CHUNK;
        var uNeighborsH = Math.ceil(count / this.ARRAY_CHUNK);
        var indexBuf = new Uint32Array(this.numVertices * 2);
        var neighborBuf = new Uint32Array(uNeighborsW * uNeighborsH * 4);
        var offset = 0;
        var ii = 0, ni = 0;
        for (i = 0, n = this.numVertices; i < n; ++i) {
            var neighbors = neighborMap[i];
            var m = neighbors ? neighbors.length : 0;
            if (m == 0) {
                console.error("vertex has no neighbors", i);
            }
            indexBuf[ii++] = offset;
            indexBuf[ii++] = m;
            offset += m;
            for (var j = 0; j < m; ++j) {
                var poly = neighbors[j];
                neighborBuf[ni++] = poly[0];
                neighborBuf[ni++] = poly[1];
                neighborBuf[ni++] = poly[2];
                neighborBuf[ni++] = poly[3];
            }
        }
        this.uNeighbors = GL.Texture.create(this.context, {
            name: this.config.name + ".uNeighbors",
            internalFormat: gl.RGBA32UI,
            type: gl.UNSIGNED_INT,
            width: uNeighborsW,
            height: uNeighborsH,
            format: gl.RGBA_INTEGER
        });
        this.uNeighbors.setData({
            srcData: neighborBuf
        });
        this.uNeighborsTex = {
            textureUnit: 4,
            texture: this.uNeighbors,
            sampler: this.dataSampler
        };

        /*
         * aNeighborIndex attribute for accessing the vertex's uNeighbor entries
         *	UNSIGNED_INT_VEC2(offset, count) = aNeighborIndex[vertex_index]
         */
        this.aNeighborIndex = GL.Buffer.create(this.context, {
            name: this.config.name + ".aNeighborIndex"
        });
        this.aNeighborIndex.setData({
            srcData: indexBuf,
            usage: gl.STATIC_READ
        });
        this.aNeighborIndexBuf = {
            buffer: this.aNeighborIndex
        };

        utils.debug && console.log(
            this.uNeighbors.name,
            "polygons=" + polygons.length,
            "size=" + count,
            "width=" + uNeighborsW,
            "height=" + uNeighborsH,
            "min(count)=" + utils.arrayMin(indexBuf, /*offset*/1, /*stride*/2),
            "max(count)=" + utils.arrayMax(indexBuf, /*offset*/1, /*stride*/2)
        );

        /*
         * uNormals texture for accessing the computed vertex normals
         *	RGB32F(x,y,z) = uCoords[texUV(vertex_index)]
         */
        var uNormalsW = this.ARRAY_CHUNK;
        var uNormalsH = Math.ceil(this.numVertices / this.ARRAY_CHUNK);
        this.uNormals = GL.Texture.create(this.context, {
            name: this.config.name + ".uNormals",
            internalFormat: gl.RGB32F,
            type: gl.FLOAT,
            width: uNormalsW,
            height: uNormalsH,
            format: gl.RGB
        });
        this.uNormalsTex = {
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
        this.vNormal = GL.Buffer.create(this.context, {
            name: this.config.name + ".vNormal"
        });
        this.vNormal.setData({
            size: uNormalsW * uNormalsH * 3 * 4,
            usage: gl.DYNAMIC_READ
        });
        this.vNormalCopyBuffer = {
            buffer: this.vNormal
        };

        this.normals = new Float32Array(this.numVertices * 3);
        this.normalsCopyBuffer = {
            target: gl.COPY_READ_BUFFER,
            dstData: this.normals
        };
    },

    initDebug: function() {
        var gl = this.context.gl;
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
        this.debugIndices = GL.Buffer.create(this.context, {
            name: this.config.name + ".debugIndices",
            target: gl.ELEMENT_ARRAY_BUFFER
        });
        this.debugIndices.setData({
            srcData: new Uint32Array(indices),
            usage: gl.STATIC_DRAW
        });
    },

    transformApply: function() {
        var gl = this.context.gl;
        var program = this.transformApplyProgram;

        program.uniforms.uBones.set(this.uBonesTex);
        program.uniforms.uWeights.set(this.uWeightsTex);
        program.attributes.aCoord.set(this.aCoordBuf).dirty = true;
        program.attributes.aWeightIndex.set(this.aWeightIndexBuf).dirty = true;
        program.flush();

        program.varyings.vCoord.bufferBase(this.vCoord);
        this.coordsFeedback.begin(program, gl.POINTS);
        this.context.drawArrays(gl.POINTS, 0, this.numVertices);
        this.coordsFeedback.end();

        // copy vCoord to uCoords
        this.uCoords.copyBuffer(this.vCoordCopyBuffer);

        if (false && utils.debug) {
            // copy vCoord to coordsOut
            this.vCoord.getBufferSubData(this.coordsOutCopyBuffer);
            utils.debug && console.log(
                this.config.name,
                "coordsOut",
                this.coordsOut
            );
        }
    },

    normalsCompute: function() {
        var gl = this.context.gl;
        var program = this.normalsComputeProgram;

        program.uniforms.uCoords.set(this.uCoordsTex);
        program.uniforms.uNeighbors.set(this.uNeighborsTex);
        program.attributes.aNeighborIndex.set(this.aNeighborIndexBuf).dirty = true;
        program.flush();

        program.varyings.vNormal.bufferBase(this.vNormal);
        this.normalsFeedback.begin(program, gl.POINTS);
        this.context.drawArrays(gl.POINTS, 0, this.numVertices);
        this.normalsFeedback.end();

        // copy vNormal to uNormals
        this.uNormals.copyBuffer(this.vNormalCopyBuffer);

        if (false && utils.debug) {
            // copy vCoord to normals
            this.vNormal.getBufferSubData(this.normalsCopyBuffer);
            utils.debug && console.log(
                this.config.name,
                "normals",
                this.normals
            );
        }
    },

    animate: function(sampler, t) {
        this.controlBuf.set(this.controlInitBuf);
        this.coords.set(this.coordsBase);
        sampler.output(t);
        var bones = this.bones;
        for (var i = 0, n = bones.length; i < n; ++i) {
            this.boneTransformLocal(bones[i]);
        }
	this.boneTransformGlobal(this.config.mesh.figure);
        this.uBones.setData(this.uBonesUpdate);
        this.aCoord.setData(this.aCoordUpdate);
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
	} else {
            dquat.copy(dq, bone.ldq);
        }
        dquat.normalize(dq, dq);

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
