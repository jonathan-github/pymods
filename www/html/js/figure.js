//utils.debug = 3;

utils.Material = utils.extend(utils.Object, {
    init: function(gl, app, model, material) {
	var diffuse = material.diffuse;
	if (diffuse) {
	    this.diffuseColor = diffuse.color;
	    var idx = diffuse.image;
	    if (idx != undefined) {
		this.diffuseTexture = app.textures[model.images[idx].id];
		this.diffuseTexture.update(gl);
	    }
	}
    },

    draw: function(gl, program) {
	if (program.attributes.uColor && this.diffuseColor) {
	    program.attributes.uColor.set(this.diffuseColor);
	}
	if (program.uniforms.uHasDiffuseTexture) {
	    if (this.diffuseTexture) {
		this.diffuseTexture.bindTexture(gl);
		program.uniforms.uHasDiffuseTexture.set(true);
	    } else {
		program.uniforms.uHasDiffuseTexture.set(false);
	    }
	}
    }
});

/**
 * Split the surface mesh into one or more WebGL buffers.
 * Since a WebGL element buffer can only hold up to 0xFFFF indices,
 * surfaces larger than that must be split into multiple buffers.
 */
utils.MeshBuffers = utils.extend(utils.Object, {
    init: function(gl, surface, group_index) {
	this.surface = surface;
	this.group_index = group_index;
	var group = surface.mesh.material_groups[group_index];
	var material = surface.mesh.materials[group.material];
	var indices = group.indices;
	var vertices = surface.mesh.vertices;
	var coords = surface.coords;
	var normals = surface.normals;
	var mode = surface.mode;
	var delta = (mode == gl.TRIANGLES ? 3 : /* gl.LINES */ 2);

	var uv_indices = group.uv_indices;
	var uvs = surface.mesh.uv_sets[material.uv_set].uvs;

	utils.assert && utils.assert(
	    coords.length == normals.length,
	    group.id + " coords/normals length mismatch"
	);
	utils.assert && utils.assert(
	    coords.length == 3 * vertices.length,
	    group.id + " coords/vertices length mismatch"
	);
	utils.assert && utils.assert(
	    normals.length == 3 * vertices.length,
	    group.id + " normals/vertices length mismatch"
	);
	utils.assert && utils.assert(
	    indices.length % delta == 0,
	    group.id + " indices is not a multiple of " + delta
	);

	/*
	 * A mesh vertex might have more than one texture coordinate, so construct the
	 * array buffers around the texture coordinates and duplicate mesh vertices
	 * as necessary.
	 */

	this.vertexMap = [];
	for (var i = 0, n = indices.length; i < n; ++i) {
	    var vi = indices[i];
	    var uvi = uv_indices[i];
	    utils.assert && utils.assert(
		this.vertexMap[uvi] == undefined || this.vertexMap[uvi] == vi,
		group.id + " uv coordinate maps to multiple vertices",
		[group, "i =", i, ", uvi =", uvi,
		 ", old =", this.vertexMap[uvi], ", p =", indices[this.vertexMap[uvi]],
		 ", new =", vi, ", p =", indices[vi]]
	    );
	    this.vertexMap[uvi] = vi;
	}

	var buffer = this.bufferInit();
	this.buffers = [buffer];
	for (i = 0, n = indices.length; i < n; ++i) {
	    if ((i % delta) == 0 &&
		buffer.count + delta > 0x10000) {
		// start a new element buffer
		buffer = this.bufferInit();
		buffer.offset = i;
		this.buffers.push(buffer);
	    }

	    var vi = indices[i];
	    var uvi = uv_indices[i];
	    var bi = buffer.vertexMap[uvi];
	    if (bi == undefined) {
		/* add vertex to buffer */
		bi = buffer.count++;
		buffer.vertexMap[uvi] = bi;
		var idx = vi * 3;
		buffer.coords.push(
		    coords[idx],
		    coords[idx + 1],
		    coords[idx + 2]
		);
		buffer.normals.push(
		    normals[idx],
		    normals[idx + 1],
		    normals[idx + 2]
		);

		/* add uv to buffer */
		var uv = uvs[uvi];
		buffer.uvs.push(uv[0], uv[1]);
	    }
	    buffer.indices.push(bi);
	}
	for (i = 0, n = this.buffers.length; i < n; ++i) {
	    if (utils.debug) {
		this.bufferValidate(this.buffers[i], group,
				    indices, coords, normals,
				    uv_indices, uvs);
	    }
	    this.bufferCreate(this.buffers[i], gl, mode, i);
	}
    },

    update: function() {
	for (var i = 0, n = this.buffers.length; i < n; ++i) {
	    this.bufferUpdate(this.buffers[i]);
	}
    },

    draw: function(gl, program) {
	var mesh = this.surface.mesh;
	var group = mesh.material_groups[this.group_index];
	var material = mesh.materials[group.material];
	material.ctx.draw(gl, program);
	for (var i = 0, n = this.buffers.length; i < n; ++i) {
	    this.bufferDraw(this.buffers[i], gl, program);
	}
    },

    bufferInit: function() {
	return {
	    offset: 0,
	    count: 0,
	    vertexMap: [],
	    coords: [],
	    normals: [],
	    indices: [],
	    uvs: []
	};
    },

    bufferValidate: function(buffer, group,
			     indices, coords, normals,
			     uv_indices, uvs) {
	for (var i = 0, n = buffer.indices.length; i < n; ++i) {
	    var bi = buffer.indices[i] * 3;
	    var bc0 = buffer.coords[bi];
	    var bc1 = buffer.coords[bi + 1];
	    var bc2 = buffer.coords[bi + 2];
	    var uvi = uv_indices[i + buffer.offset];
	    var vi = this.vertexMap[uvi];
	    var ci = vi * 3;
	    var c0 = coords[ci];
	    var c1 = coords[ci + 1];
	    var c2 = coords[ci + 2];
	    utils.assert && utils.assert(
		bc0 == c0 && bc1 == c1 && bc2 == c2,
		group.id + " buffer coord mismatch for index " + i,
		[bc0, bc1, bc2, c0, c1, c2]
	    );

	    var bn0 = buffer.normals[bi];
	    var bn1 = buffer.normals[bi + 1];
	    var bn2 = buffer.normals[bi + 2];
	    var n0 = normals[ci];
	    var n1 = normals[ci + 1];
	    var n2 = normals[ci + 2];
	    utils.assert && utils.assert(
		bn0 == n0 && bn1 == n1 && bn2 == n2,
		group.id + " buffer normal mismatch for index " + i,
		[bn0, bn1, bn2, n0, n1, n2]
	    );

	    bi = buffer.indices[i] * 2;
	    var bu = buffer.uvs[bi];
	    var bv = buffer.uvs[bi + 1];
	    var uv = uvs[uvi];
	    var u = uv[0];
	    var v = uv[1];
	    utils.assert && utils.assert(
		bu == u && bv == v,
		group.id + " buffer uv mismatch for index " + i,
		["uv validate", group.id, "i =", i, ", vi =", vi, ", bi =", bi/2,
		 ", uvi =", uvi, ", uv =", uv,
		 ", bu =", bu, ", bv =", bv]
	    );
	}
    },

    bufferCreate: function(buffer, gl, mode, idx) {
	var group = this.surface.mesh.material_groups[this.group_index];
	var id = group.id;
	buffer.coordsBuf = utils.ArrayBuffer3f.create(
	    gl, id + ".coords." + idx, buffer.coords
	);
	buffer.normalsBuf = utils.ArrayBuffer3f.create(
	    gl, id + ".normals." + idx, buffer.normals
	);
	buffer.uvsBuf = utils.ArrayBuffer2f.create(
	    gl, id + ".texCoords." + idx, buffer.uvs
	);
	buffer.indicesBuf = utils.ElementBuffer2i.create(
	    gl, id + ".indices." + idx, buffer.indices
	);
	buffer.indicesBuf.mode = mode;
    },

    bufferDraw: function(buffer, gl, program) {
	program.attributes.aCoord.set(buffer.coordsBuf);
	program.attributes.aNormal.set(buffer.normalsBuf);
	if (program.attributes.aTexCoord) {
	    program.attributes.aTexCoord.set(buffer.uvsBuf);
	}
	program.update(gl);
	buffer.indicesBuf.draw(gl);
    },

    bufferUpdate: function(buffer) {
	var group = this.surface.mesh.material_groups[this.group_index];
	var indices = group.indices;
	var coords = this.surface.coords;
	var normals = this.surface.normals;
	for (var i = 0, n = buffer.indices.length; i < n; ++i) {
	    var bi = buffer.indices[i] * 3;
	    var ci = indices[i + buffer.offset] * 3;
	    buffer.coords[bi] = coords[ci];
	    buffer.coords[bi + 1] = coords[ci + 1];
	    buffer.coords[bi + 2] = coords[ci + 2];

	    buffer.normals[bi] = normals[ci];
	    buffer.normals[bi + 1] = normals[ci + 1];
	    buffer.normals[bi + 2] = normals[ci + 2];
	}
	buffer.coordsBuf.set(buffer.coords);
	buffer.normalsBuf.set(buffer.normals);
    }
});

/**
 * Unpack [[a, b], ...] into [a, b, ...].
 */
utils.arrayUnpack2f = function(vec) {
    var n = vec.length;
    var unpacked = new Float32Array(n * 2);
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
utils.arrayUnpack3f = function(vec) {
    var n = vec.length;
    var unpacked = new Float32Array(n * 3);
    for (var i = 0, j = 0; i < n; ++i) {
	var rec = vec[i];
	unpacked[j++] = rec[0];
	unpacked[j++] = rec[1];
	unpacked[j++] = rec[2];
    }
    return unpacked;
};

/**
 * Line surface model
 */
utils.Surface = utils.extend(utils.Object, {
    init: function(gl, mode, app, mesh, color) {
	this.mode = mode;
	this.mesh = mesh;
	this.bonesInit(mesh.figure);
	this.dirty = true;

	var materials = mesh.materials;
	for (var i = 0, n = materials.length; i < n; ++i) {
	    var material = materials[i];
	    material.ctx = utils.Material.create(gl, app, mesh, material);
	}

	var vertices = mesh.vertices;
	var coords = utils.arrayUnpack3f(vertices);

	var polygons = mesh.polygons;
	var groups = mesh.material_groups;
	for (var i = 0, n = groups.length; i < n; ++i) {
	    var group = groups[i];
	    var polys = group.polygons;
	    var uvs = group.uvs;
	    utils.assert && utils.assert(
		polys.length == uvs.length,
		"length mismatch: polygons=" + polys.length + " and uvs=" + uvs.length
	    );
	    var indices = [];
	    var uv_indices = [];
	    for (var j = 0, m = polys.length; j < m; ++j) {
		var poly = polygons[polys[j]];
		var uv_poly = uvs[j];
		this.initPoly(gl, mode, poly, indices, uv_poly, uv_indices);
	    }
	    group.indices = indices;
	    group.uv_indices = uv_indices;
	}

	this.mvMatrix = mat4.create();
	this.nMatrix = mat4.create();
	this.color = color;
	this.coords = coords;
	this.normalsUpdate(coords);
	this.bounds = utils.boundingBox(coords);
	for (i = 0, n = groups.length; i < n; ++i) {
	    var group = groups[i];
	    group.buffers = utils.MeshBuffers.create(gl, this, i);
	}
	return this;
    },

    distance: function(a, b) {
	var vertices = this.mesh.vertices;
	return vec3.distance(vertices[a], vertices[b]);
    },

    initPoly: function(gl, mode, poly, indices, uv_poly, uv_indices) {
	var l = poly.length;
	var n = 0;

	utils.assert && utils.assert(
	    l == 3 || l == 4,
	    "unsupported polygon size: " + l
	);
	utils.assert && utils.assert(
	    l == uv_poly.length,
	    "uv polygon size is " + uv_poly.length + ", but expected " + l
	);
	utils.assert && utils.assert(
	    mode == gl.LINES || mode == gl.TRIANGLES,
	    "unsupported mode: " + mode
	);

	switch (mode) {
	case gl.LINES:
	    if (l == 4) {
		indices.push(
		    poly[0], poly[1],
		    poly[1], poly[2],
		    poly[2], poly[3],
		    poly[3], poly[0]
		);
		uv_indices.push(
		    uv_poly[0], uv_poly[1],
		    uv_poly[1], uv_poly[2],
		    uv_poly[2], uv_poly[3],
		    uv_poly[3], uv_poly[0]
		);
		n = 8;
	    } else if (l == 3) {
		indices.push(
		    poly[0], poly[1],
		    poly[1], poly[2],
		    poly[2], poly[0]
		);
		uv_indices.push(
		    uv_poly[0], uv_poly[1],
		    uv_poly[1], uv_poly[2],
		    uv_poly[2], uv_poly[0]
		);
		n = 6;
	    }
	    break;
	case gl.TRIANGLES:
	    if (l == 4) {
		// split quad into tris along the shortest diagonal
		var a = poly[0],
		    b = poly[1],
		    c = poly[2],
		    d = poly[3];
		var d1 = this.distance(a, c);
		var d2 = this.distance(b, d);
		if (d1 <= d2) {
		    indices.push(
			a, b, c,
			c, d, a
		    );
		    uv_indices.push(
			uv_poly[0], uv_poly[1], uv_poly[2],
			uv_poly[2], uv_poly[3], uv_poly[0]
		    );
		} else {
		    indices.push(
			b, c, d,
			d, a, b
		    );
		    uv_indices.push(
			uv_poly[1], uv_poly[2], uv_poly[3],
			uv_poly[3], uv_poly[0], uv_poly[1]
		    );
		}
		n = 6;
	    } else if (l == 3) {
		utils.append(indices, poly);
		utils.append(uv_indices, uv_poly);
		n = 3;
	    }
	    break;
	}
	return n;
    },

    normalMatrix: function(program) {
	var mvMatrix = this.mvMatrix;
	var nMatrix = this.nMatrix;

	mat4.multiply(mvMatrix, program.uniforms.vMatrix.value, this.mMatrix);
	mat4.invert(mvMatrix, mvMatrix);
	mat4.transpose(nMatrix, mvMatrix);

	program.uniforms.nMatrix.set(nMatrix);
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

    draw: function(gl, program) {
	this.meshUpdate();
	if (program.uniforms.mMatrix && this.mMatrix) {
	    program.uniforms.mMatrix.set(this.mMatrix);
	    if (program.uniforms.nMatrix && this.nMatrix) {
		this.normalMatrix(program);
	    }
	}
	if (program.uniforms.uColor && this.color) {
	    program.uniforms.uColor.set(this.color);
	}
	if (program.attributes.aColor && this.colors) {
	    program.attributes.aColor.set(this.colors);
	}
	var groups = this.mesh.material_groups;
	for (var i = 0, n = groups.length; i < n; ++i) {
	    var group = groups[i];
	    group.buffers.draw(gl, program);
	}
    },

    bonesInit: function(bones) {
	this.vertexWeights = [];
	this.boneMap = {};
	this.boneInit(bones);

	/* normalize the vertex weights */
	for (var i = 0, n = this.vertexWeights.length; i < n; ++i) {
	    var vrec = this.vertexWeights[i];
	    if (vrec != undefined) {
		var sum = 0;
		for (var j = 0, m = vrec.length; j < m; ++j) {
		    sum += vrec[j][1];
		}
		if (m > 0 && sum != 1) {
		    for (j = 0, m = vrec.length; j < m; ++j) {
			vrec[j][1] /= sum;
		    }
		}
	    }
	}
	var missing = 0;
	var vertices = this.mesh.vertices;
	for (i = 0, n = vertices.length; i < n; ++i) {
	    if (this.vertexWeights[i] == undefined) {
		++missing;
	    }
	}
	if (missing > 0) {
	    console.log("missing " + missing + " vertex node weights");
	}
    },

    boneInit: function(bone) {
	this.boneMap[bone.id] = bone;

	var weights = bone.node_weights;
	if (weights) {
	    for (var i = 0, n = weights.length; i < n; ++i) {
		var rec = weights[i];
		var idx = rec[0];
		var weight = rec[1];
		var vrec = this.vertexWeights[idx];
		if (vrec == undefined) {
		    vrec = this.vertexWeights[idx] = [];
		}
		vrec.push([bone, weight]);
	    }
	}

	var mToLocal = mat4.create();
	var mFromLocal = mat4.create();
	var origin = bone.center_point;
	var t = vec3.create();
	vec3.negate(t, origin);
	mat4.translate(mToLocal, mToLocal, t);
	mat4.translate(mFromLocal, mFromLocal, origin);
	bone.mToLocal = mToLocal;
	bone.mFromLocal = mFromLocal;
	bone.mTransform = mat4.create();
	bone.m = mat4.create();
	bone.q = dquat.create();

	var children = bone.children;
	if (children) {
	    for (var i = 0, n = children.length; i < n; ++i) {
		var child = children[i];
		child.parent = bone;
		this.boneInit(child);
	    }
	}
    },

    boneSet: function(name, m) {
	var bone = this.boneMap[name];
	bone.mTransform = m;
	this.boneUpdate(bone);
	this.dirty = true;
    },

    boneUpdate: function(bone) {
	var m = bone.m;
	mat4.multiply(m, bone.mTransform, bone.mToLocal);
	mat4.multiply(m, bone.mFromLocal, m);

	// dquat
	var q = bone.q;
	dquat.fromMat4(q, m);
	if (bone.parent) {
	    dquat.multiply(q, bone.parent.q, q);
	    dquat.normalize(q, q);
	}

	if (bone.parent) {
	    // only needed for vertexUpdateLBS
	    mat4.multiply(m, bone.parent.m, m);
	}
	if (utils.test) {
	    // verify that q == m
	    var mq = mat4.create();
	    dquat.toMat4(mq, q);
	    utils.test.mat4Eq(m, mq);
	}

	var children = bone.children;
	if (children) {
	    for (var i = 0, n = children.length; i < n; ++i) {
		var child = children[i];
		this.boneUpdate(child);
	    }
	}
    },

    meshUpdate: function() {
	if (!this.dirty) {
	    return;
	}
	var coords = [];
	var vertices = this.mesh.vertices;
	var vertexWeights = this.vertexWeights;
	var first = true;
	for (var i = 0, n = vertices.length; i < n; ++i) {
	    var p = vertices[i];
	    var weights = vertexWeights[i];
	    if (weights != undefined) {
		//p = this.vertexUpdateLBS(weights, p);
		p = this.vertexUpdateDQS(weights, p);
	    }
	    coords.push(p[0], p[1], p[2]);
	}
	this.normalsUpdate(coords);
	this.coords = coords;
	var groups = this.mesh.material_groups;
	for (i = 0, n = groups.length; i < n; ++i) {
	    groups[i].buffers.update();
	}
	this.dirty = false;
    },

    vertexUpdateLBS: function(weights, p) {
	var pt = vec3.create();
	var pt2 = vec3.create();
	var psum = vec3.create();
	for (var i = 0, n = weights.length; i < n; ++i) {
	    var vrec = weights[i];
	    var bone = vrec[0];
	    var weight = vrec[1];

	    vec3.transformMat4(pt, p, bone.m);
	    vec3.scale(pt, pt, weight);
	    vec3.add(psum, psum, pt);
	}
	return psum;
    },

    vertexUpdateDQS: function(weights, p) {
	var q = dquat.create();
	var q0;
	var qsum;
	for (var i = 0, n = weights.length; i < n; ++i) {
	    var vrec = weights[i];
	    var bone = vrec[0];
	    var weight = vrec[1];

	    if (i == 0) {
		q0 = bone.q;
	    } else {
		var d = dquat.dot(q0, bone.q);
		if (d < 0) {
		    weight = -weight;
		}
	    }

	    dquat.scale(q, bone.q, weight);
	    if (qsum) {
		dquat.add(qsum, qsum, q);
	    } else {
		qsum = dquat.clone(q);
	    }
	}
	dquat.normalize(qsum, qsum);
	var m = mat4.create();
	dquat.toMat4(m, qsum);
	var pt = vec3.create();
	vec3.transformMat4(pt, p, m);
	return pt;
    },

    normalsUpdate: function(coords) {
	var normals = [];
	var groups = this.mesh.material_groups;
	var polygons = this.mesh.polygons;
	for (var i = 0, n = groups.length; i < n; ++i) {
	    var polys = groups[i].polygons;
	    for (var j = 0, m = polys.length; j < m; ++j) {
		var poly = polygons[polys[j]];
		var normal = this.surfaceNormal(coords, poly);
		for (var k = 0, l = poly.length; k < l; ++k) {
		    this.normalUpdate(poly[k], normal, normals);
		}
	    }
	}
	this.normals = this.normalsAvg(normals);
    },

    /**
     * Compute the surface normal for an indexed polygon.
     * https://www.opengl.org/wiki/Calculating_a_Surface_Normal
     * @param {Number[]} coords the flattened vertices array
     * @param {Integer[]} poly the vertex indices for the polygon
     * @returns {vec3} the surface normal
     */
    surfaceNormal: function(coords, poly) {
	var normal = vec3.create();
	var n = poly.length;
	for (var i = 0; i < n; ++i) {
	    var ci = poly[i] * 3;
	    var ni = poly[(i + 1) % n] * 3;

	    var cx = coords[ci];
	    var cy = coords[ci + 1];
	    var cz = coords[ci + 2];

	    var nx = coords[ni];
	    var ny = coords[ni + 1];
	    var nz = coords[ni + 2];

	    normal[0] += (cy - ny) * (cz + nz);
	    normal[1] += (cz - nz) * (cx + nx);
	    normal[2] += (cx - nx) * (cy + ny);
	}
	vec3.normalize(normal, normal);
	return normal;
    },

    normalUpdate: function(index, normal, normals) {
	var sum = normals[index];
	if (!sum) {
	    normals[index] = vec3.clone(normal);
	} else {
	    vec3.add(sum, sum, normal);
	}
    },

    normalsAvg: function(normals) {
	var avgs = [];
	var missing = 0;
	for (var i = 0, n = this.mesh.vertices.length; i < n; ++i) {
	    var sum = normals[i];
	    if (!sum) {
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
});

var App = utils.extend(utils.App, {
    init: function() {
	this.initCanvas();
	var gl = this.gl;

	this.loader.batch({
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
	    skyBox: utils.AssetTextureCubeMap.create({
		debug: false,
		src: "lib/images/skybox_texture.jpg",
		crop: 2 // TBD: only need to crop specific sides
	    }),
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
		    uColor: utils.Uniform4f.create(),
		    uLightColor: utils.Uniform3f.create(),
		    uLightDirection: utils.Uniform3f.create(),
		    uAmbientColor: utils.Uniform3f.create(),
		    uHasDiffuseTexture: utils.Uniform1i.create(),
		    uDiffuseTexture: utils.Uniform1i.create()
		},
		attributes: {
		    aCoord: utils.AttributeBuffer.create(),
		    aNormal: utils.AttributeBuffer.create(),
		    aTexCoord: utils.AttributeBuffer.create()
		}
	    }),
	    hair: utils.AssetRequest.create({
		url: "lib/models/hair.json"
	    }),
	    figure: utils.AssetRequest.create({
		url: "lib/models/figure.json"
	    })
	});
	this.loadState = 'init';
	this.loader.load();
    },

    ready: function() {
	this.textureLoader = utils.AssetLoader.create({
	    loadMask: this.loadMask,
	    ready: this.texturesReady,
	    error: this.error,
	    scope: this
	});
	this.model = this.loader.cache.figure.responseJSON();
	var images = this.model.images;
	if (images) {
	    var batch = {};
	    for (var i = 0, n = images.length; i < n; ++i) {
		var image = images[i];
		var src = "lib/textures/" + image.image;
		var idx = src.lastIndexOf('.tif');
		if (idx > 0) {
		    // try to load a .png version
		    src = src.substring(0, idx) + '.png';
		}
		batch[image.id] = utils.AssetImage.create({
		    src: src
		});
	    }
	    this.textureLoader.batch(batch);
	}
	this.textureLoader.load();
    },

    texturesReady: function() {
	var gl = this.gl;

	this.shaderSkyBox = this.loader.cache.shaderSkyBox.program;
	this.shaderSkyBox.uniforms.vMatrix.set(mat4.create());

	this.skyBox = utils.SkyBox.create(gl);
	this.skyBox.mMatrix = mat4.create();
	this.skyBox.texture = utils.TextureSkyMap.extend(
	    { flipY: true },
	    gl, "skyBox", this.loader.cache.skyBox.textures
	);

	var uLightDirection = vec3.fromValues(0.85, 0.8,0.75);
	vec3.normalize(uLightDirection, uLightDirection);
	this.shaderSurface = this.loader.cache.shaderSurface.program;
	this.shaderSurface.uniforms.uLightColor.set([0.5, 0.5, 0.5]);
	this.shaderSurface.uniforms.uLightDirection.set(uLightDirection);
	this.shaderSurface.uniforms.uAmbientColor.set([0.4, 0.4, 0.4]);
	this.shaderSurface.uniforms.uHasDiffuseTexture.set(false);
	this.shaderSurface.uniforms.uDiffuseTexture.set(0);

	this.textures = {};
	for (var id in this.textureLoader.cache) {
	    var image = this.textureLoader.cache[id];
	    var texture = utils.Texture2D.extend(
		{ wrap_s: gl.REPEAT,
		  wrap_t: gl.REPEAT,
		  flipY: true },
		gl, id, image.image
	    );
	    //texture.update(gl);
	    this.textures[id] = texture;
	}
	this.textureLoader.cleanup();

	if (this.loader.cache.hair) {
	this.hair = utils.Surface.create(
	    gl,
	    //gl.LINES,
	    gl.TRIANGLES,
	    this,
	    this.loader.cache.hair.responseJSON(),
	    [1, 1, 1, 1]
	);
	}
	this.figure = utils.Surface.create(
	    gl,
	    //gl.LINES,
	    gl.TRIANGLES,
	    this,
	    this.model,
	    [1, 1, 1, 1]
	);

	var bounds = this.figure.bounds;
	console.log("bounds", bounds);
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
	var mMatrix = mat4.create();
	mat4.translate(mMatrix, mMatrix, [0, -2.5, -5]);
	//mat4.translate(mMatrix, mMatrix, [0, -3.75, -0.75]);
	var scale = 4 / bounds.ymax;
	//var scale = 4/size;
	mat4.scale(mMatrix, mMatrix, [scale, scale, scale]);
	if (this.hair) {
	    this.hair.mMatrix = mMatrix;
	}
	this.figure.mMatrix = mMatrix;

	var ang = utils.radians(60);
	var ry = mat4.create();
	mat4.rotateY(ry, ry, -ang);
	var rx = mat4.create();
	mat4.rotateX(rx, rx, -ang);
	var nrx = mat4.create();
	mat4.rotateX(nrx, nrx, ang);
	if (true) {
	this.figure.boneSet('lForearmBend', ry);
	this.figure.boneSet('lThighBend', rx);
	this.figure.boneSet('lShin', nrx);
	// TBD: move hair to match head
	//this.figure.boneSet('head', ry);
	//this.figure.boneSet('abdomenLower', nrx);
	}

	//gl.clearColor(0, 0, 0, 1);

	var vMatrix = mat4.create();
	this.vMatrixUpdate(vMatrix, vMatrix);
	utils.ModelController.init(this, center);
	utils.App.ready.call(this);
    },

    resize: function() {
	utils.App.resize.call(this);
	utils.ModelController.pMatrixUpdate();
    },

    pMatrixUpdate: function(pMatrix) {
	this.shaderSkyBox.uniforms.pMatrix.set(pMatrix);
	this.shaderSurface.uniforms.pMatrix.set(pMatrix);
    },
    vMatrixUpdate: function(vMatrix, vMatrixFixed) {
	this.shaderSkyBox.uniforms.vMatrix.set(vMatrixFixed);
	this.shaderSurface.uniforms.vMatrix.set(vMatrix);
    },
    mMatrixUpdate: function(mMatrix) {
	if (this.hair) {
	    this.hair.mMatrixUpdate(mMatrix);
	}
	this.figure.mMatrixUpdate(mMatrix);
    },

    render: function() {
	var gl = this.gl;

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	this.shaderSkyBox.useProgram(gl);
	this.skyBox.draw(gl, this.shaderSkyBox);

	gl.enable(gl.DEPTH_TEST);

	this.shaderSurface.useProgram(gl);
	gl.enable(gl.CULL_FACE);
	gl.cullFace(gl.BACK);
	this.figure.draw(gl, this.shaderSurface);
	if (this.hair) {
	    // some of the hair backfaces need to be displayed
	    gl.disable(gl.CULL_FACE);
	    this.hair.draw(gl, this.shaderSurface);
	}

	utils.debug = 0;
	window.requestAnimationFrame(this.render.bind(this));
    }
});
