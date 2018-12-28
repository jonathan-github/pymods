
utils.MATERIAL_MATTE = {
    uColor: ['diffuseColor', [1.0, 1.0, 1.0]],
    uAmbientColor: ['ambientColor', [0.4, 0.4, 0.4]],
    uLightColor: ['lightColor', [0.5, 0.5, 0.5]],
    uSpecularColor: ['specularColor', [0.35, 0.45, 0.5]],
    uShininess: ['shininess', 3.0],
    uTranslucent: ['translucent', false],
    uSkin: ['skin', false]
};

utils.MATERIAL_SKIN = {
    uColor: ['diffuseColor', [1.0, 1.0, 1.0]],
    uAmbientColor: ['ambientColor', [0.4, 0.4, 0.4]],
    uLightColor: ['lightColor', [0.4, 0.4, 0.4]],
    //uSpecularColor: ['specularColor', [0.25, 0.35, 0.4]],
    uSpecularColor: ['specularColor', [0.7, 0.7, 0.7]],
    uShininess: ['shininess', 0.0],
    uTranslucent: ['translucent', false],
    uSkin: ['skin', true]
};

utils.MATERIAL_SHINY = {
    uColor: ['diffuseColor', [1.0, 1.0, 1.0]],
    uAmbientColor: ['ambientColor', [0.8, 0.8, 0.8]],
    uLightColor: ['lightColor', [1.0, 1.0, 1.0]],
    //uLightColor: ['lightColor', [0.5, 0.5, 0.5]],
    uSpecularColor: ['specularColor', [1.0, 1.0, 1.0]],
    uShininess: ['shininess', 25.0],
    //uShininess: ['shininess', 0.5],
    uTranslucent: ['translucent', false],
    uSkin: ['skin', false]
};

utils.MATERIAL_TRANSLUCENT = utils.extend(utils.MATERIAL_SHINY, {
    uTranslucent: ['translucent', true]
});

utils.MATERIAL_SCLERA = {
    uColor: ['diffuseColor', [1.0, 1.0, 1.0]],
    uAmbientColor: ['ambientColor', [0.8, 0.8, 0.8]],
    uLightColor: ['lightColor', [1.0, 1.0, 1.0]],
    uSpecularColor: ['specularColor', [1.0, 1.0, 1.0]],
    //uShininess: ['shininess', 25.0],
    uShininess: ['shininess', 1.0],
    uTranslucent: ['translucent', false],
    uSkin: ['skin', false]
};

utils.MATERIAL_IRIS = {
    uColor: ['diffuseColor', [1.0, 1.0, 1.0]],
    uAmbientColor: ['ambientColor', [0.8, 0.8, 0.8]],
    uLightColor: ['lightColor', [1.0, 1.0, 1.0]],
    uSpecularColor: ['specularColor', [1.0, 1.0, 1.0]],
    uShininess: ['shininess', 5.0],
    uTranslucent: ['translucent', false],
    uSkin: ['skin', false]
};

utils.MATERIAL_EYE_TRANSLUCENT = {
    uColor: ['diffuseColor', [1.0, 1.0, 1.0]],
    uAmbientColor: ['ambientColor', [0.8, 0.8, 0.8]],
    uLightColor: ['lightColor', [1.0, 1.0, 1.0]],
    uSpecularColor: ['specularColor', [1.0, 1.0, 1.0]],
    uShininess: ['shininess', 25.0],
    //uShininess: ['shininess', 2.0],
    uTranslucent: ['translucent', true],
    uSkin: ['skin', false]
};

utils.MATERIALS = {
    //'Cornea-1': utils.MATERIAL_TRANSLUCENT,
    //'EyeMoisture-1': utils.MATERIAL_EYE_TRANSLUCENT,
    'Irises-1': utils.MATERIAL_IRIS,
    //'Pupils-1': utils.MATERIAL_MATTE,
    'Sclera-1': utils.MATERIAL_SCLERA,

    // skin
    'Face-1': utils.MATERIAL_SKIN,
    'Lips-1': utils.MATERIAL_SKIN,
    'Ears-1': utils.MATERIAL_SKIN,
    'Legs-1': utils.MATERIAL_SKIN,
    'Torso-1': utils.MATERIAL_SKIN,
    'Arms-1': utils.MATERIAL_SKIN
};

/**
 * Manage material-based settings.
 */
utils.Material = utils.extend(utils.Object, {
    DRAW_ORDER: {
	// Krayon hair
	'Scalp-1': 1,
	'Under-1': 2,
	'Over-1': 3,
	'BunShort-1': 4,
	'BunLong-1': 5,
	'SideBurn-1': 6,

	// Razor-Cut Bob hair
	'Cap1': 1,
	'Bob-1': 2,
	'Bob-Thin-1': 3,
	'Bangs-1': 4,
	'Bangs-Thin-1': 5
    },

    TRANSLUCENT: {
	'EyeMoisture-1': true,
	'Cornea-1': true
    },

    SHINY: {
	'Cornea-1': true,
	'EyeMoisture-1': true,
	'Irises-1': true,
	'Pupils-1': true,
	'Sclera-1': true
    },

    UNIFORMS: {
	'Sclera-1': {
	    uColor: ['diffuseColor', [1.0, 1.0, 1.0]],
	    uAmbientColor: ['ambientColor', [0.8, 0.8, 0.8]],
	    uLightColor: ['lightColor', [1.0, 1.0, 1.0]],
	    uSpecularColor: ['specularColor', [1.0, 1.0, 1.0]],
	    //uShininess: ['shininess', 25.0],
	    uShininess: ['shininess', 0.5],
	    uTranslucent: ['translucent', false]
	}
    },

    UNIFORMS_MATTE: {
	uColor: ['diffuseColor', [1.0, 1.0, 1.0]],
	uAmbientColor: ['ambientColor', [0.4, 0.4, 0.4]],
	uLightColor: ['lightColor', [0.5, 0.5, 0.5]],
	uSpecularColor: ['specularColor', [0.35, 0.45, 0.5]],
	uShininess: ['shininess', 3.0],
	uTranslucent: ['translucent', false]
    },
    UNIFORMS_SHINY: {
	uColor: ['diffuseColor', [1.0, 1.0, 1.0]],
	uAmbientColor: ['ambientColor', [0.8, 0.8, 0.8]],
	//uAmbientColor: ['ambientColor', [0.4, 0.4, 0.4]],
	uLightColor: ['lightColor', [1.0, 1.0, 1.0]],
	//uLightColor: ['lightColor', [0.5, 0.5, 0.5]],
	uSpecularColor: ['specularColor', [1.0, 1.0, 1.0]],
	uShininess: ['shininess', 25.0],
	//uShininess: ['shininess', 0.5],
	uTranslucent: ['translucent', false]
    },

    init: function(gl, mesh, material, library) {
	this.id = material.id;
	this.disabled = false;
	this.translucent = this.TRANSLUCENT[material.id] || false;
	//this.drawOrder = this.DRAW_ORDER[material.id] || 0;
	this.drawOrder = 0;

	var diffuse = material.diffuse;
	if (diffuse) {
	    this.diffuseColor = diffuse.color;
	    var texConfig = {
		textureUnit: 0,
		mipMaps: true
	    };
	    if (this.glVersion >= 2 && false) {
		/* doesn't seem to do anything */
		texConfig.internalFormat = gl.RGB8;
		texConfig.format = gl.SRGB8;
	    }
	    this.diffuseTexture = this.textureGet(gl, mesh, library, diffuse.image, texConfig);
	}

	var normalMap = material.normalMap;
	if (normalMap) {
	    this.normalTexture = this.textureGet(gl, mesh, library, normalMap.image, {
		textureUnit: 1,
		mipMaps: true
	    });
	}

	var bumpMap = material.bumpMap;
	if (bumpMap) {
	    this.bumpTexture = this.textureGet(gl, mesh, library, bumpMap.image, {
		textureUnit: 2,
		mipMaps: true
	    });
	    if (this.bumpTexture) {
		var value = bumpMap.value || 1.0;
		this.bumpStrength = value;
                this.bumpTextureSize = Math.max(
                    this.bumpTexture.image.width,
                    this.bumpTexture.image.height
                );
	    }
	}

	var specularMap = material.specularMap;
	if (specularMap) {
	    this.specularTexture = this.textureGet(gl, mesh, library, specularMap.image, {
		textureUnit: 3,
		mipMaps: true
	    });
	}

	var cutout = material.cutout;
	if (cutout) {
	    this.cutoutTexture = this.textureGet(gl, mesh, library, cutout.image, {
		textureUnit: 4,
		mipMaps: true
	    });
	    if (cutout.image != undefined) {
		++this.drawOrder;
	    }
	}
	if (this.translucent) {
	    ++this.drawOrder;
	}
    },

    textureGet: function(gl, mesh, library, idx, config) {
	var image = gl && library && idx != undefined && mesh.images[idx];
	if (!image) {
	    return undefined;
	}
	var texture;
	var asset = library.images[image.url];
	if (asset) {
	    texture = asset.texture;
	    if (!texture && asset.image) {
		if (config.mipMaps) {
		    if (!config.min_filter) {
			config.min_filter = gl.LINEAR_MIPMAP_LINEAR;
		    }
		}
		texture = utils.Texture2D.extend(
		    config,
		    gl, asset.id, asset.image
		);
		texture.update(gl);
		asset.texture = texture;
	    }
	} else {
	    console.log("can't find texture", idx, image, library);
	}
	return texture;
    },

    draw: function(gl, program, renderPass) {
	if (renderPass.debug) {
	    return true;
	}

	var hasTransparency = this.translucent;
	if (renderPass.transparency) {
	    if (!hasTransparency && !this.cutoutTexture) {
		return false;
	    }
	} else {
	    if (hasTransparency) {
		return false;
	    }
	}

	var uniforms = utils.MATERIALS[this.id] || (
	    this.SHINY[this.id] ? utils.MATERIAL_SHINY : utils.MATERIAL_MATTE
	);
	for (var uname in uniforms) {
	    var uniform = program.uniforms[uname];
	    if (uniform) {
		var udef = uniforms[uname];
		var name = udef[0];
		var value = this[name];
		if (value == undefined) {
		    value = udef[1];
		}
		if (value != undefined) {
		    uniform.set(value);
		}
	    }
	}

	if (program.uniforms.uHasDiffuseTexture) {
	    if (this.diffuseTexture) {
		this.diffuseTexture.bindTexture(gl);
		program.uniforms.uHasDiffuseTexture.set(true);
	    } else {
		program.uniforms.uHasDiffuseTexture.set(false);
	    }
	}
	if (program.uniforms.uHasNormalTexture) {
	    if (this.normalTexture) {
		this.normalTexture.bindTexture(gl);
		program.uniforms.uHasNormalTexture.set(true);
	    } else {
		program.uniforms.uHasNormalTexture.set(false);
	    }
	}
	if (program.uniforms.uHasBumpTexture) {
	    if (this.bumpTexture) {
		this.bumpTexture.bindTexture(gl);
		program.uniforms.uHasBumpTexture.set(true);
		program.uniforms.uBumpStrength.set(this.bumpStrength);
		program.uniforms.uBumpTextureSize.set(this.bumpTextureSize);
	    } else {
		program.uniforms.uHasBumpTexture.set(false);
	    }
	}
	if (program.uniforms.uHasSpecularTexture) {
	    if (this.specularTexture) {
		this.specularTexture.bindTexture(gl);
		program.uniforms.uHasSpecularTexture.set(true);
	    } else {
		program.uniforms.uHasSpecularTexture.set(false);
	    }
	}
	if (program.uniforms.uHasCutoutTexture) {
	    if (this.cutoutTexture) {
		this.cutoutTexture.bindTexture(gl);
		program.uniforms.uHasCutoutTexture.set(true);
		// draw backfaces for cutouts
		gl.disable(gl.CULL_FACE);
	    } else {
		program.uniforms.uHasCutoutTexture.set(false);
		// TBD: enabling this doesn't seem to improve performance
		gl.enable(gl.CULL_FACE);
	    }
	}
        var texScale = this.texScale;
        if (texScale) {
            if (program.uniforms.uTexScaleMin) {
                program.uniforms.uTexScaleMin.set(texScale.min);
            }
            if (program.uniforms.uTexScaleMax) {
                program.uniforms.uTexScaleMax.set(texScale.max);
            }
        }
	return true;
    }
});

/**
 * http://www.terathon.com/code/tangent.html
 * http://www.opengl-tutorial.org/intermediate-tutorials/tutorial-13-normal-mapping/
 */
utils.ComputeTangents = {
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

	if (tangents == undefined ||
	    tangents.length != l * 4) {
	    tangents = new Float32Array(l * 4);
	}
	tangents.fill(0.0);
	if (bitangents == undefined ||
	    bitangents.length != l * 3) {
	    bitangents = new Float32Array(l * 3);
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

if (false) {
	// debug: not necessary to normalize bitangent
	// b' = normalize(b')
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
 * Return the first difference between the two arrays.
 * @param {Array} a the first array
 * @param {Array} b the second array
 * @param {Number} [epsilon=1e-6] the minimum delta to be considered non-zero
 */
utils.arrayDiff = function(a, b, epsilon) {
    if (epsilon == undefined) {
	epsilon = 1e-6;
    }
    for (var i = 0, n = Math.min(a.length, b.length); i < n; ++i) {
	var delta = b[i] - a[i];
	if (Math.abs(delta) >= epsilon) {
	    return [i, b[i], a[i], delta];
	}
    }
    return null;
};

/**
 * Compute an array [ [<index>, <delta>], ...] of non-zero element deltas
 * that can be used to transform a to b (eg, delta = b[index]- a[index]).
 * @param {Array} a the first array
 * @param {Array} b the second array
 * @param {Number} [epsilon=1e-6] the minimum delta to be considered non-zero
 */
utils.arrayDeltas = function(a, b, epsilon) {
    if (epsilon == undefined) {
	epsilon = 1e-6;
    }
    var deltas = [];
    var changed = false;
    for (var i = 0, n = Math.min(a.length, b.length); i < n; ++i) {
	var delta = b[i] - a[i];
	if (Math.abs(delta) >= epsilon) {
	    deltas.push([i, delta]);
	    changed = true;
	}
    }
    return changed ? deltas : null;
};

/**
 * Apply the results of utils.arrayDelta to the specified array.
 * @param {Array} a the array
 * @param {Array} deltas the array deltas
 */
utils.arrayDeltasApply = function(a, deltas) {
    if (!deltas) {
	return false;
    }
    for (var i = 0, n = deltas.length; i < n; ++i) {
	var delta = deltas[i];
	a[delta[0]] += delta[1];
    }
    return n > 0;
};

/**
 * Split the surface mesh into one or more WebGL buffers.
 * Since a WebGL element buffer can only use 16-bit indices,
 * surfaces requiring more than 0x1000 indices must be split
 * into multiple buffers.
 */
utils.MeshBuffers = utils.extend(utils.Object, {
    debug: false,

    init: function(gl, surface, group_index) {
	var group = surface.mesh.material_groups[group_index];
	var material = surface.mesh.materials[group.material];
	var indices = group.indices;
	var vertices = surface.mesh.vertices;
	var coords = surface.coords;
	var normals = surface.normals;
	var step = (surface.wireframe ? /* lines */ 2 : /* triangles */ 3);

	var uv_indices = group.uv_indices;
	var uvs = surface.mesh.uv_sets[material.uv_set].uvs;
	var texScales = surface.texScales;

	this.surface = surface;
	this.group_index = group_index;
	this.group = group;

	utils.assert && utils.assert(
	    coords.length == 3 * vertices.length,
	    group.id + " coords/vertices length mismatch"
	);
	utils.assert && utils.assert(
	    coords.length == normals.length,
	    group.id + " coords/normals length mismatch"
	);
	utils.assert && utils.assert(
	    normals.length == 3 * vertices.length,
	    group.id + " normals/vertices length mismatch"
	);
	utils.assert && utils.assert(
	    indices.length % step == 0,
	    group.id + " indices must be a multiple of " + step
	);
	utils.assert && utils.assert(
	    uv_indices.length % step == 0,
	    group.id + " uv_indices must be a multiple of " + step
	);
	utils.assert && utils.assert(
	    indices.length == uv_indices.length,
	    group.id + " indices/uv_indices length mismatch"
	);

	/*
	 * A vertex might have more than one texture coordinate,
	 * so construct the buffers around the texture coordinates
	 * and duplicate vertices as necessary.
	 */

	if (this.debug) {
	    this.vertexMap = [];
	    for (var i = 0, n = indices.length; i < n; ++i) {
		var vi = indices[i];
		var uvi = uv_indices[i];
		utils.assert && utils.assert(
		    this.vertexMap[uvi] == undefined || this.vertexMap[uvi] == vi,
		    group.id + " uv coordinate maps to multiple vertices",
		    [group,
		     "i =", i,
		     "uvi =", uvi,
		     "old =", this.vertexMap[uvi],
		     "p =", indices[this.vertexMap[uvi]],
		     "new =", vi,
		     "p =", indices[vi]]
		);
		this.vertexMap[uvi] = vi;
	    }
	}

	var uMin, vMin, uMax, vMax;
	var buffer = this.bufferInit();
	if (texScales) {
	    buffer.texScales = [];
	}
	this.buffers = [buffer];
	for (var i = 0, n = indices.length; i < n; ++i) {
	    if ((i % step) == 0 &&
		buffer.count + step > 0x10000) {
		/* start a new buffer */
		buffer = this.bufferInit();
		buffer.offset = i;
	        if (texScales) {
	            buffer.texScales = [];
	        }
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
		if (!uvs) {
		    console.log("uvi=", uvi,
			       "uv_indices=", uv_indices,
			       "uvs=", uvs,
			       "uv_set=", material.uv_set,
			       "uv_sets=", surface.mesh.uv_sets,
			       "material=", material);
		}
		var uv = uvs[uvi];
		var u = uv[0];
		var v = uv[1];
		if (i == 0) {
		    uMin = u;
		    vMin = v;
		    uMax = u;
		    vMax = v;
		} else {
		    if (uMin > u) {
			uMin = u;
		    }
		    if (vMin > v) {
			vMin = v;
		    }
		    if (uMax < u) {
			uMax = u;
		    }
		    if (vMax < v) {
			vMax = v;
		    }
		}
		buffer.uvs.push(u, v);
		if (texScales) {
                    var texScale = texScales[uvi];
		    buffer.texScales.push(texScale ? texScale.scale : 0);
		}
	    }
	    buffer.indices.push(bi);
	}
	uMin = Math.floor(uMin);
	vMin = Math.floor(vMin);
	uMax = Math.ceil(uMax);
	vMax = Math.ceil(vMax);
        utils.assert && utils.assert(
            uMax - uMin <= 1.0 &&
	    vMax - vMin <= 1.0,
	    "UV is out of range ",
	    [{u: [uMin, uMax], v: [vMin, vMax]}]
	);
	for (var i = 0, n = this.buffers.length; i < n; ++i) {
	    var buffer = this.buffers[i];
	    if (this.debug) {
		this.bufferValidate(buffer, group,
				    indices, coords, normals,
				    uv_indices, uvs);
	    }
	    if (uMin > 0 || vMin > 0) {
		this.unUDIM(buffer.uvs, uMin, vMin);
	    }
	    this.bufferCreate(buffer, gl, i);
	}
    },

    unUDIM: function(uvs, uMin, vMin) {
	var i = 0, n = uvs.length;
	while (i < n) {
	    var u = (uvs[i++] -= uMin);
	    var v = (uvs[i++] -= vMin);
	}
    },

    update: function() {
	for (var i = 0, n = this.buffers.length; i < n; ++i) {
	    this.bufferUpdate(this.buffers[i]);
	}
    },

    draw: function(gl, program, renderPass) {
	var mesh = this.surface.mesh;
	var group = this.group;
	var material = mesh.materials[group.material];
	if (material.ctx.disabled) {
	    return;
	}
	if (!material.ctx.draw(gl, program, renderPass)) {
	    return;
	}
	for (var i = 0, n = this.buffers.length; i < n; ++i) {
	    this.bufferDraw(this.buffers[i], gl, program, renderPass);
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

    bufferCreate: function(buffer, gl, idx) {
	var group = this.group;
	var id = group.id;
	buffer.coords = new Float32Array(buffer.coords);
	buffer.normals = new Float32Array(buffer.normals);
	buffer.uvs = new Float32Array(buffer.uvs);
	if (buffer.texScales) {
	    buffer.texScales = new Float32Array(buffer.texScales);
	}
	buffer.indices = new Uint16Array(buffer.indices);
	this.bufferTangents(buffer, idx);
	if (gl) {
	    buffer.coordsBuf = utils.ArrayBuffer3f.create(
		gl, id + ".coords." + idx, buffer.coords
	    );
	    buffer.normalsBuf = utils.ArrayBuffer3f.create(
		gl, id + ".normals." + idx, buffer.normals
	    );
	    buffer.uvsBuf = utils.ArrayBuffer2f.create(
		gl, id + ".texCoords." + idx, buffer.uvs
	    );
	    if (buffer.texScales) {
		buffer.aTexScale = utils.ArrayBuffer1f.create(
		    gl, id + ".texScales." + idx, buffer.texScales
		);
	    }
	    buffer.indicesBuf = utils.ElementBuffer.create(
		gl, id + ".indices." + idx, buffer.indices
	    );
	    buffer.indicesBuf.mode = this.surface.wireframe ? gl.LINES : gl.TRIANGLES;
	    buffer.tangentsBuf = utils.ArrayBuffer4f.create(
		gl, id + ".tangents." + idx, buffer.tangents
	    );
	}
	if (this.debug) {
	    this.bufferDebugCreate(buffer, gl, idx);
	}
    },

    bufferTangents: function(buffer, idx) {
	utils.ComputeTangents.compute(
	    buffer.indices,
	    buffer.coords,
	    buffer.normals,
	    buffer.uvs,
	    buffer.tangents,
	    buffer.bitangents
	);
	buffer.tangents = utils.ComputeTangents.tangents;
	buffer.bitangents = utils.ComputeTangents.bitangents;
	utils.ComputeTangents.clear();
    },

    bufferDraw: function(buffer, gl, program, renderPass) {
	if (renderPass.debug) {
	    if (!this.debug) {
		return;
	    }
	    program.uniforms.uColor.set([1.0, 0.0, 0.0]);
	    program.attributes.aCoord.set(buffer.debugUBuf);
	    program.update(gl);
	    buffer.debugIndicesBuf.draw(gl);

	    program.uniforms.uColor.set([0.0, 1.0, 0.0]);
	    program.attributes.aCoord.set(buffer.debugVBuf);
	    program.update(gl);
	    buffer.debugIndicesBuf.draw(gl);

	    program.uniforms.uColor.set([0.0, 0.0, 1.0]);
	    program.attributes.aCoord.set(buffer.debugNBuf);
	    program.update(gl);
	    buffer.debugIndicesBuf.draw(gl);
	    return;
	}

	program.attributes.aCoord.set(buffer.coordsBuf);
	program.attributes.aNormal.set(buffer.normalsBuf);
	program.attributes.aTangent.set(buffer.tangentsBuf);
	if (program.attributes.aTexCoord) {
	    program.attributes.aTexCoord.set(buffer.uvsBuf);
	    if (program.attributes.aTexScale) {
		program.attributes.aTexScale.set(buffer.aTexScale);
	    }
	}
	program.update(gl);
	buffer.indicesBuf.draw(gl);
    },

    bufferUpdate: function(buffer) {
	var group = this.group;
	var indices = group.indices;
	var coords = this.surface.coords;
	var normals = this.surface.normals;
	var offset = buffer.offset;
	var bindices = buffer.indices;
	var bcoords = buffer.coords;
	var bnormals = buffer.normals;
	for (var i = 0, n = bindices.length; i < n; ++i) {
	    var bi = bindices[i] * 3;
	    var ci = indices[i + offset] * 3;
	    bcoords[bi] = coords[ci];
	    bcoords[bi + 1] = coords[ci + 1];
	    bcoords[bi + 2] = coords[ci + 2];

	    bnormals[bi] = normals[ci];
	    bnormals[bi + 1] = normals[ci + 1];
	    bnormals[bi + 2] = normals[ci + 2];
	}
	this.bufferTangents(buffer);
	if (buffer.coordsBuf) {
	    buffer.coordsBuf.set(bcoords);
	    buffer.coordsBuf.dirty = true;
	}
	if (buffer.normalsBuf) {
	    buffer.normalsBuf.set(bnormals);
	    buffer.normalsBuf.dirty = true;
	}
	if (buffer.tangentsBuf) {
	    buffer.tangentsBuf.set(buffer.tangents);
	    buffer.tangentsBuf.dirty = true;
	}
	if (this.debug) {
	    this.bufferDebugUpdate(buffer);
	}
    },

    transfer: function(state, transferList) {
	var n = this.buffers.length;
	if (!state.buffers || state.buffers.length != n) {
	    state.buffers = new Array(n);
	}
	for (var i = 0; i < n; ++i) {
	    var buffer = state.buffers[i];
	    if (!buffer) {
		buffer = state.buffers[i] = {};
	    }
	    this.bufferTransfer(this.buffers[i], buffer, transferList);
	}
    },
    bufferTransfer: function(buffer, state, transferList) {
	this.arrayTransfer(buffer, state, 'coords', 'coordsBuf', transferList);
	this.arrayTransfer(buffer, state, 'normals', 'normalsBuf', transferList);
	this.arrayTransfer(buffer, state, 'tangents', 'tangentsBuf', transferList);
    },
    arrayTransfer: function(buffer, state, name, glName, transferList) {
	var ary = buffer[name];
	var aryNew = state[name];
	state[name] = ary;
	if (aryNew &&
	    aryNew.buffer && ary.buffer && aryNew.buffer != ary.buffer &&
	    aryNew.length == ary.length) {
	    transferList.push(ary.buffer);
	    buffer[name] = aryNew;
	    var glBuf = buffer[glName];
	    if (glBuf) {
		glBuf.set(aryNew);
	    }
	}
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
		["uv validate", group.id,
		 "i =", i,
		 ", vi =", vi, ", bi =", bi/2,
		 ", uvi =", uvi, ", uv =", uv,
		 ", bu =", bu, ", bv =", bv]
	    );
	}
    },

    bufferDebug: function(buffer) {
	var n = buffer.indices.length;
	if (n * 2 > 0x10000) {
	    /*
	     * Limit the number of debugging points to show
	     * so that we don't overflow a Uint16 element buffer.
	     */
	    n = 0x10000 / 2;
	}
	var debugU = buffer.debugU || new Float32Array(n * 6);
	var debugV = buffer.debugV || new Float32Array(n * 6);
	var debugN = buffer.debugN || new Float32Array(n * 6);
	var debugIndices = buffer.debugIndices || new Uint16Array(n * 2);
	var scale = 0.25;
	var j = 0, k = 0;
	for (var i = 0; i < n; ++i) {
	    var bi = buffer.indices[i] * 3;
	    var x = buffer.coords[bi];
	    var y = buffer.coords[bi + 1];
	    var z = buffer.coords[bi + 2];

	    var nx = buffer.normals[bi];
	    var ny = buffer.normals[bi + 1];
	    var nz = buffer.normals[bi + 2];

	    bi = buffer.indices[i] * 4;
	    var ux = buffer.tangents[bi];
	    var uy = buffer.tangents[bi + 1];
	    var uz = buffer.tangents[bi + 2];

	    var m = buffer.tangents[bi + 3];
	    var vx = m * (ny * uz - nz * uy);
	    var vy = m * (nz * ux - nx * uz);
	    var vz = m * (nx * uy - ny * ux);

	    debugU[j] = debugV[j] = debugN[j] = x; ++j;
	    debugU[j] = debugV[j] = debugN[j] = y; ++j;
	    debugU[j] = debugV[j] = debugN[j] = z; ++j;

	    debugU[j] = x + ux*scale;
	    debugV[j] = x + vx*scale;
	    debugN[j] = x + nx*scale;
	    ++j;

	    debugU[j] = y + uy*scale;
	    debugV[j] = y + vy*scale;
	    debugN[j] = y + ny*scale;
	    ++j;

	    debugU[j] = z + uz*scale;
	    debugV[j] = z + vz*scale;
	    debugN[j] = z + nz*scale;
	    ++j;

	    debugIndices[k++] = i * 2;
	    debugIndices[k++] = i * 2 + 1;
	}
	buffer.debugU = debugU;
	buffer.debugV = debugV;
	buffer.debugN = debugN;
	buffer.debugIndices = debugIndices;
    },

    bufferDebugCreate: function(buffer, gl, idx) {
	var group = this.group;
	var id = group.id;

	buffer.debugUBuf = utils.ArrayBuffer3f.create(
	    gl, id + ".debugU." + idx, buffer.debugU
	);
	buffer.debugVBuf = utils.ArrayBuffer3f.create(
	    gl, id + ".debugV." + idx, buffer.debugV
	);
	buffer.debugNBuf = utils.ArrayBuffer3f.create(
	    gl, id + ".debugN." + idx, buffer.debugN
	);
	buffer.debugIndicesBuf = utils.ElementBuffer.create(
	    gl, id + ".debugIndices." + idx, buffer.debugIndices
	);
	buffer.debugIndicesBuf.mode = gl.LINES;
    },

    bufferDebugUpdate: function(buffer) {
	this.bufferDebug(buffer);
	buffer.debugUBuf.set(buffer.debugU);
	buffer.debugVBuf.set(buffer.debugV);
	buffer.debugNBuf.set(buffer.debugN);
	buffer.debugIndicesBuf.set(buffer.debugIndices);
    }
});

/**
 * Mesh surface.
 *
 * mesh = {
 *   vertices: [ <vertex>, ... ],
 *   polygons: [ <poly>, ... ],
 *   uv_sets: [ <uv_set>, ... ],
 *   materials: [ <material>, ... ],
 *   material_groups: [ <material_group>, ... ]
 *   figure: <bone>,
 *   images: [ <image>, ... ]
 * }
 *
 * <vertex> = [ <x>, <y>, <z> ]
 * <poly> = [ <vertex_index>, <vertex_index>, <vertex_index>, <vertex_index> ]
 *
 * <uv_set> = { uvs: [ <uv>, ...] }
 * <uv> = [ <u>, <v> ]
 *
 * <material> = {
 *   id: <string>,
 *   uv_set: <uv_set_index>,
 *   diffuse: {
 *     color: <color>,
 *     image: <image-index>
 *   },
 *   normalMap: {
 *     image: <image-index>
 *   },
 *   bumpMap: {
 *     value: <float>,
 *     image: <image-index>
 *   },
 *   specularMap: {
 *     image: <image-index>
 *   },
 *   cutout: {
 *     image: <image-index>
 *   }
 * }
 * <color> = [ <r>, <g>, <b> ]
 * <image> = {
 *   id: <string>,
 *   url: <string> | map: [ <image-layer>, ... ],
 *   map_gamma: <float>,
 *   // obsolete
 *   image: <string>,  // url
 *   gamma: <float>,   // map_gamma
 * }
 * <image-layer> = {
 *   image: <image-index>,
 *   operation: "add" | "alpha_blend",
 *   transparency: <float>,
 *   invert: <bool>,
 *   xmirror: <bool>,
 *   xoffset: <float>,
 *   xscale: <float>,
 *   ymirror: <bool>,
 *   yoffset: <float>,
 *   yscale: <float>,
 *   rotation: <float>
 * }
 *
 * <material_group> = {
 *   material: <material_index>,
 *   polygons: [ <polygon_index>, ... ],
 *   uvs: [ <uv_poly>, ... ]
 * },
 * <uv_poly> = [ <uv_index>, <uv_index>, <uv_index>, <uv_index> ]
 *
 * <bone> = {
 *   id: <string>,
 *   center_point: <vertex>,
 *   end_point: <vertex>,
 *   inherits_scale: <bool>,
 *   general_scale: <float>,
 *   scale: <vertex>,
 *   rotation: <vertex>,
 *   rotation_order: "XYZ" | ...,
 *   translation: <vertex>,
 *   node_weights: [ <node_weight>, ... ],
 *   children: [ <bone>, ... ]
 * }
 * <node_weight> = [ <vertex_index>, <float> ]
 */
utils.Surface = utils.extend(utils.Object, {
    debug: false,
    applyBoneOffsets: false,

    init: function(gl, mesh, library, wireframe) {
	this.mesh = mesh;
	this.wireframe = wireframe;
	this.bonesInit(mesh.figure);
	this.followers = [];
	this.autoFits = [];
	this.dirty = true;
	if (ModifierLibrary[mesh.figure.id]) {
	    this.controls = utils.Controls.create(mesh.figure.id);
	}

	var materials = mesh.materials;
	for (var i = 0, n = materials.length; i < n; ++i) {
	    var material = materials[i];
	    material.ctx = utils.Material.create(gl, mesh, material, wireframe ? null : library);
	}

	var vertices = mesh.vertices;
	var coords = utils.arrayUnpack3f(vertices);
	this.coordMap = {};
        if (gl) {
            this.texScales = [];
        }

	var polygons = mesh.polygons;
	var groups = mesh.material_groups;
	for (i = 0, n = groups.length; i < n; ++i) {
	    var group = groups[i];
	    var polys = group.polygons;
	    var uvs = group.uvs;
	    utils.assert && utils.assert(
		polys.length == uvs.length,
		"length mismatch: polygons=" + polys.length + " and uvs=" + uvs.length
	    );
            var material = mesh.materials[group.material];
            var uv_set = mesh.uv_sets[material.uv_set].uvs;
	    var indices = [];
	    var uv_indices = [];
	    for (var j = 0, m = polys.length; j < m; ++j) {
		var poly = polygons[polys[j]];
		var uv_poly = uvs[j];
		this.polyInit(gl, poly, indices, uv_set, uv_poly, uv_indices);
		if (gl) {
                    this.texScaleInit(poly, uv_set, uv_poly, material);
		}
	    }
	    group.indices = indices;
	    group.uv_indices = uv_indices;
	}
        this.texScalesInit();

	this.mvMatrix = mat4.create();
	this.nMatrix = mat4.create();
	this.coords = coords;
	this.normalsUpdate(coords);
        this.texScalesUpdate(coords);
	this.bounds = utils.boundingBox(coords);
	this.buffers = [];
	for (i = 0, n = groups.length; i < n; ++i) {
	    var group = groups[i];
	    this.buffers.push(utils.MeshBuffers.create(gl, this, i));
	}
	this.buffers.sort(this.drawOrder);
	return this;
    },

    drawOrder: function(a, b) {
	var g1 = a.group_index,
	    g2 = b.group_index;
	var s1 = a.surface.mesh,
	    s2 = b.surface.mesh;
	var m1 = s1.material_groups[g1].material,
	    m2 = s2.material_groups[g2].material;

	// order by material draw order
	var d = s1.materials[m1].ctx.drawOrder - s2.materials[m2].ctx.drawOrder;
	if (d != 0) {
	    return d;
	}
	// then by material
	d = m1 - m2;
	if (d != 0) {
	    return d;
	}
	// then by group
	return g1 - g2;
    },

    /**
     * Compute the cosine of the angle between a->b and a->c.
     */
    cosTheta: function(a, b, c) {
	var vertices = this.mesh.vertices;
        var av = vertices[a],
            bv = vertices[b],
            cv = vertices[c];
        var abx = bv[0] - av[0],
            aby = bv[1] - av[1],
            abz = bv[2] - av[2];
        var acx = cv[0] - av[0],
            acy = cv[1] - av[1],
            acz = cv[2] - av[2];

        var dot = abx * acx + aby * acy + abz * acz;
        var ab = Math.sqrt(abx * abx + aby * aby + abz * abz);
        var ac = Math.sqrt(acx * acx + acy * acy + acz * acz);
        return dot / (ab * ac);
    },

    BONE_FILTER: {
	lHand: true,
	lCarpal2: true,
	lCarpal4: true,
	lPinky1: true,
	lPinky2: true,
	lPinky3: true
    },

    boneFilter: function(bone) {
	//return bone.id == 'lPinky3';
	//return this.BONE_FILTER[bone.id];
	//return this.mesh.figure.id == 'Genesis3Female';
	//return true;
	return false;
    },

    /**
     * Register the vertex and UV index pair.
     * If a vertex has multiple UV indices associated with it,
     * then the vertex needs to be duplicated, once for each
     * additional UV index.
     */
    vertexUvAdd: function(vi, uvi) {
	if (vi != uvi) {
	    var ci = this.coordMap[uvi];
	    if (ci == undefined) {
		/* new UV index for this vertex */
		this.coordMap[uvi] = vi;
	    } else {
		utils.assert && utils.assert(
		    ci == vi,
		    "UV index " + uvi + " assigned to multiple vertices: " + [vi, ci]
		);
	    }
	}
    },

    /**
     * Update the vertex and uv index lists for the specified polygon.
     * If the polygon is a quad, split it into two triangles.
     */
    polyInit: function(gl, poly, indices, uvs, uv_poly, uv_indices) {
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

if (false) {
	for (var i = 0; i < l; ++i) {
	    this.vertexUvAdd(poly[i], uv_poly[i]);
	}
}

	if (this.debug && this.boneFilter) {
	    var match = false;
	    for (var i = 0; i < l; ++i) {
		var vi = poly[i];
		var vrecs = this.vertexWeights[vi];
		if (vrecs) {
		    for (var j = 0, m = vrecs.length; j < m; ++j) {
			if (this.boneFilter(vrecs[j][0]) /*&& vrecs[j][1] > 0.75*/) {
			    match = true;
			    break;
			}
		    }
		}
		if (match) {
		    break;
		}
	    }
	    if (!match) {
		return 0;
	    }
	}

	if (this.wireframe) {
	    /* render as lines */
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
	} else {
	    /* render as filled triangles */
	    if (l == 4) {
		/*
                 * split quad into tris using the diagonal with the largest angle
                 * @note same as chooising the smallest cos(theta)
                 */
		var a = poly[0],
		    b = poly[1],
		    c = poly[2],
		    d = poly[3];
                var ct1 = this.cosTheta(a, b, c);
                var ct2 = this.cosTheta(b, c, a);
		if (ct1 <= ct2) {
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
	}
	return n;
    },

    /**
     * Initialize coord/texture scale state.
     */
    texScalesInit: function() {
        var texScales = this.texScales;
        if (!texScales) {
            return;
        }
        for (var uva in texScales) {
            var texScale = texScales[uva];
            var n = texScale.edges.length;
            if (n < 3) {
                // zero the weight for texture seams
                texScale.weight = 0;
            }
        }
    },

    /**
     * Initialize per-edge coord/texture scale state.
     */
    texScaleInit: function(poly, uvs, uv_poly, material) {
        var texScales = this.texScales;
        if (!texScales) {
            return;
        }

        var texScaleMat = material.ctx.texScale;
        if (!texScaleMat) {
            texScaleMat = material.ctx.texScale = {
                texScales: []
            };
        }

        var n = poly.length;
        var ca = poly[n - 1];
        var uva = uv_poly[n - 1];
        for (var i = 0; i < n; ++i) {
            var cb = poly[i];
            var uvb = uv_poly[i];

            var dt = vec2.distance(uvs[uva], uvs[uvb]);
            var edge = {
                ca: ca,
                cb: cb,
                dt: dt
            };

            var texScale = texScales[uva];
            if (!texScale) {
                texScale = texScales[uva] = {
                    material: material,
                    weight: 1,
                    edges: [edge]
                };
                texScaleMat.texScales.push(texScale);
            } else {
                texScale.edges.push(edge);
            }

            ca = cb;
            uva = uvb;
        }

        if (this.controls) {
            // TBD: really need to make bump strength weight map
            var mod = this.controls.modifiers['PBMNavel'];
            if (mod) {
                false && this.texScalesWeight(mod.params[0], 2.0);
                true && this.texScalesWeight(mod.params[0], 0.0, {
                    min: 1.0, max: 10.0
                });
            }
            mod = this.controls.modifiers['PBMNipples'];
            if (mod) {
                false && this.texScalesWeight(mod.params[0], 8.0);
                true && this.texScalesWeight(mod.params[0], 0.0, {
                    min: 2.0, max: 10.0
                });
            }
        }
    },

    texScalesWeight: function(morph, weight, options) {
        var values = morph.values;
        if (values) {
            var i, n = values.length;
            var weights = new Float32Array(n);
            if (options && options.min != undefined && options.max != undefined) {
                var min, max;
                for (i = 0; i < n; ++i) {
                    var value = values[i];
                    var dx = value[1];
                    var dy = value[2];
                    var dz = value[3];
                    //var d = Math.sqrt(dx*dx + dy*dy + dz*dz);
                    var d = (dx*dx + dy*dy + dz*dz);
                    if (i == 0) {
                        min = max = d;
                    } else {
                        if (min > d) {
                            min = d;
                        }
                        if (max < d) {
                            max = d;
                        }
                    }
                    weights[i] = d;
                }
                var r = max - min;
                if (r > 0) {
                    var dw = options.max - options.min;
                    var wmin = options.min;
                    for (i = 0; i < n; ++i) {
                        var w = (weights[i] - min) / r;
                        weights[i] = weight + w * dw + wmin;
                    }
                } else {
                    weights.fill(weight + options.min);
                }
            } else {
                weights.fill(weight);
            }
            for (i = 0; i < n; ++i) {
                var value = values[i];
                var ci = value[0];
                var texScale = this.texScales[ci];
                if (texScale) {
                    texScale.weight = weights[i];
                }
            }
        }
    },

    tmpTexScales: {
        v0: vec3.create(),
        v1: vec3.create()
    },

    /**
     * Update the per-vertex texture scaling.
     */
    texScalesUpdate: function(coords) {
        var va = this.tmpTexScales.v0, vb = this.tmpTexScales.v1;
	var materials = this.mesh.materials;
	for (var i = 0, n = materials.length; i < n; ++i) {
	    var material = materials[i];
            var texScaleMat = material.ctx.texScale;
            if (!texScaleMat) {
                continue;
            }

            var matSum = 0;
            var matCount = 0;
            var texScales = texScaleMat.texScales;
            for (var j = 0, m = texScales.length; j < m; ++j) {
                var texScale = texScales[j];
                var weight = texScale.weight;
                if (weight > 0) {
                    var sum = 0;
                    var edges = texScale.edges;
                    for (var k = 0, l = edges.length; k < l; ++k) {
                        var edge = edges[k];
                        var ci = edge.ca * 3;
                        va[0] = coords[ci++];
                        va[1] = coords[ci++];
                        va[2] = coords[ci];
                        ci = edge.cb * 3;
                        vb[0] = coords[ci++];
                        vb[1] = coords[ci++];
                        vb[2] = coords[ci];
                        var dc = vec3.distance(va, vb);
                        sum += edge.dt / dc;
                    }
                    var scale = texScale.scale = weight * sum / l;
                    matSum += scale;
                    if (matCount++ == 0) {
                        texScaleMat.min = texScaleMat.max = scale;
                    } else {
                        if (texScaleMat.min > scale) {
                            texScaleMat.min = scale;
                        }
                        if (texScaleMat.max < scale) {
                            texScaleMat.max = scale;
                        }
                    }
                } else {
                    texScale.scale = 0;
                }
            }
            if (matCount > 0) {
                texScaleMat.scale = matSum / matCount;
            } else {
                texScaleMat.scale = 0;
                texScaleMat.min = 0;
                texScaleMat.max = 1;
            }
            false && console.log("texScale", material.id, material.ctx.bumpStrength, texScaleMat);
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

    mMatrixUpdate: function(mMatrix) {
	if (this.mMatrix) {
	    if (!this.mMatrixBase) {
		this.mMatrixBase = this.mMatrix;
		this.mMatrix = mat4.clone(this.mMatrixBase);
	    }
	    mat4.multiply(this.mMatrix, this.mMatrixBase, mMatrix);
	}
    },

    draw: function(gl, program, renderPass) {
	this.meshUpdate();
	if (program.uniforms.mMatrix && this.mMatrix) {
	    program.uniforms.mMatrix.set(this.mMatrix);
	    if (program.uniforms.nMatrix && this.nMatrix) {
		this.normalMatrix(program);
	    }
	}

	if (renderPass.debug && this.debug) {
	    if (!this.boneEdgeVertices) {
		this.boneEdgeVertices = utils.ArrayBuffer3f.create(
		    gl, "boneEdges", this.boneEdgeVerticesBuf
		);
	    }
	    if (!this.boneEdgeIndices) {
		this.boneEdgeIndices = utils.ElementBuffer.create(
		    gl, "boneIndices", this.boneEdgeIndicesBuf
		);
		this.boneEdgeIndices.mode = gl.LINES;
	    }
	    if (!this.boneCenterOffsetIndices) {
		this.boneCenterOffsetIndices = utils.ElementBuffer.create(
		    gl, "boneCpOffset", this.boneCenterOffsetIndicesBuf
		);
		this.boneCenterOffsetIndices.mode = gl.LINES;
	    }
	    if (!this.boneEndOffsetIndices) {
		this.boneEndOffsetIndices = utils.ElementBuffer.create(
		    gl, "boneEpOffset", this.boneEndOffsetIndicesBuf
		);
		this.boneEndOffsetIndices.mode = gl.LINES;
	    }
	    program.uniforms.uColor.set([0, 0, 1]);
	    program.attributes.aCoord.set(this.boneEdgeVertices);
	    program.update(gl);
	    this.boneEdgeIndices.draw(gl, program);

	    program.uniforms.uColor.set([0, 1, 0]);
	    program.update(gl);
	    this.boneCenterOffsetIndices.draw(gl, program);

	    program.uniforms.uColor.set([1, 0, 0]);
	    program.update(gl);
	    this.boneEndOffsetIndices.draw(gl, program);
	}

	var buffers = this.buffers;
	for (var i = 0, n = buffers.length; i < n; ++i) {
	    buffers[i].draw(gl, program, renderPass);
	}
    },

    bonesInit: function(root) {
	this.vertexWeights = [];
	this.boneMap = {};
	this.boneAliases = {};
	if (this.debug) {
	    this.boneEdgeVerticesBuf = [];
	    this.boneEdgeIndicesBuf = [];
	    this.boneCenterOffsetIndicesBuf = [];
	    this.boneEndOffsetIndicesBuf = [];
	}
	this.boneInit(root);

if (true) {
	/* normalize the vertex weights */
	for (var i = 0, n = this.vertexWeights.length; i < n; ++i) {
	    var vrec = this.vertexWeights[i];
	    if (vrec != undefined) {
		var sum = 0;
		for (var j = 0, m = vrec.length; j < m; ++j) {
		    var weight = vrec[j][1];
		    sum += weight;
		}
		if (m > 0 && sum != 1) {
		    for (j = 0, m = vrec.length; j < m; ++j) {
			vrec[j][1] /= sum;
		    }
		}
	    } else {
		console.log("missing weights for vertex", i);
	    }
	}
}
	var missing = 0;
	var vertices = this.mesh.vertices;
	for (var i = 0, n = vertices.length; i < n; ++i) {
	    if (this.vertexWeights[i] == undefined) {
		++missing;
	    }
	}
	if (missing > 0) {
	    console.log("missing " + missing + " vertex node weights");
	}
    },

    boneInit: function(bone) {
	utils.assert && utils.assert(
	    this.boneMap[bone.id] == undefined,
	    "multiple bones for id",
	    ["id=", bone.id,
	     "bone=", bone,
	     "other=", this.boneMap[bone.id]]
	);
	this.boneMap[bone.id] = bone;
	bone.dirty = true;
	if (bone.alias) {
	    utils.assert && utils.assert(
		this.boneAliases[bone.alias] == undefined,
		    "multiple bones for alias",
		    ["alias=", bone.alias,
		    "bone=", bone,
		    "other=", this.boneMap[bone.alias]]
	    );
	    this.boneAliases[bone.alias] = bone;
	    if (false && this.boneMap[bone.alias]) {
		console.log("ambiguous bone", bone.id, bone.alias, bone, this.boneMap[bone.id]);
	    }
	}

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

	bone.m = mat4.create();
	bone.q = dquat.create();

	if (this.debug && this.boneFilter && this.boneFilter(bone)) {
	    var indices = this.boneEdgeIndicesBuf;
	    var vertices = this.boneEdgeVerticesBuf;
	    var index = vertices.length / 3;
	    bone.bei = index;

	    if (this.applyBoneOffsets) {
		this.boneEdgeIndicesBuf.push(index + 2, index + 3);
		this.boneCenterOffsetIndicesBuf.push(index + 2, index);
		this.boneEndOffsetIndicesBuf.push(index + 3, index + 1);
	    } else {
		this.boneEdgeIndicesBuf.push(index, index + 1);
		this.boneCenterOffsetIndicesBuf.push(index, index + 2);
		this.boneEndOffsetIndicesBuf.push(index + 1, index + 3);
	    }

	    var cp = bone.center_point;
	    var ep = bone.end_point;
	    vertices.push(
		cp[0], cp[1], cp[2],
		ep[0], ep[1], ep[2],

		// offsets
		cp[0], cp[1], cp[2],
		ep[0], ep[1], ep[2]
	    );
	}

	var children = bone.children;
	if (children) {
	    for (var i = 0, n = children.length; i < n; ++i) {
		var child = children[i];
		child.parent = bone;
		this.boneInit(child);
	    }
	}
    },

    transform: function(controls) {
	var bones = controls.bones;
	for (var name in bones) {
	    var trans = bones[name];
	    //var bone = this.boneAliases[name] || this.boneMap[name];
	    var bone = this.boneMap[name] || this.boneAliases[name];
	    if (!bone) {
		false && console.log("unknown bone", name, trans);
		continue;
	    }
	    this.boneTransformLocal(bone, trans);
	}
	this.morphs = controls.morphs;
	var autoFits = this.autoFits;
	if (autoFits) {
	    for (var i = 0, n = autoFits.length; i < n; ++i) {
		autoFits[i].morphs(this.morphs);
	    }
	}

	this.dirty = true;
	this.boneTransformGlobal(this.mesh.figure);
	this.boneUpdate(this.mesh.figure);
	var followers = this.followers;
	for (var i = 0, n = followers.length; i < n; ++i) {
	    var follower = followers[i];
	    if (follower.autoFit) {
		follower.autoFitMorphs = follower.autoFit.autoFitMorphs(this.morphs);
	    }
	    if (true && follower.controls) {
		follower.controls.start(controls.controls);
		//follower.controls.start(controls.pose);
		follower.transform(follower.controls);
	    } else {
		follower.follow(this);
	    }
	}
    },
    follow: function(parent) {
	var dirty = false;
	for (var name  in this.boneMap) {
	    var other = parent.boneMap[name];
	    if (!other) {
		false && console.log("follower bone not in parent", name);
		continue;
	    }
	    var trans = other.cache && other.cache.transform;
	    if (trans) {
		var bone = this.boneMap[name];
		dquat.copy(bone.q, other.q);
		if (other.mss) {
		    var mss = bone.mss;
		    if (!mss) {
			bone.mss = mat4.clone(other.mss);
		    } else {
			mat4.copy(mss, other.mss);
		    }
		}
		if (other.qss) {
		    var qss = bone.qss;
		    if (!qss) {
			bone.qss = dquat.clone(other.qss);
		    } else {
			dquat.copy(qss, other.qss);
		    }
		}
		if (bone.dirty) {
		    dirty = true;
		}
	    }
	}
	if (dirty) {
	    this.dirty = true;
	}
    },

    tmpBone: {
        v0: vec3.create(),
        v1: vec3.create(),

        // debugging
	m0: mat4.create()
    },

    boneTransformLocal: function(bone, transform) {
	var cache = bone.cache;
	if (!cache) {
	    cache = bone.cache = {};
	}
	cache.transform = transform;

	var tmpVec = this.tmpBone.v0;

	var cp = cache.center_point;
	if (!cp) {
	    cp = cache.center_point = vec3.create();
	}
	var co = cache.cp_offset;
	if (!co) {
	    co = cache.cp_offset = vec3.create();
	}
	var ep = cache.end_point;
	if (!ep) {
	    ep = cache.end_point = vec3.create();
	}
	var eo = cache.ep_offset;
	if (!eo) {
	    eo = cache.eo_offset = vec3.create();
	}
	var t = cache.translation;
	if (!t) {
	    t = cache.translation = vec3.create();
	}

	var o = cache.orientation;
	if (!o) {
	    o = cache.orientation = mat4.create();
	}
	var o_inv = cache.orientation_inv;
	if (!o_inv) {
	    o_inv = cache.orientation_inv = mat4.create();
	}
	var r = cache.rotation;
	if (!r) {
	    r = cache.rotation = mat4.create();
	}

	var s = cache.scale;
	if (!s) {
	    s = cache.scale = mat4.create();
	}

	var order = bone.rotation_order;
	vec3.copy(tmpVec, bone.orientation);
	var op = transform && transform.orientation;
	if (op) {
	    if (op.x != undefined) tmpVec[0] += op.x;
	    if (op.y != undefined) tmpVec[1] += op.y;
	    if (op.z != undefined) tmpVec[2] += op.z;
	}
	mat4.identity(o);
	this.boneRotate(o, order, tmpVec);
	mat4.invert(o_inv, o);

	vec3.copy(cp, bone.center_point);
	op = transform && transform.center_point;
	if (op) {
	    vec3.set(co, op.x || 0, op.y || 0, op.z || 0);
	    vec3.add(cp, cp, co);
	} else {
	    vec3.set(co, 0,0,0);
	}

	vec3.copy(ep, bone.end_point);
	op = transform && transform.end_point;
	if (op) {
	    vec3.set(eo, op.x || 0, op.y || 0, op.z || 0);
	    vec3.add(ep, ep, eo);
	} else {
	    vec3.set(eo, 0,0,0);
	}

	vec3.copy(t, bone.translation);
	op = transform && transform.translation;
	if (op) {
	    if (op.x != undefined) t[0] += op.x;
	    if (op.y != undefined) t[1] += op.y;
	    if (op.z != undefined) t[2] += op.z;
	}

	vec3.copy(tmpVec, bone.rotation);
	op = transform && transform.rotation;
	if (op) {
	    if (op.x != undefined) tmpVec[0] += op.x;
	    if (op.y != undefined) tmpVec[1] += op.y;
	    if (op.z != undefined) tmpVec[2] += op.z;
	}
	mat4.identity(r);
	this.boneRotate(r, order, tmpVec);

	var gs = bone.general_scale;
	vec3.copy(tmpVec, bone.scale);
	op = transform && transform.scale;
	if (op) {
	    // TBD: how are the transformed scales combined? (overwrite? multiply? add?)
	    if (op.x != undefined) tmpVec[0] += op.x;
	    if (op.y != undefined) tmpVec[1] += op.y;
	    if (op.z != undefined) tmpVec[2] += op.z;
	    if (op.general != undefined) gs += op.general;
	}
	tmpVec[0] *= gs;
	tmpVec[1] *= gs;
	tmpVec[2] *= gs;
	mat4.fromScaling(s, tmpVec);

	/* TBD: determine if anything changed */
	bone.dirty = true;
    },
    boneTransformGlobal: function(bone, controls) {
	if (controls) {
	    var trans = controls.bones[bone.id] || controls.bones[bone.alias];
	    if (trans) {
		this.boneTransformLocal(bone, trans);
	    }
	}

	var cache = bone.cache;
	if (!cache) {
	    this.boneTransformLocal(bone);
	    cache = bone.cache;
	}

	var parent = bone.parent;
	var pcache;
	if (parent) {
	    pcache = parent.cache;
	    if (parent.dirty) {
		bone.dirty = true;
	    }
	}

	// m = cp * o * r * inv(o) * -cp
	var m = bone.m;
	var cp = (true || this.applyBoneOffsets
		  ? cache.center_point
		  : bone.center_point);

        var tmpVec = this.tmpBone.v0;
	vec3.add(tmpVec, cp, cache.translation);
	mat4.fromTranslation(m, tmpVec);

	mat4.multiply(m, m, cache.orientation);
	mat4.multiply(m, m, cache.rotation);
	mat4.multiply(m, m, cache.orientation_inv);

	vec3.negate(tmpVec, cp);
	mat4.translate(m, m, tmpVec);

	/* compute the scale/shear transform */
	if (this.applyBoneOffsets) {
	    var mss = bone.mss;
	    if (!mss) {
		mss = bone.mss = mat4.create();
	    }
	    mat4.identity(mss);
	    if (true) {
		/* add center_point offset */
		mat4.fromTranslation(mss, cache.cp_offset);
	    } else {
		/* adjust by parent end_point offset */
		if (pcache) {
		    mat4.fromTranslation(mss, cache.eo_offset);
		} else {
		    mat4.identity(mss);
		}
	    }

	    // TBD: add scale components
	    var lscale = cache.local_scale;
	    if (!lscale) {
		lscale = cache.local_scale = mat4.create();
	    }
	    mat4.multiply(lscale, cache.scale, cache.orientation_inv);
	    mat4.multiply(lscale, cache.orientation, lscale);

	    // TBD: what is local scale?
	    var lscale_inv = cache.local_scale_inv;
	    if (!lscale_inv) {
		lscale_inv = cache.local_scale_inv = mat4.create();
	    }
	    mat4.invert(lscale_inv, lscale);

	    var gscale = cache.global_scale;
	    if (!gscale) {
		gscale = cache.global_scale = mat4.create();
	    }
	    mat4.copy(gscale, lscale);
	    if (pcache) {
		if (!bone.inherits_scale) {
		    mat4.multiply(gscale, pcache.local_scale_inv, gscale);
		}
		mat4.multiply(gscale, pcache.global_scale, gscale);
	    }
	}
	if (bone.mss) {
	    var qss = bone.qss;
	    if (!qss) {
		qss = bone.qss = dquat.create();
	    }
	    dquat.fromMat4(qss, bone.mss);
	}

	var children = bone.children;
	if (children) {
	    for (var i = 0, n = children.length; i < n; ++i) {
		var child = children[i];
		this.boneTransformGlobal(child);
	    }
	}
    },
    axisRotate: function(m, axis, rotation) {
	switch (axis) {
	case 'X':
	    mat4.rotateX(m, m, utils.radians(rotation[0]));
	    break;
	case 'Y':
	    mat4.rotateY(m, m, utils.radians(rotation[1]));
	    break;
	case 'Z':
	    mat4.rotateZ(m, m, utils.radians(rotation[2]));
	    break;
	default:
	    console.log("unknown axis: " + axis);
	    break;
	}
    },
    boneRotate: function(m, order, rotation) {
	if (rotation) {
	    /* apply the rotations in reverse order */
	    this.axisRotate(m, order[2], rotation);
	    this.axisRotate(m, order[1], rotation);
	    this.axisRotate(m, order[0], rotation);
	}
    },

    tmpBoneDebug: {
	m0: mat4.create()
    },

    boneUpdate: function(bone) {
	if (bone.dirty) {
	    // mat4 -> dquat
	    var q = bone.q;
	    dquat.fromMat4(q, bone.m);
	    if (bone.parent) {
		dquat.multiply(q, bone.parent.q, q);
	    }
	    dquat.normalize(q, q);

	    var bei = bone.bei;
	    if (this.debug && bei != undefined) {
		var cp = this.tmpBone.v0;
		var ep = this.tmpBone.v1;
                var tmpM = this.tmpBoneDebug.m0;
		dquat.toMat4(tmpM, q);
		vec3.transformMat4(cp, bone.center_point, tmpM);
		vec3.transformMat4(ep, bone.end_point, tmpM);
		bei *= 3;
		this.boneEdgeVerticesBuf[bei++] = cp[0];
		this.boneEdgeVerticesBuf[bei++] = cp[1];
		this.boneEdgeVerticesBuf[bei++] = cp[2];
		this.boneEdgeVerticesBuf[bei++] = ep[0];
		this.boneEdgeVerticesBuf[bei++] = ep[1];
		this.boneEdgeVerticesBuf[bei++] = ep[2];

		vec3.transformMat4(cp, bone.cache.center_point, tmpM);
		this.boneEdgeVerticesBuf[bei++] = cp[0];
		this.boneEdgeVerticesBuf[bei++] = cp[1];
		this.boneEdgeVerticesBuf[bei++] = cp[2];

		vec3.transformMat4(ep, bone.cache.end_point, tmpM);
		this.boneEdgeVerticesBuf[bei++] = ep[0];
		this.boneEdgeVerticesBuf[bei++] = ep[1];
		this.boneEdgeVerticesBuf[bei++] = ep[2];

		if (this.boneEdgeVertices) {
		    this.boneEdgeVertices.set(this.boneEdgeVerticesBuf);
		    this.boneEdgeVertices.dirty = true;
		}
	    }

	    bone.dirty = false;
	}

	var children = bone.children;
	if (children) {
	    for (var i = 0, n = children.length; i < n; ++i) {
		var child = children[i];
		this.boneUpdate(child);
	    }
	}
    },

    tmpMesh: {
        v0: vec3.create(),
        v1: vec3.create(),
        v2: vec3.create()
    },

    meshUpdate: function() {
	if (!this.dirty) {
	    return;
	}

        var vertexWeights = this.vertexWeights;
        if (!this.vertexWeights || this.vertexWeights.length == 0) {
            this.dirty = false;
            return;
        }

	var debug = utils.debug;
	var start = self.performance.now();

	var istart = self.performance.now();
	var coords = this.coords;
	var vertices = this.mesh.vertices;
	var first = true;
	var pt1 = this.tmpMesh.v0;
	var pt2 = this.tmpMesh.v1;
	var pt3 = this.tmpMesh.v2;
	var morphs = this.morphs;
	var autoFitMorphs = this.autoFitMorphs;
	for (var i = 0, n = vertices.length; i < n; ++i) {
	    var p = vertices[i];
	    var morph = morphs && morphs[i];
	    if (morph) {
		pt1[0] = p[0] + morph[0];
		pt1[1] = p[1] + morph[1];
		pt1[2] = p[2] + morph[2];
		p = pt1;
	    }
	    morph = autoFitMorphs && autoFitMorphs[i];
	    if (morph) {
		pt1[0] = p[0] + morph[0];
		pt1[1] = p[1] + morph[1];
		pt1[2] = p[2] + morph[2];
		p = pt1;
	    }

	    var weights = vertexWeights[i];
	    if (weights != undefined) {
		if (this.applyBoneOffsets) {
		    p = this.vertexUpdateLBS(pt2, weights, p, 'mss');
		    //p = this.vertexUpdateDQS(pt2, weights, p, 'qss');
		}
		p = this.vertexUpdateDQS(pt3, weights, p, 'q');
	    }
	    var ci = i * 3;
	    coords[ci++] = p[0];
	    coords[ci++] = p[1];
	    coords[ci++] = p[2];
	}
	var stats = {};
	var ielapsed = self.performance.now() - istart;
	debug && console.log("DQS", this.mesh.figure.id, ielapsed);
	stats.DQS = ielapsed;

	istart = self.performance.now();
	this.normalsUpdate(coords);
	ielapsed = self.performance.now() - istart;
	debug && console.log("normals", this.mesh.figure.id, ielapsed);
	stats.normals = ielapsed;

	istart = self.performance.now();
	this.texScalesUpdate(coords);
	ielapsed = self.performance.now() - istart;
	debug && console.log("texScales", this.mesh.figure.id, ielapsed);
	stats.texScales = ielapsed;

	istart = self.performance.now();
	var buffers = this.buffers;
	for (i = 0, n = buffers.length; i < n; ++i) {
	    buffers[i].update();
	}
	ielapsed = self.performance.now() - istart;
	debug && console.log("buffers", this.mesh.figure.id, ielapsed);
	stats.buffers = ielapsed;

	this.dirty = false;

	var elapsed = self.performance.now() - start;
	debug && console.log("meshUpdate", this.mesh.figure.id, elapsed);
	stats.mesh = elapsed;
	if (this.overlay) {
	    this.overlay.show(stats);
	}
    },

    tmpLBS: {
	m0: mat4.create(),
	m1: mat4.create()
    },

    vertexUpdateLBS: function(out, weights, p, prop) {
	var m0 = this.tmpLBS.m0;
	var m1 = this.tmpLBS.m1;
	for (var i = 0, n = weights.length; i < n; ++i) {
	    var vrec = weights[i];
	    var mb = vrec[0][prop];
	    var weight = vrec[1];

	    if (i == 0) {
		mat4.multiplyScalar(m0, mb, weight);
	    } else {
		mat4.multiplyScalar(m1, mb, weight);
		mat4.add(m0, m0, m1);
	    }
	}

	vec3.transformMat4(out, p, m0);
	return out;
    },

    tmpDQS: {
        q0: dquat.create(),
        q1: dquat.create(),
	m0: mat4.create()
    },

    vertexUpdateDQS: function(out, weights, p, prop) {
	var q = this.tmpDQS.q0;
	var qblend = this.tmpDQS.q1;

        var vrec = weights[0];
        var qb = vrec[0][prop];
        var weight = vrec[1];
        var q0 = qb;
        dquat.scale(qblend, qb, weight);
	for (var i = 1, n = weights.length; i < n; ++i) {
	    vrec = weights[i];
	    qb = vrec[0][prop];
	    weight = vrec[1];
            if (dquat.dot(q0, qb) < 0) {
                weight = -weight;
	    }
            dquat.scale(q, qb, weight);
            dquat.add(qblend, qblend, q);
	}
	dquat.normalize(qblend, qblend);

	var c0 = qblend[0];
	var ce = qblend[1];
	var x0 = c0[0], y0 = c0[1], z0 = c0[2], w0 = c0[3];
	var xe = ce[0], ye = ce[1], ze = ce[2], we = ce[3];
	var t0 = 2 * (-we * x0 + xe * w0 - ye * z0 + ze * y0);
	var t1 = 2 * (-we * y0 + xe * z0 + ye * w0 - ze * x0);
	var t2 = 2 * (-we * z0 - xe * y0 + ye * x0 + ze * w0);
	var m = this.tmpDQS.m0;
	// col0
	m[0] = 1 - 2 * y0*y0 - 2 * z0*z0;
	m[1] = 2 * x0 * y0 + 2 * w0 * z0;
	m[2] = 2 * x0 * z0 - 2 * w0 * y0;
	m[3] = 0;
	// col1
	m[4] = 2 * x0 * y0 - 2 * w0 * z0;
	m[5] = 1 - 2 * x0*x0 - 2 * z0*z0;
	m[6] = 2 * y0 * z0 + 2 * w0 * x0;
	m[7] = 0;
	// col2
	m[8] = 2 * x0 * z0 + 2 * w0 *y0;
	m[9] = 2 * y0 * z0 - 2 * w0 * x0;
	m[10] = 1 - 2 * x0*x0 - 2 * y0*y0;
	m[11] = 0;
	// col3
	m[12] = t0;
	m[13] = t1;
	m[14] = t2;
	m[15] = 1;

	vec3.transformMat4(out, p, m);
	return out;
    },

    normalsUpdate: function(coords) {
	var nv = this.mesh.vertices.length * 3;
	var normalSums = this.normalSums;
	if (!normalSums || normalSums.length != nv) {
	    normalSums = this.normalSums = new Float32Array(nv);
	} else {
	    /* reset the normal sums buffer */
	    normalSums.fill(0.0);
	}
	var groups = this.mesh.material_groups;
	var polygons = this.mesh.polygons;
	var normal = vec3.create();
	for (var i = 0, n = groups.length; i < n; ++i) {
	    var polys = groups[i].polygons;
	    for (var j = 0, m = polys.length; j < m; ++j) {
		var poly = polygons[polys[j]];
                utils.surfaceNormal(normal, coords, poly);
		for (var k = 0, l = poly.length; k < l; ++k) {
		    this.normalUpdate(poly[k], normal, normalSums);
		}
	    }
	}
	this.normalsAvg(normalSums);
    },

    normalUpdate: function(index, normal, normalSums) {
	var ni = index * 3;
	normalSums[ni++] += normal[0];
	normalSums[ni++] += normal[1];
	normalSums[ni++] += normal[2];
    },

    normalsAvg: function(normalSums) {
	var n = this.mesh.vertices.length * 3;
	var avgs = this.normals;
	if (!avgs || avgs.length != n) {
	    avgs = this.normals = new Float32Array(n);
	}
	var missing = 0;
	var i = 0;
	while (i < n) {
	    var nx = normalSums[i];
	    var ny = normalSums[i + 1];
	    var nz = normalSums[i + 2];
	    var m = nx*nx + ny*ny + nz*nz;
	    if (m == 0) {
		++missing;
		avgs[i++] = 0;
		avgs[i++] = 0;
		avgs[i++] = 1;
	    } else {
		m = Math.sqrt(m);
		avgs[i++] = nx / m;
		avgs[i++] = ny / m;
		avgs[i++] = nz / m;
	    }
	}
	if (missing > 0) {
	    utils.debug && console.log("missing surface normals for " + missing + " vertices");
	}
    },

    transfer: function(state, transferList, update) {
	if (update) {
	    this.dirty = true;
	    this.meshUpdate();
	}
	var n = this.buffers.length;
	if (!state.buffers || state.buffers.length != n) {
	    state.buffers = new Array(n);
	}
	for (var i = 0; i < n; ++i) {
	    var buffer = state.buffers[i];
	    if (!buffer) {
		buffer = state.buffers[i] = {};
	    }
	    this.buffers[i].transfer(buffer, transferList);
	}

	n = this.followers.length;
	if (!state.followers || state.followers.length != n) {
	    state.followers = new Array(n);
	}
	for (i = 0; i < n; ++i) {
	    var follower = state.followers[i];
	    if (!follower) {
		follower = state.followers[i] = {};
	    }
	    this.followers[i].transfer(follower, transferList, update);
	}
    }
});

/**
 * https://en.wikipedia.org/wiki/Octree
 */
utils.Octree = utils.extend(utils.Object, {
    /**
     * Initialize the octree.
     * @param {[x0,y0,z0, ...]} coords the optional coords array to load
     */
    init: function(coords) {
	this.root = null;
	if (coords) {
	    this.load(coords);
	}
    },

    /**
     * Load the coordinates into the octree.
     * @param {[x0,y0,z0,...]} coords the array of unpacked coordinates
     */
    load: function(coords) {
	var start = self.performance.now();
	var n = coords.length;
	utils.assert && utils.assert(
	    n > 0 && n % 3 == 0,
	    "coordinates array length must be a multiple of three"
	);
	this.coords = coords;

	n = Math.floor(n / 3);
	var set = [];
	for (var i = 0; i < n; ++i) {
	    set.push(i);
	}
	this.root = this.nodeCreate(set);
	var elapsed = self.performance.now() - start;
	utils.debug && console.log(
	    "loaded octree with " + n + " vertices in " + elapsed + " msec"
	);
    },

    /**
     * Debugging routine to validate that all coordinates in the octree can be found.
     */
    validate: function() {
	if (this.root && !this.validateNode(this.root)) {
	    return false;
	}

	var start = self.performance.now();
	var valid = true;
	var coords = this.coords;
	var n = Math.floor(coords.length / 3);
	for (var i = 0; i < n; ++i) {
	    var ci = i * 3;
	    var x = coords[ci], y = coords[ci + 1], z = coords[ci + 2];
	    var match = this.findNearest(x, y, z);
	    if (!match || match.index != i) {
		valid = false;
		var pt = null;
		if (match) {
		    ci = match.index * 3;
		    pt = [coords[ci], coords[ci + 1], coords[ci + 2]];
		    console.log("nearest point to #" + i + " " + [x,y,z] + " is",
				match, pt);
		} else {
		    console.log("no nearest point to #" + i + " " + [x,y,z]);
		}
		break;
	    }
	}
	var elapsed = self.performance.now() - start;
	utils.debug && console.log(
	    "validated octree with " + n + " vertices in " + elapsed + " msec"
	);
	return valid;
    },
    validateNode: function(node) {
	if (node.cx < node.xmin || node.cx > node.xmax ||
	    node.cy < node.ymin || node.cy > node.ymax ||
	    node.cz < node.zmin || node.cz > node.zmax) {
	    console.log("node center is not in the bounding box", node);
	    return false;
	}
	var coords = this.coords;
	for (var i = 0, n = node.set.length; i < n; ++i) {
	    var ci = node.set[i] * 3;
	    var x = coords[ci];
	    var y = coords[ci + 1];
	    var z = coords[ci + 2];
	    if (x < node.xmin || x > node.xmax ||
		y < node.ymin || y > node.ymax ||
		z < node.zmin || z > node.zmax) {
		console.log("node point is not in the bounding box",
			    node,
			    node.set[i], [x, y, z]);
		return false;
	    }
	}
	var octants = node.octants;
	if (octants) {
	    for (i = 0; i < 8; ++i) {
		var octant = octants[i];
		if (octant) {
		    if (!this.validateNode(octant)) {
			return false;
		    }
		}
	    }
	}
	return true;
    },

    /**
     * Find the coordinate index of the nearest point to x,y,z.
     * @param {Number} x the x coordinate
     * @param {Number} y the y coordinate
     * @param {Number} z the z coordinate
     */
    findNearest: function(x, y, z, maxDist, maxMatches) {
	if (this.root) {
	    if (maxDist == undefined) {
		maxDist = 0;
	    }
	    if (maxMatches == undefined) {
		maxMatches = 1;
	    }
	    var query = {
		x: x,
		y: y,
		z: z,
		maxDist: maxDist,
		maxMatches: maxMatches,
		matches: [],
		matchDist: maxDist * maxDist
	    };
	    this.nodeFindNearest(this.root, query);
	    if (query.matches.length > 0) {
		if (maxMatches > 1) {
		    return query.matches;
		}
		var best = query.matches[0];
		return {
		    matches: query.matches,
		    index: best[0],
		    dist: Math.sqrt(best[1])
		};
	    }
	}
	return null;
    },

    /**
     * Helper method for recursively searching the octree.
     * query = {
     *   // input params
     *   x: <number>,
     *   y: <number>,
     *   z: <number>,
     *   maxDist: <number>,
     *   maxMatches: <integer>,
     *
     *   // output params
     *   matches: [ [<index>, <sqDist> ], ... ],
     *   matchDist: <number>
     * }
     * @private
     */
    nodeFindNearest: function(node, query) {
	var octants = node.octants;
	if (octants) {
	    for (var i = 0; i < 8; ++i) {
		var octant = node.octants[i];
		if (octant && this.nodeContains(octant, query)) {
		    this.nodeFindNearest(octant, query);
		}
	    }
	}

	/* leaf node */
	var x = query.x, y = query.y, z = query.z;
	var matches = query.matches;
	var m = matches.length;
	var mMax = query.maxMatches;
	var matchDist = query.matchDist;
	var set = node.set;
	var coords = this.coords;
	for (var i = 0, n = set.length; i < n; ++i) {
	    var idx = set[i];
	    var ci = idx * 3;
	    var px = coords[ci], py = coords[ci + 1], pz = coords[ci + 2];
	    var dist = this.sqDist(x, y, z, px, py, pz);
	    if (dist > matchDist) {
		continue;
	    }
	    if (m == 0) {
		/* first match */
		matches.push([idx, dist]);
		m = 1;
		continue;
	    }

	    /* add match */
	    var inserted = false;
	    for (var j = 0; j < m; ++j) {
		var rec = matches[j];
		if (dist < rec[1]) {
		    inserted = true;
		    matches.splice(j, 0, [idx, dist]);
		    break;
		}
	    }
	    if (!inserted) {
		if (m < mMax) {
		    matches.push([idx, dist]);
		    ++m;
		}
		continue;
	    }

	    if (m > mMax) {
		/* discard worst match */
		matches.length = m = mMax;
		var last = matches[m - 1];
		if (matchDist > last[1]) {
		    query.matchDist = matchDist = last[1];
		    query.maxDist = Math.sqrt(matchDist);
		}
	    }
	}
    },

    /**
     * Is the point in the node's bounding box +/- the maxDist?
     * query = {
     *   x: <number>,
     *   y: <number>,
     *   z: <number>,
     *   maxDist: <number>
     */
    nodeContains: function(node, query) {
	var x = query.x, y = query.y, z = query.z;
	var delta = query.maxDist || 0;
	return (x >= node.xmin - delta && x <= node.xmax + delta &&
		y >= node.ymin - delta && y <= node.ymax + delta &&
		z >= node.zmin - delta && z <= node.zmax + delta);
    },

    /**
     * Create an octree node for the set of points.
     * @private
     */
    nodeCreate: function(set) {
	var i, n = set.length;
	var coords = this.coords;

	/* compute the bounding box and center */
	var xmin, xmax;
	var ymin, ymax;
	var zmin, zmax;
	for (i = 0; i < n; ++i) {
	    var ci = set[i] * 3;
	    var x = coords[ci++];
	    var y = coords[ci++];
	    var z = coords[ci++];
	    if (i == 0) {
		xmin = xmax = x;
		ymin = ymax = y;
		zmin = zmax = z;
	    } else {
		if (xmin > x) xmin = x;
		if (xmax < x) xmax = x;
		if (ymin > y) ymin = y;
		if (ymax < y) ymax = y;
		if (zmin > z) zmin = z;
		if (zmax < z) zmax = z;
	    }
	}
	var cx = (xmax + xmin) / 2;
	var cy = (ymax + ymin) / 2;
	var cz = (zmax + zmin) / 2;

	/* divide the points into octants */
	var octants = [ [], [], [], [], [], [], [], [] ];
	for (i = 0; i < n; ++i) {
	    var ci = set[i] * 3;
	    var x = coords[ci++];
	    var y = coords[ci++];
	    var z = coords[ci++];
	    var oi = this.octantIndex(cx, cy, cz, x, y, z);
	    var octant = octants[oi].push(i);
	}

	/* create the node */
	var node = {
	    set: set,
	    cx: cx,
	    cy: cy,
	    cz: cz,
	    xmin: xmin,
	    xmax: xmax,
	    ymin: ymin,
	    ymax: ymax,
	    zmin: zmin,
	    zmax: zmax
	};
	if (n > 8) {
	    node.octants = [];
	    for (i = 0; i < 8; ++i) {
		var octant = octants[i];
		if (octant.length == 0) {
		    node.octants.push(null);
		} else {
		    node.octants.push(this.nodeCreate(octant));
		}
	    }
	}
	return node;
    },

    /**
     * Determine the octant index given a center point
     * and query point.
     * @private
     */
    octantIndex: function(cx, cy, cz, qx, qy, qz) {
	var dx = qx - cx;
	var dy = qy - cy;
	var dz = qz - cz;

	// octants:
	//  0: -x,-y,-z
	//  1: -x,-y,+z
	//  2: -x,+y,-z
	//  3: -x,+y,+z
	//  4: +x,-y,-z
	//  5: +x,-y,+z
	//  6: +x,+y,-z
	//  7: +x,+y,+z
	return (
	    (dx < 0 ? 0 : 4) +
	    (dy < 0 ? 0 : 2) +
	    (dz < 0 ? 0 : 1)
	);
    },

    /**
     * Compute the square of the distance between two points.
     * @private
     */
    sqDist: function(xa, ya, za, xb, yb, zb) {
	var dx = xb - xa;
	var dy = yb - ya;
	var dz = zb - za;
	return dx*dx + dy*dy + dz*dz;
    }
});

/**
 * Index for a set of coordinates.
 */
utils.CoordIndex = utils.extend(utils.Object, {
    /**
     * Initialize the object.
     * @param {[x0,y0,z0,...]} coords the array of unpacked coordinates
     */
    init: function(coords) {
        this.load(coords);
    },

    /**
     * Load the coordinates into the index.
     */
    load: function(coords) {
	var start = self.performance.now();
        var n = coords.length;
        utils.assert && utils.assert(
            n % 3 == 0,
            "coordinates array length must be a multiple of three"
        );
        this.coords = coords;
        
        n = Math.floor(n / 3);
        var xIndex = this.xIndex;
        if (!xIndex || xIndex.length != n) {
            xIndex = this.xIndex = new Array(n);
        }
        var yIndex = this.yIndex;
        if (!yIndex || yIndex.length != n) {
            yIndex = this.yIndex = new Array(n);
        }
        var zIndex = this.zIndex;
        if (!zIndex || zIndex.length != n) {
            zIndex = this.zIndex = new Array(n);
        }
        var j = 0, rec;
        for (var i = 0; i < n; ++i) {
            var x = coords[j++];
            var y = coords[j++];
            var z = coords[j++];
            rec = xIndex[i];
            if (!rec) {
                xIndex[i] = [i, x];
            } else {
                rec[0] = i;
                rec[1] = x;
            }
            rec = yIndex[i];
            if (!rec) {
                yIndex[i] = [i, y];
            } else {
                rec[0] = i;
                rec[1] = y;
            }
            rec = zIndex[i];
            if (!rec) {
                zIndex[i] = [i, z];
            } else {
                rec[0] = i;
                rec[1] = z;
            }
        }
        xIndex.sort(this.indexSort);
        yIndex.sort(this.indexSort);
        zIndex.sort(this.indexSort);

        var bbox = this.boundingBox;
        if (!bbox) {
            bbox = this.boundingBox = {};
        }
        var end = n - 1;
        bbox.xmin = xIndex[0][1];
        bbox.xmax = xIndex[end][1];
        bbox.ymin = yIndex[0][1];
        bbox.ymax = yIndex[end][1];
        bbox.zmin = zIndex[0][1];
        bbox.zmax = zIndex[end][1];
	bbox.width = bbox.xmax - bbox.xmin;
	bbox.height = bbox.ymax - bbox.ymin;
	bbox.depth = bbox.zmax - bbox.zmin;
	var elapsed = self.performance.now() - start;
	utils.debug && console.log(
	    "loaded index with " + n + " vertices in " + elapsed + " msec",
            bbox
	);
    },
    indexSort: function(a, b) {
        return a[1] - b[1];
    },

    /**
     * Find coordinates contained within the target sphere.
     * @param {float} x the x coordinate of the target sphere
     * @param {float} y the y coordinate of the target sphere
     * @param {float} z the z coordinate of the target sphere
     * @param {float} r the radius of the target sphere
     * @returns an array of matches [[vi, sqDist], ...] sorted by increasing sqDist
     *  or null if no matches were found
     */
    inSphere: function(x, y, z, r) {
        var xs = this.indexFirst(this.xIndex, x, x - r);
        if (xs < 0) {
            return null;
        }
        var xe = this.indexLast(this.xIndex, x, x + r);
        if (xe < 0) {
            return null;
        }
        var ys = this.indexFirst(this.yIndex, y, y - r);
        if (xs < 0) {
            return null;
        }
        var ye = this.indexLast(this.yIndex, y, y + r);
        if (ye < 0) {
            return null;
        }
        var zs = this.indexFirst(this.zIndex, z, z - r);
        if (xs < 0) {
            return null;
        }
        var ze = this.indexLast(this.zIndex, z, z + r);
        if (ze < 0) {
            return null;
        }

        /* iterate over the smallest range */
        var xn = xe - xs;
        var yn = ye - ys;
        var zn = ze - zs;
        if (xn <= yn && xn <= zn) {
            return this.inSphereIndex(x, y, z, r, this.xIndex, xs, xe);
        } else if (yn <= zn) {
            return this.inSphereIndex(x, y, z, r, this.yIndex, ys, ye);
        } else {
            return this.inSphereIndex(x, y, z, r, this.zIndex, zs, ze);
        }
    },
    inSphereIndex: function(x, y, z, r, index, start, end) {
        var m = [];
        var r2 = r * r;
        var coords = this.coords;
        while (start <= end) {
            var vi = index[start++][0];
            var ci = vi * 3;
            var cx = coords[ci];
            var cy = coords[ci + 1];
            var cz = coords[ci + 2];
            var dx = cx - x;
            var dy = cy - y;
            var dz = cz - z;
            var d2 = dx * dx + dy * dy + dz * dz;
            if (d2 <= r2) {
                m.push([vi, d2]);
            }
        }
        if (m.length == 0) {
            return null;
        }
        m.sort(this.indexSort);
        return m;
    },

    /**
     * Find the first record whose coordinate >= t.
     */
    indexFirst: function(index, t) {
        var i = 0, j = index.length - 1;
        if (j < 0) {
            /* empty index */
            return -1;
        }
        var v = index[i][1];
        if (v >= t) {
            /* first entry */
            return i;
        }
        v = index[j][1];
        if (v < t) {
            /* not contained in the index */
            return -1;
        } else if (v != t) {
            /* binary search */
            while (i < j) {
                /*
                 * invariant:
                 *  index[i][1] < t
                 *  index[j][1] > t 
                 */
                var m = Math.floor((i + j) / 2);
                v = index[m][1];
                if (v == t) {
                    j = m;
                    break;
                } else if (v < t) {
                    i = m;
                } else if (v > t) {
                    j = m;
                }
            }
        }
        // find the first index[j][1] == v
        v = index[j][1];
        while (j - 1 > i) {
            /*
             * invariant:
             *  index[i][1] < v
             *  index[j][1] >= v
             */
            if (index[j - 1][1] == v) {
                --j;
            } else {
                break;
            }
        }
        return j;
    },

    /**
     * Find the last record whose coordinate <= t.
     */
    indexLast: function(index, t) {
        var i = 0, j = index.length - 1;
        if (j < 0) {
            /* empty index */
            return -1;
        }
        var v = index[j][1];
        if (v <= t) {
            /* last entry */
            return j;
        }
        v = index[i][1];
        if (v > t) {
            /* not contained in the index */
            return -1;
        } else if (v != t) {
            /* binary search */
            while (i < j) {
                /*
                 * invariant:
                 *  index[i][1] < t
                 *  index[j][1] > t 
                 */
                var m = Math.floor((i + j) / 2);
                v = index[m][1];
                if (v == t) {
                    i = m;
                    break;
                } else if (v < t) {
                    i = m;
                } else if (v > t) {
                    j = m;
                }
            }
        }
        // find the last index[i][1] >= v
        v = index[i][1];
        while (i + 1 < j) {
            /*
             * invariant:
             *  index[i][1] <= v
             *  index[j][1] > v
             */
            if (index[i + 1][1] == v) {
                ++i;
            } else {
                break;
            }
        }
        return i;
    },

    /**
     * Debugging routine to validate that all coordinates can be found in the index.
     */
    validate: function() {
	var start = self.performance.now();
	var valid = true;
	var coords = this.coords;
	var n = Math.floor(coords.length / 3);
        for (var i = 0; i < n; ++i) {
	    var ci = i * 3;
	    var x = coords[ci], y = coords[ci + 1], z = coords[ci + 2];
            var m = this.inSphere(x, y, z, 0);
            if (!m || m.length != 1 || m[0][0] != i) {
                valid = false;
                console.log("invalid match for coordinate #" + i, m, m && m.length);
                break;
            }
        }
	var elapsed = self.performance.now() - start;
	utils.debug && console.log(
	    "validated index with " + n + " vertices in " + elapsed + " msec"
	);
        return valid;
    }
});

utils.AutoFit = utils.extend(utils.Object, {
    init: function(mesh, parent, dist) {
	this.mesh = mesh;
	this.autoFitMap = {};
	parent.autoFits.push(this);

	var pcoords = parent.coords;
	var ptree = parent.octree;
	if (!ptree) {
	    ptree = parent.octree = utils.Octree.create(pcoords);
	}
	var autoFitMap = this.autoFitMap;
	var coords = mesh.coords;
	var n = coords.length / 3;
	var missing = 0;
	for (var i = 0, j = 0; i < n; ++i) {
	    var x = coords[j++];
	    var y = coords[j++];
	    var z = coords[j++];
	    var matches = ptree.findNearest(x, y, z, dist, 4);
	    if (!matches) {
		++missing;
		continue;
	    }
	    autoFitMap[i] = matches;
	}
	if (missing > 0) {
	    console.log("missing matches", missing);
	}
    },

    morphs: function(morphs) {
	var autoFitMorphs = {};
	var autoFitMap = this.autoFitMap;
	for (var idx in autoFitMap) {
	    var matches = autoFitMap[idx];
	    var dx = 0, dy = 0, dz = 0;
	    var m = 0;
	    for (var i = 0, n = matches.length; i < n; ++i) {
		var match = matches[i];
		var morph = morphs[match[0]];
		if (morph) {
		    dx += morph[0];
		    dy += morph[1];
		    dz += morph[2];
		    ++m;
		}
	    }
	    if (m > 1) {
		dx /= m;
		dy /= m;
		dz /= m;
	    }
	    if (m > 0) {
		autoFitMorphs[idx] = [dx, dy, dz];
	    }
	}
	this.mesh.autoFitMorphs = autoFitMorphs;
    }
});
