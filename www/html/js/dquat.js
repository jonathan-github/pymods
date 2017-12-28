var dquat = {
    cache_q: [],
    cache_v: [],

    q: function(i, init) {
	var q = dquat.cache_q[i];
	if (!q) {
	    q = dquat.cache_q[i] = quat.create();
	}
	if (init) {
	    quat.copy(q, init);
	}
	return q;
    },
    v: function(i, init) {
	var v = dquat.cache_v[i];
	if (!v) {
	    v = dquat.cache_v[i] = vec3.create();
	}
	if (init) {
	    vec3.copy(v, init);
	}
	return v;
    },

    create: function() {
	return [
	    quat.fromValues(0,0,0,1),
	    quat.fromValues(0,0,0,0)
	];
    },

    identity: function(out) {
	quat.set(out[0], 0,0,0,1);
	quat.set(out[1], 0,0,0,0);
    },

    copy: function(out, a) {
	quat.copy(out[0], a[0]);
	quat.copy(out[1], a[1]);
    },

    clone: function(a) {
	return [quat.clone(a[0]), quat.clone(a[1])];
    },

    conjugate: function(out, q) {
	quat.conjugate(out[0], q[0]);
	quat.conjugate(out[1], q[1]);
	return out;
    },

    length: function(q) {
	return quat.length(q[0]);
    },

    normalize: function(out, q) {
	return dquat.scale(out, q, 1 / quat.length(q[0]));
    },

    add: function(out, a, b) {
	var ra = a[0], da = a[1];
	var rb = b[0], db = b[1];
	var r = out[0], d = out[1];
	quat.add(r, ra, rb);
	quat.add(d, da, db);
	return out;
    },

    multiply: function(out, a, b) {
	var ra = a[0], da = a[1];
	var rb = b[0], db = b[1];
	var r = out[0], d = out[1];

	var rtmp = dquat._q_0;
	if (!rtmp) {
	    rtmp = dquat._q_0 = quat.create();
	}
	quat.multiply(rtmp, ra, rb);

	var dtmp1 = dquat._q_1;
	if (!dtmp1) {
	    dtmp1 = dquat._q_1 = quat.create();
	}
	var dtmp2 = dquat._q_2;
	if (!dtmp2) {
	    dtmp2 = dquat._q_2 = quat.create();
	}
	quat.multiply(dtmp1, ra, db);
	quat.multiply(dtmp2, da, rb);
	quat.add(d, dtmp1, dtmp2);
	quat.copy(r, rtmp);

	if (false) {
	var tmp = quat.create();
	quat.multiply(tmp, rb, da);
	quat.add(d, d, tmp);
	}
	return out;
    },

    dot: function(a, b) {
	return quat.dot(a[0], b[0]);
    },

    scale: function(out, q, s) {
	quat.scale(out[0], q[0], s);
	quat.scale(out[1], q[1], s);
	return out;
    },

    fromMat4: function(out, m) {
	var r = dquat._m3_0;
	if (!r) {
	    r = dquat._m3_0 = mat3.create();
	}
	mat3.fromMat4(r, m);

	var qr = out[0], qd = out[1];
	quat.fromMat3(qr, r);
	quat.normalize(qr, qr);
	qd[0] = m[12];
	qd[1] = m[13];
	qd[2] = m[14];
	qd[3] = 0;
	quat.multiply(qd, qd, qr);
	quat.scale(qd, qd, 1/2);
	return out;
    },

    fromRotationTranslation: function(out, r, t) {
	var qr = out[0], qd = out[1];
	qd[0] = t[0];
	qd[1] = t[1];
	qd[2] = t[2];
	qd[3] = 0;
	quat.multiply(qd, qd, qr);
	quat.scale(qd, qd, 1/2);
	return out;
    },

    toMat4: function(out, q) {
	var qr = q[0], qd = q[1];
	var t = dquat._q_0;
	if (!t) {
	    t = dquat._q_0 = quat.create();
	}
	quat.conjugate(t, qr);
	quat.multiply(t, qd, t);
	quat.scale(t, t, 2);
	var v = dquat._v3_0;
	if (!v) {
	    v = dquat._v3_0 = vec3.create();
	}
	vec3.set(v, t[0], t[1], t[2]);
	mat4.fromRotationTranslation(out, qr, v);
	return out;
    },

    toRotation: function(out, q) {
	quat.copy(out, q[0]);
	return out;
    },

    toTranslation: function(out, q) {
	var t = dquat._q_0;
	if (!t) {
	    t = dquat._q_0 = quat.create();
	}
	quat.conjugate(t, q[0]);
	quat.multiply(t, q[1], t);
	quat.scale(t, t, 2);
	out[0] = t[0];
	out[1] = t[1];
	out[2] = t[2];
    },

    debug: true,

    /**
     * compute v' = q v q*
     */
    transformVec3: function(out, q, v) {
	var iNorm = 1 / dquat.length(q);

	// c0 = b0 / ||b0||
	var c0 = dquat.q(0, q[0]);
	quat.scale(c0, c0, iNorm);

	// cE = bE / ||bE||
	var cE = dquat.q(1, q[1]);
	quat.scale(cE, cE, iNorm);

	dquat.debug && console.log(
	    "c0 =", quat.str(c0),
	    "cE =", quat.str(cE),
	    "v =", vec3.str(v),
	    "1/norm =", iNorm
	);

	// v' = v + 2d0 x (d0 x v + a0 v) + 2(a0 d0 + d0 x dE)

	var a0 = c0[3];
	var d0 = dquat.v(0);
	vec3.set(d0, c0[0], c0[1], c0[2]);
	var aE = cE[3];
	var dE = dquat.v(1);
	vec3.set(dE, cE[0], cE[1], cE[2]);

	var vv = dquat.v(2);
	var t1 = dquat.v(3),
	    t2 = dquat.v(4),
	    t3 = dquat.v(5);
	
	vec3.cross(t1, d0, v);	// d0 x v
	dquat.debug && console.log("d0 x v =", vec3.str(t1));
	vec3.scale(t2, v, a0);	// a0 v
	dquat.debug && console.log("a0 v =", vec3.str(t2));
	vec3.add(t3, t1, t2);	// (d0 x v + a0 v)
	dquat.debug && console.log("d0 x v + a0 v =", vec3.str(t3));
	vec3.scale(t2, d0, 2);	// 2d0
	dquat.debug && console.log("2d0 =", vec3.str(t2));
	vec3.cross(t1, t2, t3);	// 2d0 x (d0 x v + a0 v)
	dquat.debug && console.log("2d0 x (d0 x v + a0 v) =", vec3.str(t1));

	vec3.add(vv, v, t1);	// v + 2d0 x (d0 x v + a0 v)
	dquat.debug && console.log("v + 2d0 x (d0 x v + a0 v) =", vec3.str(vv));

	vec3.cross(t1, d0, dE);	// d0 x dE
	dquat.debug && console.log("d0 =", vec3.str(d0), "dE =", vec3.str(dE));
	dquat.debug && console.log("d0 x dE =", vec3.str(t1));
	vec3.scale(t2, d0, a0);	// a0 d0
	dquat.debug && console.log("a0 d0", vec3.str(t2));
	vec3.add(t3, t1, t2);	// (a0 d0 + d0 x dE)
	dquat.debug && console.log("(a0 d0 + d0 x dE)", vec3.str(t3));
	vec3.scale(t3, t3, 2);	// 2(a0 d0 + d0 x dE)	
	dquat.debug && console.log("2(a0 d0 + d0 x dE)", vec3.str(t3));

	// v' = v + 2d0 x (d0 x v + a0 v) + 2(a0 d0 + d0 x dE)
	vec3.add(vv, vv, t3);
	dquat.debug && console.log("v' = v + 2d0 x (d0 x v + a0 v) + 2(a0 d0 + d0 x dE)", vec3.str(vv));

	vec3.copy(out, vv);
    },

    str: function(q) {
	return "dquat(" + quat.str(q[0]) + ", "  + quat.str(q[1]) + ")";
    }
};
