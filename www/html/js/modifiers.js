var ModifierLibrary;
if (!ModifierLibrary) {
    ModifierLibrary = {};
}

/// spline interpolation function used by the modifiers
var spline_tcb = utils.spline_tcb;

/**
 * Modifier index and dependency graph.
 */
utils.ModifierIndex = utils.extend(utils.Object, {
    // cache of ModiferIndex instances
    cache: {},

    /**
     * Get the ModifierIndex instance for the group.
     * @param {String} group the modifier group
     * @returns {utils.ModifierIndex} the ModifierIndex instance for the group
     */
    get: function(group) {
	var index = utils.ModifierIndex.cache[group];
	if (index) {
	    return index;
	}

	var modifiers = ModifierLibrary[group];
	utils.assert && utils.assert(
	    modifiers,
	    "unknown modifier group",
	    ["group=", group]
	);
	index = utils.ModifierIndex.create(modifiers);
	utils.ModifierIndex.cache[group] = index;
	return index;
    },

    init: function(modifiers) {
	this.modifiers = modifiers;
	this.inputs = {};
	this.outputs = {};
	this.bonePaths = {};
	for (var id in modifiers) {
	    var mod = modifiers[id];
	    mod.id = id;
	}
	for (id in modifiers) {
	    var mod = modifiers[id];
	    this.index(mod, 'inputs');
	    this.index(mod, 'outputs');
	}
    },

    index: function(mod, prop) {
	var keys = mod[prop];
	if (!keys) {
	    return;
	}
	for (var i = 0, n = keys.length; i < n; ++i) {
	    var key = keys[i];
	    var mods = this[prop][key];
	    if (!mods) {
		mods = this[prop][key] = [];
	    }
	    mods.push(mod.id);
	}
    },

    bone: function(id) {
	if (id.indexOf('/') < 0) {
	    /* not a bone */
	    return null;
	}

	var path = this.bonePaths[id];
	if (!path) {
	    this.bonePaths[id] = path = id.split('/');
	}
	return path;
    }
});

/**
 * Prototype modifier controller.
 * @mixin
 */
utils.Controls = utils.extend(utils.Object, {
    /// source for user supplied control values
    SOURCE_USER: 'user',

    /// stages
    STAGE_SUM: 'sum',
    STAGE_MULT: 'mult',

    init: function(group) {
	this.index = utils.ModifierIndex.get(group);
	this.modifiers = this.index.modifiers;
	this.reset();
    },

    reset: function() {
	this.controls = {};
	this.controlSources = {};
	this.morphs = {};
	this.morphSources = {};
	this.modified = {};
	this.bones = {};
    },

    start: function(pose) {
	utils.debug && console.log("start", pose);
	this.pose = pose;
	this.dirty = false;
	this.modified = {};
	this.updated = [];
	this.source = this.SOURCE_USER;
	for (id in pose) {
	    this.set(id, pose[id]);
	}
	this.source = null;

	var i = 0;
	while (this.updated.length > 0) {
	    this.run();
	    if (++i > 100) {
		utils.debug && console.log("too many iterations");
		break;
	    }
	}
	if (this.dirty) {
	    this.flush();
	}
	return this.dirty;
    },

    run: function() {
	var updated = this.updated;
	this.modified = {};
	this.updated = [];
	var seen = {};
	for (var i = 0, n = updated.length; i < n; ++i) {
	    var inputs = this.index.inputs[updated[i]];
	    if (inputs) {
		for (var j = 0, m = inputs.length; j < m; ++j) {
		    var id = inputs[j];
		    if (!seen[id]) {
			seen[id] = true;
			this.runModifier(id);
		    }
		}
	    }
	}
    },

    runModifier: function(id) {
	var mod = this.modifiers[id];
	if (!mod) {
	    // unknown modifier
	    utils.debug && console.log("control", id);
	} else {
	    this.debug && console.log("modifier", id);
	    this.source = id;
	    if (mod.formula) {
		this.debug && console.log("formula", id);
		mod.formula(this);
	    }
	    if (mod.morph) {
		this.debug && console.log("morph", id);
		this.morphSources[id] = mod;
	    }
	    this.source = null;
	}
    },

    get: function(id) {
	var mod;
	var ctrl = this.controls[id] || (mod = this.modifiers[id]) && mod.value || 0;
	this.debug && console.log("get", id, ctrl);
	return ctrl;
    },

    sum: function(id, value) {
        this.set(id, value, this.STAGE_SUM);
    },
    mult: function(id, value) {
        this.set(id, value, this.STAGE_MULT);
    },

    set: function(id, value, stage) {
        if (!stage) {
            stage = this.STAGE_SUM;
        }
	this.debug && console.log("set", id, value, stage);
	var source = this.source;
	var sources = this.controlSources[id];
        if (!sources) {
            sources = this.controlSources[id] = {};
	}
	var stages = sources[source];
        if (!stages) {
            stages = sources[source] = {};
        }
        if (stages[stage] === value) {
            /* no change */
            return;
        }
        stages[stage] = value;

	// TBD: should user's setting override all other sources?
	//var sum = sources[this.SOURCE_USER];
	var sum = 0;
        var mult = 1;
	for (var src in sources) {
            stages = sources[src];
            var val = stages.sum;
            if (val != undefined) {
                sum += val;
            }
            val = stages.mult;
            if (val != undefined) {
                mult *= val;
            }
	}
        var ctrl = sum * mult;
	var mod = this.modifiers[id];
	if (mod && mod.clamped) {
	    var max = mod.max;
	    if (max != undefined && ctrl > max) {
		this.debug && console.log(
		    "clipping " + id + " to max=" + max + " (was " + ctrl + ")",
		    mod
		);
		ctrl = max;
	    }
	    var min = mod.min;
	    if (min != undefined && ctrl < min) {
		this.debug && console.log(
		    "clipping " + id + " to min=" + min + " (was " + ctrl + ")",
		    mod
		);
		ctrl = min;
	    }
	}
	var prev = this.controls[id];
	if (prev != undefined && prev == ctrl) {
	    /* no change */
	    return;
	}
	this.debug && console.log("set", id, ctrl);
	var defval = mod && mod.value || 0;
	if (ctrl == defval) {
            if (prev == undefined) {
                return;
            }
	    delete this.controls[id];
	} else {
	    this.controls[id] = ctrl;
	}
	this.dirty = true;
	if (!this.modified[id]) {
	    this.modified[id] = true;
	    this.updated.push(id);
	}
    },

    morph: function(ctrl, morph) {
	if (ctrl == 0) {
	    return;
	}
	var deltas = morph.values;
	for (var i = 0, n = deltas.length; i < n; ++i) {
	    var delta = deltas[i];
	    var vertex = delta[0];
	    var dx = ctrl * delta[1];
	    var dy = ctrl * delta[2];
	    var dz = ctrl * delta[3];
	    var rec = this.morphs[vertex];
	    if (!rec) {
		this.morphs[vertex] = rec = [dx, dy, dz, 1];
	    } else {
		rec[0] += dx;
		rec[1] += dy;
		rec[2] += dz;
		rec[3] += 1;
	    }
	}
    },

    flush: function() {
	this.bones = {};
	for (var id in this.controls) {
	    var path = this.index.bone(id);
	    if (path) {
		/*  bone */
		var bone = this.bones[path[0]];
		if (!bone) {
		    this.bones[path[0]] = bone = {};
		}
		var channel = bone[path[1]];
		if (!channel) {
		    bone[path[1]] = channel = {};
		}
		channel[path[2]] = this.controls[id];
	    }
	}

	this.morphs = {};
	for (var source in this.morphSources) {
	    var mod = this.morphSources[source];
	    mod.morph(this);
	}
    }
});

var ControlDiffs = {
    diff: function(a, b) {
	this.diffs = {};
	for (var boneName in a.bones) {
	    var aTrans = a.bones[boneName];
	    var bTrans = b.bones[boneName];
	    if (bTrans == undefined) {
		this.boneMissingAdd('b', boneName, trans);
	    } else {
		this.diffBones(boneName, aTrans, bTrans);
	    }
	}
	for (boneName in b.bones) {
	    if (a.bones[boneName] == undefined) {
		this.boneMissingAdd('a', boneName, b.bones[boneName]);
	    }
	}
	return this.diffs;
    },
    diffBones: function(boneName, aTrans, bTrans) {
	for (var chanName in aTrans) {
	    var aChan = aTrans[chanName];
	    var bChan = bTrans[chanName];
	    if (bChan == undefined) {
		this.chanMissingAdd('b', boneName, chanName, aChan);
	    } else {
		for (var propName in aChan) {
		    var aVal = aChan[propName];
		    var bVal = bChan[propName];
		    if (bVal == undefined) {
			this.propMissingAdd('b', boneName, chanName, propName, aVal);
		    } else if (this.diffValues(aVal, bVal)) {
			this.propDiffAdd(boneName, chanName, propName, aVal, bVal);
		    }
		}
	    }
	}
	for (chanName in bTrans) {
	    var bChan = bTrans[chanName];
	    var aChan = aTrans[chanName];
	    if (aChan == undefined) {
		this.chanMissingAdd('a', boneName, chanName, bChan);
	    } else {
		for (var propName in bChan) {
		    if (aChan[propName] == undefined) {
			this.propMissingAdd('a', boneName, chanName, propName, bChannel[propName]);
		    }
		}
	    }
	}
    },
    diffValues: function(a, b) {
	return (Math.abs(a - b) > 1e-4);
    },
    propDiffAdd: function(boneName, chanName, propName, a, b) {
	var properties = this.diffs.properties;
	if (!properties) {
	    properties = this.diffs.properties = {};
	}
	var bone = properties[boneName];
	if (!bone) {
	    bone = properties[boneName] = {};
	}
	var channel = bone[chanName];
	if (!channel) {
	    channel = bone[chanName] = {};
	}
	channel[propName] = [a, b];
    },
    boneStatusGet: function(side, boneName) {
	var missing = this.diffs[side];
	if (!missing) {
	    missing = this.diffs[side] = {};
	}
	var boneStatus = missing[boneName];
	if (!boneStatus) {
	    boneStatus = missing[boneName] = {};
	}
	return boneStatus;
    },
    boneMissingAdd: function(side, boneName, bone) {
	var boneStatus = this.boneStatusGet(side, boneName);
	boneStatus.missing = bone;
    },
    chanStatusGet: function(side, boneName, chanName) {
	var boneStatus = this.boneStatusGet(side, boneName);
	var chanStatus = boneStatus.channels;
	if (!chanStatus) {
	    chanStatus = boneStatus.channels = {};
	}
	return chanStatus;
    },
    chanMissingAdd: function(side, boneName, chanName, channel) {
	var chanStatus = this.chanStatusGet(side, boneName, chanName);
	chanStatus.missing = channel;
    },
    propStatusGet: function(side, boneName, chanName) {
	var chanStatus = this.chanStatusGet(side, boneName, chanName);
	var propStatus = chanStatus.properties;
	if (!propStatus) {
	    propStatus = chanStatus.properties = {};
	}
	return propStatus;
    },
    propMissingAdd: function(side, boneName, chanName, propName, val) {
	var propStatus = this.propStatusGet(side, boneName, chanName);
	propStatus[propName] = val;
    }
};

var TestApp = {
    init: function() {
	utils.debug && console.log("init");
	Controls.init(ModifierLibrary.Genesis3Female);
	Controls.start('CTRLVictoria7', 0.5);
	Controls.start('eCTRLCheekCrease', 0.5);
	Controls.flush();
	utils.debug && console.log("bones", Controls.bones);
	utils.debug && console.log("morphs", Controls.morphs);
    }
};
