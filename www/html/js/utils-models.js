/**
 * Cone model
 */
utils.Cone = utils.extend(utils.Object, {
    DEFAULT_CONFIG: {
	radius: 1,
	height: 1,
	n: 4
    },

    init: function(gl, config) {
	if (!config) {
	    config = this.DEFAULT_CONFIG;
	}
	var radius = config.radius;
	var height = config.height;
	var n = config.n;
	if (radius == undefined || radius <= 0) {
	    radius = 1.0;
	}
	if (height == undefined || height <= 0) {
	    height = 1.0;
	}
	if (n == undefined || n < 4) {
	    n = 4;
	}

	var coords = [0, 0, height];
	var colors;
	if (config.colorTop && config.colorBottom) {
	    colors = [];
	    utils.append(colors, config.colorTop);
	}

	var dt = 2 * Math.PI / n;
	for (var i = 0, t = 0; i < n; ++i, t += dt) {
	    var x = radius * Math.cos(t);
	    var y = radius * Math.sin(t);
	    coords.push(x, y, 0);
	    if (colors) {
		utils.append(colors, config.colorBottom);
	    }
	}
	coords.push(coords[3], coords[4], coords[5]);
	if (colors) {
	    utils.append(colors, config.colorBottom);
	}

	this.coords = utils.ArrayBuffer3f.create(
	    gl, "cone.coords", coords
	);
	this.coords.mode = gl.TRIANGLE_FAN;

	if (colors) {
	    this.colors = utils.ArrayBuffer4f.create(
		gl, "cone.colors", colors
	    );
	}
	if (config.color) {
	    this.color = config.color;
	}
	return this;
    },

    draw: function(gl, program) {
	if (program.uniforms.mMatrix && this.mMatrix) {
	    program.uniforms.mMatrix.set(this.mMatrix);
	}
	if (program.uniforms.uColor && this.color) {
	    program.uniforms.uColor.set(this.color);
	}
	if (program.attributes.aColor && this.colors) {
	    program.attributes.aColor.set(this.colors);
	}
	program.attributes.aCoord.set(this.coords);
	program.update(gl);
	this.coords.draw(gl);
    }
});

/**
 * SkyBox model.
 */
utils.SkyBox = utils.extend(utils.Object, {
    init: function(gl, config) {
	// vertex coordinates (f=front b=back T=top B=bottom L=left R=right)
	var coords = [
	    // front
	    -1, -1, -1,	// 0: fBL
	    +1, -1, -1,	// 1: fBR
	    +1, +1, -1,	// 2: fTR
	    -1, +1, -1,	// 3: fTL

	    // back
	    -1, -1, +1,	// 4: bBL
	    +1, -1, +1,	// 5: bBR
	    +1, +1, +1,	// 6: bTR
	    -1, +1, +1	// 7: bTL
	];

	// CCW indices to face inside
	var indices = [
	    // front: fBL,fBR,fTR fTR,fTL,fBL
	    0,1,2, 2,3,0,

	    // back: bBR,bBL,bTL bTL,bTR,bBR
	    5,4,7, 7,6,5,

	    // left: bBL,fBL,fTL fTL,bTL,bBL
	    4,0,3, 3,7,4,

	    // right: fBR,bBR,bTR bTR,fTR,fBR
	    1,5,6, 6,2,1,

	    // top: fTL,fTR,bTR bTR,bTL,fTL
	    3,2,6, 6,7,3,

	    // bottom: bBL,bBR,fBR fBR,fBL,bBL
	    4,5,1, 1,0,4
	];

	this.coords = Object.create(utils.ArrayBuffer3f).init(
	    gl, "skybox.coords", coords
	);
	this.indices = Object.create(utils.ElementBuffer).init(
	    gl, "skybox.indices", indices
	);
	return this;
    },

    draw: function(gl, program) {
	if (this.texture) {
	    this.texture.update(gl);
	}
	if (this.mMatrix) {
	    program.uniforms.mMatrix.set(this.mMatrix);
	}
	if (this.vMatrix) {
	    program.uniforms.vMatrix.set(this.vMatrix);
	}
	program.attributes.aCoord.set(this.coords);
	program.update(gl);
	gl.disable(gl.DEPTH_TEST);
	gl.enable(gl.CULL_FACE);
	gl.cullFace(gl.BACK);
	this.indices.draw(gl);
	gl.disable(gl.CULL_FACE);
	gl.enable(gl.DEPTH_TEST);
    }
});
