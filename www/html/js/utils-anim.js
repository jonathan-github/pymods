/**
 * Animation sampler.
 */
utils.AnimationSampler = {
    create: function(config) {
	if (Array.isArray(config.anim)) {
	    return utils.AnimationArraySampler.create(config);
	} else {
	    return utils.AnimationMapSampler.create(config);
	}
    }
};

/**
 * Animation sampler for map format animations
 * (eg, map of key frames indexed by control).
 */
utils.AnimationMapSampler = utils.extend(utils.Object, {
    check: function(anim) {
        var frameMap = {};
        var times = [];
        var controls = {};
        for (var ctrl in anim) {
            var keys = anim[ctrl];
            if (keys.length == 1 && keys[0][0] == 0) {
                /* ignore controls only set in frame0 */
                continue;
            }
            controls[ctrl] = keys;
            for (var i = 0, n = keys.length; i < n; ++i) {
                var key = keys[i];
                var time = key[0];
                var value = key[1];
                var frame = frameMap[time];
                if (!frame) {
                    frame = frameMap[time] = {};
                    times.push(time);
                }
                frame[ctrl] = value;
            }
        }
        times.sort();
        var count = 0;
        var missing = {};
        for (var i = 1, n = times.length; i < n; ++i) {
            var time = times[i];
            var frame = frameMap[time];
            for (var ctrl in controls) {
                if (frame[ctrl] == undefined) {
                    ++count;
                    var frames = missing[ctrl];
                    if (!frames) {
                        frames = missing[ctrl] = [];
                    }
                    frames.push(time);
                }
            }
        }
        if (count > 0) {
            console.log(anim.name, "missing controls", count, missing);
        }
    },

    /**
     * <config> = {
     *   anim: {
     *     <control>: [ <key-frame>, .. ]
     *   }
     * }
     *
     * <key-frame> = [ <time>, <value> ]
     */
    init: function(config) {
	this.config = config;
	this.zeroKeys = {};
	this.constKeys = {};
	var anim = config.anim;
        //this.check(anim);
	var end = 0;
	var nkeys = 1;
	var first = true;
	var states = {};
	var ctrls = {};
	for (var ctrl in anim) {
	    var keys = anim[ctrl];
	    if (!Array.isArray(keys)) {
		/* assume this is a static key */
		keys = [[0, keys]];
	    }
	    var n = keys.length;
	    var initKey = keys[0][1];
	    var constKey = true;
	    if (n > 1){
		for (var i = 1; i < n; ++i) {
		    if (initKey != keys[i][1]) {
			constKey = false;
			break;
		    }
		}
	    }
	    if (constKey) {
		var zeroKey = 0.0;
		if (ctrl.indexOf('/scale/') >= 1) {
		    /* zeroKey for scale parameters is one */
		    zeroKey = 1.0;
		}
		if (initKey == zeroKey) {
		    /* ignore zero keys */
		    this.zeroKeys[ctrl] = initKey;
		} else {
		    ctrls[ctrl] = initKey;
		    this.constKeys[ctrl] = initKey;
		}
		continue;
	    }

	    var keyEnd = keys[n - 1][0];
	    if (first) {
		end = keyEnd;
		nkeys = n;
		first = false;
	    } else {
		if (end < keyEnd) {
		    end = keyEnd;
		}
		if (nkeys < n) {
		    nkeys = n;
		}
	    }
	    states[ctrl] = {
		i: 0,
		keys: keys
	    };
	    ctrls[ctrl] = keys[0][1];
	}
	this.states = states;
	this.ctrls0 = ctrls;
	this.nkeys = nkeys;
	this.dur = end;
	var fps = config.fps || 60;
	this.dt = 1 / fps;
    },
    interpolate: function(t) {
	var dur = this.dur;
	if (dur == 0) {
	    return this.ctrls0;
	}
	while (t > dur) {
	    t -= dur;
	}
	var ctrls = {};
	var constKeys = this.constKeys;
	for (var ctrl in constKeys) {
	    ctrls[ctrl] = constKeys[ctrl];
	}
/*
	var last = this.last;
	if (last == undefined) {
	    last = this.last = {};
	}
*/
	for (ctrl in this.states) {
	    var val = this.interpolateKey(ctrl, t);
/*
	    if (last[ctrl] != val) {
		console.log(ctrl, last[ctrl], val);
		last[ctrl] = val;
	    }
*/
	    ctrls[ctrl] = val;
	}
	return ctrls;
    },
    interpolateKey: function(ctrl, t) {
	var state = this.states[ctrl];
	var i = state.i;
	var keys = state.keys;
	var nkeys = keys.length;
	var key0 = keys[i];
	var t0 = key0[0];
	if (t < t0 && i > 0) {
	    /* find first key where t >= key[0] */
	    for (var k = 0; k < i; ++k) {
		if (t < keys[k][0]) {
		    i = k > 0 ? k - 1 : 0;
		    state.i = i;
		    key0 = keys[i];
		    t0 = key0[i];
		    break;
		}
	    }
	}

	if (t <= t0 || nkeys == 1) {
	    /* use first frame */
	    return key0[1];
	}
	if (t > keys[nkeys - 1][0]) {
	    /* use last frame */
	    return keys[nkeys - 1][1];
	}

	/* find next key where t <= key[0] */
	var key1 = key0;
	var t1 = t0;
	for (var j = i + 1; j < nkeys; ++j) {
	    if (t <= keys[j][0]) {
		i = j - 1;
		state.i = i;
		key0 = keys[i];
		t0 = key0[0];
		key1 = keys[j];
		t1 = key1[0];
		break;
	    }
	}
	if (t >= t1){
	    /* use last frame */
	    return key1[1];
	}

	utils.assert && utils.assert(
	    t0 <= t && t < t1,
	    "invalid time range",
	    [t, t0, t1]
	);
	var dt = t1 - t0;
	var k0 = key0[1];
	var k1 = key1[1];
	var dk = k1 - k0;
	var s = (t - t0)  / dt;
	var ki = s * dk + k0;
	utils.assert && utils.assert(
	    !isNaN(ki),
	    "ki is NaN",
	    [ctrl, ki]
	);
	return ki;
    },

    /**
     * Find i where t >= keys[i][0].
     */
    searchKey: function(t, keys) {
	var steps = 0;
	var a = 0;
	var b = keys.length - 1;
	var ta = keys[a][0];
	if (t <= ta) {
	    console.log("searchKey t <= a", steps, a);
	    return a;
	}
	var tb = keys[b][0];
	if (t >= tb) {
	    console.log("searchKey t >= b", steps, b);
	    return b;
	}
	while (b - a > 1) {
	    var c = (a + b) >> 1;
	    var tc = keys[c][0];
	    console.log(
		"searchKey[" + steps + "] t=" + t +
		" a=" + a +
		" b=" + b +
		" c=" + c,
		keys[a],
		keys[b],
		keys[c]
	    );
	    if (t < tc) {
		console.log("t < c");
		b = c;
	    } else if (t > tc) {
		console.log("t > c");
		a = c;
	    } else {
		console.log("t == c");
		return c;
	    }
	    ++steps;
	}
	console.log("searchKey fallthrough a", steps, a);
	return a;
    },

    next: function() {
	if (this.nkeys == 1) {
	    /* static pose */
	    return this.ctrls0;
	}

	var t = this.t;
	if (t == undefined) {
	    t = 0;
	}
	var ctrls = this.interpolate(t);
	t += this.dt;
	this.t = t;
	return ctrls;
    },

    reset: function() {
	this.t = undefined;
	var states = this.states;
	for (var ctrl in states) {
	    states[ctrl].i = 0;
	}
    },

    patch: function(anim, key, adj) {
	var keys = anim[key];
	if (!keys) {
	    return;
	}

	var isFunc = typeof adj == 'function';
	var val = keys[0][1];
	if (!isFunc) {
	    keys[0][1] = val + adj;
	}
	var min = val, max = val, sum = val;
	var vals = [val];
	for (var i = 1, n = keys.length; i < n; ++i) {
	    var nval = keys[i][1];
	    sum += nval;
	    if (nval != val) {
		vals.push(nval);
		if (min > nval) {
		    min = nval;
		}
		if (max < nval) {
		    max = nval;
		}
	    }
	    if (!isFunc) {
		keys[i][1] = nval + adj;
	    }
	}
	var avg = n > 0 ? sum/n : 0;
	if (isFunc) {
	    for (i = 0; i < n; ++i) {
		keys[i][1] = adj(keys[i][1], i, min, max, avg);
	    }
	}
	console.log("patch", key, min, max, avg, vals);
    },

    sequence: function(poses, delay0, delay1) {
        if (delay0 == undefined) {
            delay0 = 0.05;
        }
        if (delay1 == undefined) {
            delay1 = 0.5;
        }

        var controls = {};
        var dur = 0;
        var durs = [];
        for (var i = 0, n = poses.length; i < n; ++i) {
            var pose = poses[i];
            dur = 0;
            for (var control in pose) {
                if (!controls[control]) {
                    controls[control] = [];
                }
                var keys = pose[control];
                var last = keys[keys.length - 1][0];
                if (dur < last) {
                    dur = last;
                }
            }
            durs.push(dur);
        }
        durs.push(durs[0]);

        var offset = 0;
        for (i = 0; i <= n; ++i) {
            var pose = poses[i % n];
            dur = durs[i];
            for (var control in controls) {
                var seq = controls[control];
                var keys = pose[control];
                if (keys) {
                    for (var j = 0, m = keys.length; j < m; ++j) {
                        var key = keys[j];
                        seq.push(
                            [key[0] + offset, key[1]]
                        );
                    }
                    var key = keys[m - 1];
                    seq.push(
                        [key[0] + offset + delay1, key[1]]
                    );
                } else {
                    seq.push(
                        [offset, 0],
                        [offset + dur + delay1, 0]
                    );
                }
            }
            offset += dur + delay0 + delay1;
        }
        return controls;
    }
});

/**
 * Animation sampler for array format animations.
 * (eg, array of key frames).
 */
utils.AnimationArraySampler = utils.extend(utils.Object, {
    /**
     * <config> = {
     *   anim: [
     *     [ <time>, <controls> ],
     *     ...
     *   ]
     * }
     *
     * <controls> = {
     *   <control>: <value>,
     *   ...
     * }
     */
    init: function(config) {
	this.config = config;
	var keys = config.anim;
	var nkeys = keys.length;
	this.nkeys = nkeys;
	this.dur = keys[nkeys - 1][0];
	this.ctrls0 = keys[0];
    },
    interpolate: function(t) {
	if (this.dur == 0) {
	    return this.ctrls0;
	}
	if (t >= this.dur) {
	    t %= this.dur;
	}
	var keys = this.config.anim;
	var ctrls = keys[0];
	for (var i = 0, nkeys = this.nkeys; i < nkeys; ++i) {
	    var key = keys[i];
	    if (t < key[0]) {
		ctrls = keys[i > 0 ? i - 1 : 0];
		break;
	    }
	}
	return ctrls;
    },

    next: function() {
	var i = this.i;
	if (i == undefined) {
	    i = 0;
	}
	var ctrls = this.config.anim[i][1];
	if (++i >= this.nkeys) {
	    i = 0;
	}
	this.i = i;
	return ctrls;
    },

    patch: function(anim, key, adj) {
	var sum = 0.0, count = 0;
	var min, max;
	for (var i = 0, n = anim.length; i < n; ++i) {
	    var keys = anim[i][1];
	    var val = keys[key];
	    if (val != undefined) {
		keys[key] = val + adj;
		sum += val;
		if (count++ == 0) {
		    min = max = val;
		}
	    }
	}
	console.log("patch", key, min, max, sum/n);
    }
});
