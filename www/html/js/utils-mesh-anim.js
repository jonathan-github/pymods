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
        var keyIdx = this.keyIdx;
        var key0 = this.key0;
        var key1 = this.key1;
        if (key0 == null || t < key0[0]) {
            /* search for previous frame */
            if (keyIdx > 0 && keys[keyIdx - 1][0] <= t) {
                key1 = key0;
                key0 = keys[--keyIdx];
            } else {
                /* restart */
                keyIdx = 0;
                key0 = keys[0];
                if (n > 1) {
                    key1 = keys[1];
                } else {
                    key1 = null;
                }
            }
        }

        if (key1 && t >= key1[0]) {
            /* search for next frame */
            for (;;) {
                ++keyIdx;
                key0 = key1;
                if (keyIdx + 1 < n) {
                    key1 = keys[keyIdx + 1];
                    if (t < key1[0]) {
                        break;
                    }
                } else {
                    key1 = null;
                    break;
                }
            }
        }
        if (this.keyIdx != keyIdx) {
            this.keyIdx = keyIdx;
            this.key0 = key0;
            this.key1 = key1;
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
 * Converts the rotation X,Y,Z key frames into quarternion key frames.
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
        var controller = utils.ModifierController.create(
            mesh.config.mesh.figure.id
        );
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
                    //morphMap[id] = morph.values;
                    morphMap[id] = this.morphUnpack(morph);
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

    morphUnpack: function(morph) {
        var block = morph.block;
        if (!block) {
            /* unpack the morph into Wasm memory */
            console.assert(
                morph.count == morph.values.length,
                "morph.count == morph.values.length",
                morph
            );
            var values = morph.values;
            var n = morph.count;
            block = App.memory.malloc(n * 16);
            var dv = App.memory.dataView;
            var offset = block.offset;
            for (var i = 0; i < n; ++i) {
                var rec = values[i];
                dv.setInt32(offset, rec[0], true); offset += 4;
                dv.setFloat32(offset, rec[1], true); offset += 4;
                dv.setFloat32(offset, rec[2], true); offset += 4;
                dv.setFloat32(offset, rec[3], true); offset += 4;
            }
            morph.block = block;
            morph.values = null; // no longer needed
        }
        return {
            offset: block.offset,
            count: morph.count
        };
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
            if (dt >= this.duration && !this.oneshot) {
                /* loop the animation */
                var skipped = Math.floor(dt / this.duration);
                this.t += skipped * this.duration;
                dt = t - this.t;
            }
            t = dt;
        }

        this.dt = t;
        this.outputBones(t);
        if (App.MORPHS_ENABLE) {
            //this.outputMorphs(t);
            this.outputMorphsWasm(t);
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
    },
    /*
     * use Wasm to apply the morph
     */
    outputMorphsWasm: function(t) {
        var coords = App.coordsBlock.offset;
        var morphMap = this.morphMap;
        var morphSamplers = this.morphSamplers;
        var meshMorph = App.meshMorph.exports.meshMorph;
        for (var i = 0, n = morphSamplers.length; i < n; ++i) {
            var rec = morphSamplers[i];
            var value = rec[1].sample(t);
            if (value == 0) {
                continue;
            }
            var morph = morphMap[rec[0]];
            meshMorph(coords, morph.offset, morph.count, value);
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

utils.linearInterpY = function(x0, y0, x1, y1, x) {
    return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
};

/**
 * Pose converter.
 */
utils.PoseConverter = {
    POSE_PATCHES: {
        "wrist circle": function(pose) {
            var keys = pose.keyFrames['rFoot/rotation/y'];
            if (keys) {
                for (var i = 0, n = keys.length; i < n; ++i) {
                    var key = keys[i];
                    if (i >= 17 && i <= 20) {
                        // 17 -3.0855
                        // 18 -2.4424
                        // 19 -1.9610
                        // 20 -2.1254
                        key[1] = utils.linearInterpY(
                            16, keys[16][1],
                            21, keys[21][1],
                            i
                        );
                    } else if (i >= 22 && i <= 24) {
                        // 22 -8.5064
                        // 23 -15.289
                        // 24 -19.574
                        key[1] = utils.linearInterpY(
                            21, keys[21][1],
                            25, keys[25][1],
                            i
                        );
                    } else if (i >= 25) {
                        break;
                    }
                }
            }
            //return this.poseLoopReverse(rec);
            return pose;
        }
    },

    convert: function(poseAsset, baseFigure) {
        var config = poseAsset.config;
        var name = config.name;
        var keyFrames = poseAsset.responseJSON();
        var pose = {
            name: name,
            config: poseAsset.config,
            keyFrames: keyFrames
        };
        if (name) {
            var patcher = this.POSE_PATCHES[name];
            if (patcher) {
                pose = patcher.call(this, pose);
            }
        }
        if (baseFigure != config.baseFigure) {
            var converted = false;
            switch (config.baseFigure) {
            case 'Genesis2Female':
                switch (baseFigure) {
                case 'Genesis3Female':
                    pose = this.convertG2toG3(pose);
                    converted = true;
                    break;
                }
                break;
            case 'Genesis3Female':
                switch (baseFigure) {
                case 'Genesis8Female':
                    pose = this.convertG3toG8(pose);
                    converted = true;
                    break;
                }
                break;
            case 'Genesis8Female':
                switch (baseFigure) {
                case 'Genesis3Female':
                    pose = this.convertG8toG3(pose);
                    converted = true;
                    break;
                }
                break;
            }
            console.log(
                converted ? "converted" : "no conversion",
                name,
                config.baseFigure,
                baseFigure
            );
        }
        var smoothing = config.smoothing;
        if (smoothing != undefined) {
            while (smoothing-- > 0) {
                pose = this.applySmoothing(pose);
            }
        }
        return pose;
    },

    applySmoothing: function(pose) {
        for (var ctrl in pose.keyFrames) {
            var keys = pose.keyFrames[ctrl];
            var n = keys.length - 1;
            if (n > 3) {
                var vp = keys[0][1];
                for (var i = 1; i < n; ++i) {
                    var key = keys[i];
                    var vi = keys[i][1];
                    var vn = keys[i + 1][1];
                    //keys[i][1] = (vp + vi + vn) / 3;
                    keys[i][1] = (0.25 * vp + 0.5 * vi + 0.25 * vn);
                    vp = vi;
                }
            }
        }
        return pose;
    },

    applyDelta: function(pose, ctrl, delta) {
        var keys = pose.keyFrames[ctrl];
        if (keys) {
            for (var i = 0, n = keys.length; i < n; ++i) {
                var key = keys[i];
                key[1] += delta;
            }
        } else {
            pose.keyFrames[ctrl] = [[0, delta]];
        }
        return pose;
    },
    applyRenamePrefix: function(pose, ctrlOld, ctrlNew) {
        var keyFrames = pose.keyFrames;
        var key = ctrlOld + "/";
        var len = ctrlOld.length;
        var remove = [];
        for (var ctrl in keyFrames) {
            if (ctrl.startsWith(key)) {
                var newKey = ctrlNew + ctrl.substring(len);
                var keys = keyFrames[ctrl];
                utils.assert && utils.assert(
                    pose.keyFrames[newKey] == undefined,
                    "rename " + ctrl + " would overwrite " + newKey
                );
                keyFrames[newKey] = keys;
                remove.push(ctrlOld);
            }
        }
        for (var i = 0, n = remove.length; i < n; ++i) {
            delete keyFrames[remove[i]];
        }
        return pose;
    },
    applyRename: function(pose, ctrlOld, ctrlNew) {
        var keyFrames = pose.keyFrames;
        var keys = keyFrames[ctrlOld];
        utils.assert && utils.assert(
            pose.keyFrames[ctrlNew] == undefined,
            "rename " + ctrlOld + " would overwrite " + ctrlNew
        );
        keyFrames[ctrlNew] = keys;
        delete keyFrames[ctrlOld];
        return pose;
    },

    loopReverse: function(pose) {
        var ctrls = pose.keyFrames;
        var endTs = 0;
        for (var ctrl in ctrls) {
            var keys = ctrls[ctrl];
            var n = keys.length;
            var key = keys[n - 1];
            if (endTs < key[0]) {
                endTs = key[0];
            }
        }
        for (var ctrl in ctrls) {
            var keys = ctrls[ctrl];
            var n = keys.length;
            if (n > 1) {
                for (var j = n - 1; j >= 0; --j) {
                    var kj = keys[j];
                    keys.push([2 * endTs - kj[0], kj[1]]);
                }
            }
        }
        return pose;
    },

    convertG2toG3: function(pose) {
        pose = this.applyRenamePrefix(pose, 'lForeArm', 'lForearm');
        pose = this.applyRenamePrefix(pose, 'rForeArm', 'rForearm');
        pose = this.applyRenamePrefix(pose, 'abdomen', 'abdomenLower');
        pose = this.applyRenamePrefix(pose, 'abdomen2', 'abdomenUpper');
        pose = this.applyRenamePrefix(pose, 'chest', 'chestLower');
        pose = this.applyRenamePrefix(pose, 'neck', 'neckLower');

        pose = this.applyRename(pose, 'lForearm/rotation/x', 'lForearmTwist/rotation/x');
        pose = this.applyRename(pose, 'rForearm/rotation/x', 'rForearmTwist/rotation/x');
        pose = this.applyRename(pose, 'lForearm/rotation/y', 'lForearmBend/rotation/y');
        pose = this.applyRename(pose, 'rForearm/rotation/y', 'rForearmBend/rotation/y');
        pose = this.applyRename(pose, 'lForearm/rotation/z', 'lForearmBend/rotation/z');
        pose = this.applyRename(pose, 'rForearm/rotation/z', 'rForearmBend/rotation/z');

        pose = this.applyRename(pose, 'lShldr/rotation/x', 'lShldrTwist/rotation/x');
        pose = this.applyRename(pose, 'rShldr/rotation/x', 'rShldrTwist/rotation/x');
        pose = this.applyRename(pose, 'lShldr/rotation/y', 'lShldrBend/rotation/y');
        pose = this.applyRename(pose, 'rShldr/rotation/y', 'rShldrBend/rotation/y');
        pose = this.applyRename(pose, 'lShldr/rotation/z', 'lShldrBend/rotation/z');
        pose = this.applyRename(pose, 'rShldr/rotation/z', 'rShldrBend/rotation/z');

        pose = this.applyRename(pose, 'lThigh/rotation/x', 'lThighBend/rotation/x');
        pose = this.applyRename(pose, 'rThigh/rotation/x', 'rThighBend/rotation/x');
        pose = this.applyRename(pose, 'lThigh/rotation/z', 'lThighBend/rotation/z');
        pose = this.applyRename(pose, 'rThigh/rotation/z', 'rThighBend/rotation/z');
        pose = this.applyRename(pose, 'lThigh/rotation/y', 'lThighTwist/rotation/y');
        pose = this.applyRename(pose, 'rThigh/rotation/y', 'rThighTwist/rotation/y');

        pose = this.applyDelta(pose, 'lShldrBend/rotation/y', -0.4);
        pose = this.applyDelta(pose, 'rShldrBend/rotation/y', 0.4);
        pose = this.applyDelta(pose, 'lShldrBend/rotation/z', 1.7);
        pose = this.applyDelta(pose, 'rShldrBend/rotation/z', -1.7);

        pose = this.applyDelta(pose, 'lForearmBend/rotation/y', -1.5);
        pose = this.applyDelta(pose, 'rForearmBend/rotation/y', 1.5);
        pose = this.applyDelta(pose, 'lForearmTwist/rotation/x', -4);
        pose = this.applyDelta(pose, 'rForearmTwist/rotation/x', -4);

        pose = this.applyDelta(pose, 'lHand/rotation/y', -2);
        pose = this.applyDelta(pose, 'rHand/rotation/y', 2);
        pose = this.applyDelta(pose, 'lHand/rotation/z', 1.5);
        pose = this.applyDelta(pose, 'rHand/rotation/z', -1.5);

        pose = this.applyDelta(pose, 'lThumb2/rotation/z', -16);
        pose = this.applyDelta(pose, 'rThumb2/rotation/z', 16);
        pose = this.applyDelta(pose, 'lThumb3/rotation/z', -14);
        pose = this.applyDelta(pose, 'rThumb3/rotation/z', 14);

        pose = this.applyDelta(pose, 'lIndex1/rotation/z', -22);
        pose = this.applyDelta(pose, 'rIndex1/rotation/z', 22);
        pose = this.applyDelta(pose, 'lIndex2/rotation/z', -22);
        pose = this.applyDelta(pose, 'rIndex2/rotation/z', 22);
        pose = this.applyDelta(pose, 'lIndex3/rotation/z', -14);
        pose = this.applyDelta(pose, 'rIndex3/rotation/z', 14);

        pose = this.applyDelta(pose, 'lMid1/rotation/z', -23);
        pose = this.applyDelta(pose, 'rMid1/rotation/z', 23);
        pose = this.applyDelta(pose, 'lMid2/rotation/z', -23);
        pose = this.applyDelta(pose, 'rMid2/rotation/z', 23);
        pose = this.applyDelta(pose, 'lMid3/rotation/z', -18);
        pose = this.applyDelta(pose, 'rMid3/rotation/z', 18);

        pose = this.applyDelta(pose, 'lRing1/rotation/z', -23);
        pose = this.applyDelta(pose, 'rRing1/rotation/z', 23);
        pose = this.applyDelta(pose, 'lRing2/rotation/z', -23);
        pose = this.applyDelta(pose, 'rRing2/rotation/z', 23);
        pose = this.applyDelta(pose, 'lRing3/rotation/z', -18);
        pose = this.applyDelta(pose, 'rRing3/rotation/z', 18);

        pose = this.applyDelta(pose, 'lPinky1/rotation/z', -35);
        pose = this.applyDelta(pose, 'rPinky1/rotation/z', 35);
        pose = this.applyDelta(pose, 'lPinky2/rotation/z', -22);
        pose = this.applyDelta(pose, 'rPinky2/rotation/z', 22);
        pose = this.applyDelta(pose, 'lPinky3/rotation/z', -8);
        pose = this.applyDelta(pose, 'rPinky3/rotation/z', 8);

        pose = this.applyDelta(pose, 'lThighBend/rotation/z', -3.4*0.25);
        pose = this.applyDelta(pose, 'rThighBend/rotation/z', 3.4*0.25);

        pose = this.applyDelta(pose, 'lShin/rotation/y', 1);
        pose = this.applyDelta(pose, 'rShin/rotation/y', 1);
        pose = this.applyDelta(pose, 'lShin/rotation/z', -0.3);
        pose = this.applyDelta(pose, 'rShin/rotation/z', -0.3);

        pose = this.applyDelta(pose, 'lFoot/rotation/x', 20);
        pose = this.applyDelta(pose, 'rFoot/rotation/x', 20);
        pose = this.applyDelta(pose, 'lFoot/rotation/y', 2);
        pose = this.applyDelta(pose, 'rFoot/rotation/y', 2);

        return pose;
    },

    convertG8toG3New: function(pose) {
        // shoulder/z 47 L -47 R
        // elbow/y 15 L -15 R
        // wrist/y -12.75 L 12.75 R
        // hip/y 14 L -14 R  reversed???
        // hip/z -7.5 L 7.5 R
        // ankle/z 5 L -5 R
        pose = this.applyDelta(pose, 'lShldrBend/rotation/z', -47);
        pose = this.applyDelta(pose, 'rShldrBend/rotation/z', 47);
        pose = this.applyDelta(pose, 'lForearmBend/rotation/y', -15);
        pose = this.applyDelta(pose, 'rForearmBend/rotation/y', 15);
        pose = this.applyDelta(pose, 'lHand/rotation/y', 12.75);
        pose = this.applyDelta(pose, 'rHand/rotation/y', -12.75);

        //pose = this.applyDelta(pose, 'lThighTwist/rotation/y', 14);
        //pose = this.applyDelta(pose, 'rThighTwist/rotation/y', -14);
        pose = this.applyDelta(pose, 'lThighTwist/rotation/y', 3);
        pose = this.applyDelta(pose, 'rThighTwist/rotation/y', -3);

        //pose = this.applyDelta(pose, 'lThighBend/rotation/z', 7.5);
        //pose = this.applyDelta(pose, 'rThighBend/rotation/z', -7.5);
        pose = this.applyDelta(pose, 'lThighBend/rotation/z', 8);
        pose = this.applyDelta(pose, 'rThighBend/rotation/z', -8);

        //pose = this.applyDelta(pose, 'lFoot/rotation/z', -5);
        //pose = this.applyDelta(pose, 'rFoot/rotation/z', 5);
        pose = this.applyDelta(pose, 'lFoot/rotation/z', -4);
        pose = this.applyDelta(pose, 'rFoot/rotation/z', 4);

        return pose;
    },
    convertG8toG3: function(pose) {
        pose = this.applyDelta(pose, 'abdomenUpper/rotation/x', -0.15);
        pose = this.applyDelta(pose, 'abdomenLower/rotation/x', 0.15);
        pose = this.applyDelta(pose, 'lThighBend/rotation/z', 6);
        pose = this.applyDelta(pose, 'rThighBend/rotation/z', -6);
        pose = this.applyDelta(pose, 'lShldrBend/rotation/z', -45.6);
        pose = this.applyDelta(pose, 'rShldrBend/rotation/z', 45.6);
        return pose;
    },
    convertG3toG8: function(pose) {
        pose = this.applyDelta(pose, 'abdomenUpper/rotation/x', 0.15);
        pose = this.applyDelta(pose, 'abdomenLower/rotation/x', -0.15);
        pose = this.applyDelta(pose, 'lThighBend/rotation/z', -6);
        pose = this.applyDelta(pose, 'rThighBend/rotation/z', 6);
        pose = this.applyDelta(pose, 'lShldrBend/rotation/z', 45.6);
        pose = this.applyDelta(pose, 'rShldrBend/rotation/z', -45.6);
        return pose;
    },
    convertG8toG3_old: function(pose) {
        pose = this.applyDelta(pose, 'lThighBend/rotation/z', 7);
        pose = this.applyDelta(pose, 'rThighBend/rotation/z', -7);
        pose = this.applyDelta(pose, 'lShldrBend/rotation/z', -45);
        pose = this.applyDelta(pose, 'rShldrBend/rotation/z', 45);
        return pose;
    },
    convertG3toG8_old: function(pose) {
        pose = this.applyDelta(pose, 'lThighBend/rotation/z', -7);
        pose = this.applyDelta(pose, 'rThighBend/rotation/z', 7);
        pose = this.applyDelta(pose, 'lShldrBend/rotation/z', 45);
        pose = this.applyDelta(pose, 'rShldrBend/rotation/z', -45);
        return pose;
    }
};
