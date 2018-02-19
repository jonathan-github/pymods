
utils.test = {
    epsilon: 1e-3,

    error: function(msg) {
	throw new Error(msg);
    },

    numberCheck: function(a, b) {
	return (Math.abs(a - b) < utils.test.epsilon);
    },

    numberEq: function(a, b) {
	if (!utils.test.numberCheck(a, b)) {
	    utils.test.error(
		"expected " + a + " == " + b
	    );
	}
    },

    mat3Eq: function(a, b) {
	for (var i = 0; i < 9; ++i) {
	    if (!utils.test.numberCheck(a[i], b[i])) {
		utils.test.error(
		    "matrices are not equal:\n" +
		    mat3.str(a) + " and\n" + mat3.str(b) +
		    "\na[" + i + "]=" + a[i] + " b[" + i + "]=" + b[i]
		);
	    }
	}
    },

    mat4Eq: function(a, b) {
	for (var i = 0; i < 16; ++i) {
	    if (!utils.test.numberCheck(a[i], b[i])) {
		utils.test.error(
		    "matrices are not equal:\n" +
		    mat4.str(a) + " and\n" + mat4.str(b) +
		    "\na[" + i + "]=" + a[i] + " b[" + i + "]=" + b[i]
		);
	    }
	}
    },

    quatCheck: function(a, b) {
	for (var i = 0; i < 4; ++i) {
	    if (!utils.test.numberCheck(a[i], b[i])) {
		return false;
	    }
	}
	return true;
    },

    quatEq: function(a, b) {
	if (!utils.test.quatCheck(a, b)) {
	    utils.test.error(
		"quaternions are not equal:\n" +
		quat.str(a) + " and\n" + quat.str(b)
	    );
	}
    },

    dquatEq: function(a, b) {
	if (!utils.test.quatCheck(a[0], b[0]) ||
	    !utils.test.quatCheck(a[1], b[1])) {
	    utils.test.error(
		"dual quaternions are not equal:\n" +
		dquat.str(a) + " and\n" + dquat.str(b)
	    );
	}
    },

    vec3Eq: function(a, b) {
	for (var i = 0; i < 3; ++i) {
	    if (!utils.test.numberCheck(a[i], b[i])) {
		utils.test.error(
		    "vectors are not equal:\n" +
		    vec3.str(a) + " and\n" + vec3.str(b)
		);
	    }
	}
    }
};

utils.test.dquat = function() {
    console.log("utils.test.dquat");

    // test create
    console.log("testing create");
    var q = dquat.create();
    console.log("q =", dquat.str(q));
    utils.test.dquatEq(q, dquat.create());

    // test clone
    console.log("testing clone");
    quat.copy(q[0], [1, 2, 3, 4]);
    quat.copy(q[1], [5, 6, 7, 8]);
    var tmp = dquat.clone(q);
    console.log("clone =", dquat.str(tmp));
    utils.test.dquatEq(q, tmp);

    // test copy
    console.log("testing copy");
    tmp = dquat.create();
    dquat.copy(tmp, q);
    console.log("copy =", dquat.str(tmp));
    utils.test.dquatEq(q, tmp);

    // pure rotation mat4
    console.log("testing rotaton");
    var mr = mat4.create();
    mat4.rotateX(mr, mr, Math.PI/4);
    console.log("mr =", mat4.str(mr));
    //
    q = dquat.create();
    dquat.fromMat4(q, mr);
    console.log("mr => q =", dquat.str(q));
    //
    tmp = mat4.create();
    dquat.toMat4(tmp, q);
    utils.test.mat4Eq(mr, tmp);

    // test rotation accessor
    console.log("testing rotation accessor");
    var r = mat3.create();
    mat3.fromMat4(r, mr);
    console.log("r =", mat3.str(r));
    var rq = quat.create();
    dquat.toRotation(rq, q);
    console.log("rq =", mat3.str(rq));
    var rqm = mat3.create();
    mat3.fromQuat(rqm, rq);
    utils.test.mat3Eq(r, rqm);

    // pure translation mat4
    console.log("testing translation");
    var mt = mat4.create();
    mat4.translate(mt, mt, [1, 2, 3]);
    console.log("mt =", mat4.str(mt));
    //
    dquat.fromMat4(q, mt);
    console.log("mt => q =", dquat.str(q));
    //
    tmp = mat4.create();
    dquat.toMat4(tmp, q);
    utils.test.mat4Eq(mt, tmp);

    // test translation accessor
    console.log("testing translation accessor");
    var t = vec3.fromValues(mt[12], mt[13], mt[14]);
    console.log("t =", vec3.str(t));
    var tq = vec3.create();
    dquat.toTranslation(tq, q);
    console.log("tq =", vec3.str(tq));
    utils.test.vec3Eq(t, tq);

    // combined rotation and translation
    console.log("testing rotation + translation");
    var mrt = mat4.create();
    mat4.multiply(mrt, mr, mt);
    console.log("mr mt =", mat4.str(mrt));
    //
    dquat.fromMat4(q, mrt);
    console.log("mr mt => q =", dquat.str(q));
    dquat.toMat4(tmp, q);
    utils.test.mat4Eq(mrt, tmp);

    // combined translation and rotation
    console.log("testing translation + rotation");
    var mtr = mat4.create();
    mat4.multiply(mtr, mt, mr);
    console.log("mt mr =", mat4.str(mtr));
    //
    dquat.fromMat4(q, mtr);
    console.log("mt mr => q =", dquat.str(q));
    dquat.toMat4(tmp, q);
    utils.test.mat4Eq(mtr, tmp);

    var m = mtr;

    // test normalization
    console.log("testing normalize");
    var qn = dquat.create();
    dquat.normalize(qn, q);
    console.log("||q|| =", dquat.str(qn));
    // test magnitude
    utils.test.numberEq(1, dquat.length(qn));

    // test normalization x2
    console.log("testing normalize x2");
    var qnn = dquat.create();
    dquat.normalize(qnn, qn);
    console.log("||q|| x2 =", dquat.str(qnn));
    utils.test.dquatEq(qn, qnn);

    // test ||q|| = q q* for unit dquat
    console.log("testing ||q|| = q q* = 1 for unit dquat");
    var qc = dquat.create();
    dquat.conjugate(qc, qn);
    console.log("q* =", dquat.str(qc));
    dquat.multiply(qc, qc, qn);
    console.log("qq* =", dquat.str(qc));
    utils.test.numberEq(1, dquat.length(qc));

    // test vector transform
    console.log("test vector transform");
    var v = vec3.fromValues(3, 4, 5);
    console.log("v =", vec3.str(v));
    var vt = vec3.create();
    vec3.transformMat4(vt, v, m);
    console.log("m v =", vec3.str(vt));
    var im = mat4.create();
    mat4.invert(im, m);
    var vtt = vec3.create();
    vec3.transformMat4(vtt, vt, im);
    console.log("inv(m) m v =", vec3.str(vtt));
    utils.test.vec3Eq(v, vtt);

    // TBD: need to implement p' = q p q*
};
