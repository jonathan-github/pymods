importScripts(
    "../lib/js/gl-matrix-min.js",
    "dquat.js",
    "utils.js",
    "utils-mesh.js",
    "modifiers.js"
);

var States = [];
var Figure;

function pose(controls, tag, reset) {
    var start = self.performance.now();
    if (reset) {
        Figure.controls.reset();
        if (Figure.mesh.preset) {
            Figure.controls.start(Figure.mesh.preset);
        }
    }
    if (Array.isArray(controls)) {
        for (var i = 0, n = controls.length; i < n; ++i) {
            Figure.controls.start(controls[i]);
        }
    } else {
        Figure.controls.start(controls);
    }
    Figure.transform(Figure.controls);

    if (true) {
	var transferList = [];
	//Figure.meshUpdate();
	var state;
	if (States.length > 0) {
	    state = States.pop();
	} else {
	    state = {};
	}
	Figure.transfer(state, transferList, /*update*/true);
	var elapsed = self.performance.now() - start;
	if (tag && !tag.noreply) {
	    tag.elapsed = elapsed;
	    postMessage({ tag: tag, state: state }, transferList);
	}
    } else {
	var elapsed = self.performance.now() - start;
	reply && postMessage({
	    transform: {
		bones: Figure.controls.bones,
		morphs: Figure.controls.morphs
	    },
	    elapsed: elapsed,
	    msg: msg
	});
    }
}

onmessage = function(e) {
    false && console.log("onmessage", e.data);
    var data = e.data;
    var scripts = data.scripts;
    if (scripts) {
	for (var i = 0, n = scripts.length; i < n; ++i) {
	    self.importScripts("../" + scripts[i]);
	}
    }
    if (data.models) {
	Figure = utils.Surface.create(
	    /*gl*/ null,
	    data.models.figure,
	    /* library */ null,
	    data.wireframe
	);
	var items = data.models.items;
	if (items) {
	    for (var i = 0, n = items.length; i < n; ++i) {
		var item = utils.Surface.create(
		    /*gl*/ null,
		    items[i],
		    /* library */ null,
		    data.wireframe
		);
		Figure.followers.push(item);
	    }
	}
    }
    if (data.controls) {
	if (data.state) {
	    States.push(data.state);
	}
	pose(data.controls, data.tag, data.reset);
    }
};
