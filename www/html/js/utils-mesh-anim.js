/**
 * Key frame sampler.
 */
utils.KeyFrameSampler = utils.extend(utils.Object, {
    /**
     * Initialize the sampler.
     * keys = [[<time>, <value>], ...]
     */
    init: function(keys, zeroKey) {
        if (typeof keys == 'number') {
            /* assume this is a static key */
            keys = [[0, keys]];
        }
        var n = keys.length;
        if (n > 1) {
            var first = keys[0];
            var last = keys[n - 1];
            this.duration = last[0] - first[0];
            this.looped = this.equals(last[1], first[1]);
        } else {
            this.duration = 0;
            this.looped = true;
        }
        if (this.keysCompress) {
            keys = this.keysCompress(keys);
        }
        this.keys = keys;
        this.zeroKey = zeroKey;
        this.keyIdx = 0;
        this.key0 = null;
        this.key1 = null;
    },

    loop: function(t) {
        if (this.looped) {
            return;
        }
        var keys = this.keys;
        var n = keys.length;
        var first = keys[0];
        var last = keys[--n];
        var prev = keys[--n];
        var dt = last[0] - prev[0];
        if (t && t > dt) {
            dt = t;
        }
        keys.push([dt, first[1]]);
        this.duration += dt;
    },

    keysCompress: function(keys) {
        var dropped = 0;
        var compressed = [];
        for (var i = 0, n = keys.length; i < n; ++i) {
            var rec = keys[i];
            var k = rec[1];
            if (i >= 2) {
                if (this.equals(keys[i - 1][1], k) &&
                    this.equals(keys[i - 2][1], k)) {
                    compressed[compressed.length - 1] = rec;
                    ++dropped;
                    continue;
                }
            }
            compressed.push(rec);
        }
        if (compressed.length == 2 &&
            this.equals(compressed[0][1], compressed[1][1])) {
            compressed.length = compressed.length - 1;
            ++dropped;
        }
        return dropped > 0 ? compressed : keys;
    },

    /**
     * Reset the sampler.
     */
    reset: function() {
        this.keyIdx = 0;
        this.key0 = null;
        this.key1 = null;
    },

    /**
     * @return the value at time t
     */
    sample: function(t) {
        var keys = this.keys;
        var n = keys.length;
        var key0 = this.key0;
        var key1 = this.key1;
        if (key0 == null || t < key0[0]) {
            /* restart */
            this.keyIdx = 0;
            this.key0 = key0 = keys[0];
            if (n > 1) {
                this.key1 = key1 = keys[1];
            } else {
                this.key1 = key1 = null;
            }
        }

        while (key1 && t >= key1[0]) {
            /* find next key pair */
            this.key0 = key0 = key1;
            if (++this.keyIdx < n) {
                this.key1 = key1 = keys[this.keyIdx + 1];
            } else {
                this.key1 = key1 = null;
                break;
            }
        }

        var t0 = key0[0];
        if (t < t0) {
            return this.zeroKey;
        } else if (key1 == null) {
            return key0[1];
        }
        var t1 = key1[0];
        if (t < t1) {
            return this.interpolate(
                key0[1], key1[1],
                (t - t0) / (t1 - t0)
            );
        } else {
            return key1[1];
        }
    },

    /**
     * @return the time of the next key frame > t
     */
    next: function(t) {
        var keys = this.keys;
        for (var i = this.keyIdx, n = keys.length; i < n; ++i) {
            var key = keys[i];
            var tk = key[0];
            if (tk > t) {
                return tk;
            }
        }
        return null;
    },

    /**
     * Interpolate between the two key frame values.
     */
    interpolate: function(a, b, s) {
        return a + s * (b - a);
    },

    /**
     * @return true if the two key frame values are equal
     */
    equals: glMatrix.equals
});

/**
 * Quarternion key frame sampler.
 */
utils.KeyFrameQuatSampler = utils.extend(utils.KeyFrameSampler, {
    ZERO_KEY: quat.create(),

    /**
     * Build the quarternion keys from the rotation vector keys.
     * rotationKeys = [ [t, vec3], ... ]
     */
    keysBuild: function(rotationKeys, order) {
        var keys = [];
        for (var i = 0, n = rotationKeys.length; i < n; ++i) {
            var rec = rotationKeys[i];
            var q = quat.create();
            GL.MeshDqs.rotationApply(q, order, rec[1]);
            keys.push([rec[0], q]);
        }
        return keys;
    },

    init: function(keys) {
        utils.KeyFrameSampler.init.call(this, keys, this.ZERO_KEY);
        this.q = quat.create();
    },

    interpolate: function(a, b, s) {
        var q = this.q;
        //quat.slerp(q, a, b, s);
        quat.lerp(q, a, b, s);
        quat.normalize(q, q);
        return q;
    },

    equals: quat.equals
});

/**
 * Vector key frame sampler.
 */
utils.KeyFrameVecSampler = utils.extend(utils.KeyFrameSampler, {
    init: function(keys, zeroKey) {
        utils.KeyFrameSampler.init.call(this, keys, zeroKey);
        this.v = new Float32Array(zeroKey);
    },

    interpolate: function(a, b, s) {
        var v = this.v;
        for (var i = 0, n = this.v.length; i < n; ++i) {
            var ai = a[i];
            v[i] = ai + s * (b[i] - ai);
        }
        return v;
    },

    equals: function(a, b) {
        var n = a.length;
        if (n != b.length) {
            return false;
        }
        for (var i = 0; i < n; ++i) {
            if (!glMatrix.equals(a[i], b[i])) {
                return false;
            }
        }
        return true;
    }
});

/**
 * Key frame sampler for an animation.
 */
utils.KeyFrameMapSampler = utils.extend(utils.Object, {
    /**
     * keyMap = {
     *   <control>: [ [ <time>, <value> ], ... ],
     *   ...
     * }
     */
    keysBuild: function(keyMap, mesh, basePose) {
        /* create a pose for each key frame */
        var samplers = [];
        for (var ctrl in keyMap) {
            var keys = keyMap[ctrl];
            if (typeof keys == 'number') {
		/* static key */
		keys = [[0, keys]];
	    }
            var zeroKey = 0;
            var modId = utils.ModifierDict.idGet(ctrl);
            if (modId.property) {
                zeroKey = modId.property.type.initValue[modId.type.index];
            }
            samplers.push([modId, utils.KeyFrameSampler.create(keys, zeroKey)]);
        }

        /* apply the poses to get bone transforms and morphs */
        var controller = utils.ModifierController.create(mesh.config.mesh.figure.id);
        var propMap = {};
        var scalarMap = {};
        var morphMap = {};
        var t = 0;
        for (;;) {
            var ctrls = {};
            var tn = null;
            for (var i = 0, n = samplers.length; i < n; ++i) {
                var rec = samplers[i];
                var modId = rec[0];
                var sampler = rec[1];
                var value = sampler.sample(t);
                var sn = sampler.next(t);
                if (sn != null && (tn == null || tn > sn)) {
                    tn = sn;
                }
                ctrls[modId.id] = value;
            }
            if (basePose) {
                controller.pose(basePose);
            }
            controller.pose(ctrls);
            controller.flush();

            var bones = controller.bones;
            for (var i = 0, n = bones.length; i < n; ++i) {
                var rec = bones[i];
                var propId = rec[0];
                var channels = rec[1];
                var boneId = propId.bone.id;
                var bone = mesh.boneMap[boneId] || mesh.boneAliases[boneId];
                if (!bone) {
                    /* unknown bone */
                    continue;
                }
                var keys = propMap[propId.id];
                if (!keys) {
                    keys = propMap[propId.id] = [];
                }
                if (propId.type.name != 'scale') {
                    var base = bone[propId.type.name];
                    if (base && base.length == 3) {
                        vec3.add(channels, channels, base);
                    }
                }
                keys.push([t, channels]);
            }

            var morphs = controller.morphs;
            for (var id in morphs) {
                var rec = morphs[id];
                var value = rec[0];
                var morph = rec[1];
                var keys = scalarMap[id];
                if (!keys) {
                    keys = scalarMap[id] = [];
                }
                keys.push([t, value]);
                if (!morphMap[id]) {
                    morphMap[id] = morph.values;
                }
            }

            if (tn == null) {
                break;
            }
            t = tn;
        }

        /* create samplers for the bones and morphs */
        var looped = true;
        var duration = 0;
        var boneSamplers = [];
        for (var id in propMap) {
            var keys = propMap[id];
            var propId = utils.ModifierDict.propertyGet(id);
            var boneId = propId.bone.id;
            var bone = mesh.boneMap[boneId] || mesh.boneAliases[boneId];
            if (!bone) {
                /* mesh does not have this bone */
                continue;
            }
            var control = bone.controls[propId.type.name];
            if (!control) {
                /* bone does not have this control */
                continue;
            }
            var sampler;
            if (propId.type.quarternion) {
                sampler = utils.KeyFrameQuatSampler.create(
                    utils.KeyFrameQuatSampler.keysBuild(keys, bone.rIndices)
                );
            } else {
                sampler = utils.KeyFrameVecSampler.create(
                    keys, propId.type.initValue
                );
            }
            if (!sampler.looped) {
                looped = false;
            }
            if (duration < sampler.duration) {
                duration = sampler.duration;
            }
            boneSamplers.push([propId, sampler, control]);
        }
        var morphSamplers = [];
        for (var id in scalarMap) {
            var keys = scalarMap[id];
            var sampler = utils.KeyFrameSampler.create(keys, 0);
            if (!sampler.looped) {
                looped = false;
            }
            if (duration < sampler.duration) {
                duration = sampler.duration;
            }
            morphSamplers.push([id, sampler]);
        }
        if (false && !looped) {
            /* TBD: need a better way to loop animations */
            for (var i = 0, n = boneSamplers.length; i < n; ++i) {
                boneSamplers[i][1].loop(duration);
            }
            for (var i = 0, n = morphSamplers.length; i < n; ++i) {
                morphSamplers[i][1].loop(duration);
            }
        }
        this.boneSamplers = boneSamplers;
        this.morphSamplers = morphSamplers;
        this.morphMap = morphMap;
        this.mesh = mesh;
        this.duration = duration;
    },

    init: function(keyMap, mesh, basePose) {
        this.keysBuild(keyMap, mesh, basePose);
    },

    reset: function() {
        this.t = null;
        var boneSamplers = this.boneSamplers;
        for (var i = 0, n = boneSamplers.length; i < n; ++i) {
            boneSamplers[i][1].reset();
        }
        var morphSamplers = this.morphSamplers;
        for (var i = 0, n = morphSamplers.length; i < n; ++i) {
            morphSamplers[i][1].reset();
        }
    },

    output: function(t) {
        if (this.t == null) {
            this.t = t;
            t = 0;
        } else {
            var dt = t - this.t;
            if (dt >= this.duration) {
                /* loop the animation */
                var skipped = Math.floor(dt / this.duration);
                this.t += skipped * this.duration;
                dt = t - this.t;
            }
            t = dt;
        }

        this.outputBones(t);
        if (App.MORPHS_ENABLE) {
            this.outputMorphs(t);
        }
    },

    outputBones: function(t) {
        var boneMap = this.mesh.boneMap;
        var boneAliases = this.mesh.boneAliases;
        var boneSamplers = this.boneSamplers;
        for (var i = 0, n = boneSamplers.length; i < n; ++i) {
            var rec = boneSamplers[i];
            var sampler = rec[1];
            var control = rec[2];
            control.set(sampler.sample(t));
        }
    },

    outputMorphs: function(t) {
        var coords = this.mesh.coords;
        var morphMap = this.morphMap;
        var morphSamplers = this.morphSamplers;
        for (var i = 0, n = morphSamplers.length; i < n; ++i) {
            var rec = morphSamplers[i];
            var value = rec[1].sample(t);
            if (value == 0) {
                continue;
            }
            var morph = morphMap[rec[0]];
            for (var j = 0, m = morph.length; j < m; ++j) {
                var d = morph[j];
                var ci = d[0] * 3;
                coords[ci++] += value * d[1];
                coords[ci++] += value * d[2];
                coords[ci]   += value * d[3];
            }
        }
    }
});

/**
 * Prototype modifier controller.
 * @mixin
 */
utils.ModifierController = utils.extend(utils.Object, {
    init: function(group) {
	this.index = utils.ModifierIndex.get(group);
	this.modifiers = this.index.modifiers;
	this.reset();
        return this;
    },

    reset: function() {
        this.controls = {};
        this.stageSum = {};
        this.stageMult = {};
        this.morphSources = {};
    },

    pose: function(ctrls) {
	this.debug && console.log("pose", ctrls);
        this.seen = {};
	this.updated = null;
	for (id in ctrls) {
            this.source = id;
	    this.set(id, this.stageSum, ctrls[id]);
	}
        while (this.updated) {
            this.run();
        }
    },

    /*
     * bone = {
     *   boneId: {
     *     property: <vec>,
     *     ...
     *   },
     *   ...
     * }
     * stages = {
     *   sum: {
     *     id: {
     *       source: value,
     *       ...
     *     }
     *   },
     *   mult: {
     *     id: {
     *       source: value,
     *       ...
     *     }
     *   }
     * }
     */
    flush: function() {
        var propMap = {};
        var props = [];
        var controls = this.controls;
        for (var ctrl in controls) {
            var value = controls[ctrl];
            var modId = utils.ModifierDict.idGet(ctrl);
            if (modId.bone) {
                var property = modId.property.id;
                var channels = propMap[property];
                if (!channels) {
                    channels = new Float32Array(modId.property.type.initValue);
                    propMap[property] = channels;
                    props.push([modId.property, channels]);
                }
                channels[modId.type.offset] = value;
            }
        }
        this.bones = [];
        for (var i = 0, n = props.length; i < n; ++i) {
            var rec = props[i];
            var propId = rec[0];
            var channels = rec[1];
            var initValue = propId.type.initValue;
            var isZero = true;
            for (var j = 0, m = initValue.length; j < m; ++j) {
                if (!glMatrix.equals(channels[j], initValue[j])) {
                    isZero = false;
                    break;
                }
            }
            if (isZero) {
                // TBD: weird problems if we drop zeroKey values here
                //continue;
            }
            this.debug && console.log(
                "bone", propId.id, channels
            );
            this.bones.push(rec);
        }
        this.morphs = {};
	for (var source in this.morphSources) {
	    var mod = this.morphSources[source];
            this.source = source;
	    mod.morph(this);
	}
    },

    run: function() {
        var seen = this.seen;
	var updated = this.updated;
	this.updated = null;
        for (var ctrl in updated) {
	    var inputs = this.index.inputs[ctrl];
	    if (inputs) {
		for (var j = 0, m = inputs.length; j < m; ++j) {
		    var id = inputs[j];
		    if (!seen[id]) {
			seen[id] = true;
			this.modifierRun(id);
		    }
		}
	    }
        }
    },

    modifierRun: function(id) {
	var mod = this.modifiers[id];
	if (!mod) {
	    // no modifier to run
	    this.debug && console.log("control", id);
	} else {
	    this.debug && console.log("modifier", id);
	    this.source = id;
	    if (mod.formula) {
		mod.formula(this);
	    }
	    if (mod.morph) {
		this.morphSources[id] = mod;
	    }
	}
    },

    sum: function(id, value) {
        this.set(id, this.stageSum, value);
    },
    mult: function(id, value) {
        this.set(id, this.stageMult, value);
    },
    morph: function(ctrl, morph) {
        if (ctrl != 0) {
            this.debug && console.log(
                "morph", this.source, ctrl, morph
            );
            this.morphs[this.source] = [ctrl, morph];
        }
    },

    /*
     * controls = {
     *   id: value,
     *   ...
     * }
     * stages = {
     *   sum: {
     *     id: {
     *       source: value,
     *       ...
     *     }
     *   },
     *   mult: {
     *     id: {
     *       source: value,
     *       ...
     *     }
     *   }
     * }
     */
    set: function(id, stage, value) {
        var source = this.source;
        var sourceMap = stage[id];
        if (!sourceMap) {
            sourceMap = stage[id] = {};
            sourceMap[source] = value;
        } else {
            sourceMap[source] = value;
        }

        var sum = 0;
        sourceMap = this.stageSum[id];
        if (sourceMap) {
            for (var src in sourceMap) {
                sum += sourceMap[src];
            }
        }
        var mult = 1;
        sourceMap = this.stageMult[id];
        if (sourceMap) {
            for (var src in sourceMap) {
                mult *= sourceMap[src];
            }
        }

        var ctrl = sum * mult;
	var mod = this.modifiers[id];
	if (mod && mod.clamped) {
	    var max = mod.max;
	    if (max != undefined && ctrl > max) {
		this.debug > 1 && console.log(
		    "clip " + id + " to max=" + max + " (was " + ctrl + ")",
		    mod
		);
		ctrl = max;
	    }
	    var min = mod.min;
	    if (min != undefined && ctrl < min) {
		this.debug > 1 && console.log(
		    "clip " + id + " to min=" + min + " (was " + ctrl + ")",
		    mod
		);
		ctrl = min;
	    }
	}
        if (this.controls[id] != ctrl) {
            this.debug > 2 && console.log(
                "set " + id + " = " + ctrl
            );
            this.controls[id] = ctrl;
            if (!this.seen[id]) {
                var updated = this.updated;
                if (updated == null) {
                    updated = this.updated = {};
                }
                updated[id] = true;
            }
        }
    },

    get: function(id) {
	var mod;
	var value = this.controls[id] || (mod = this.modifiers[id]) && mod.value || 0;
	return value;
    }
});
