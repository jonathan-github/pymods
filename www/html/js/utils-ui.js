/**
 * @file UI classes and functions
 */

/**
 * Display a cursor at a specified location.
 * The cursor is implemented as a 24px Material Icon.
 *
 * Example CSS rule for the cursor:
 *
 * .ui-cusor {
 *   z-index: 10;
 *   position: fixed;
 *   width: 24px;
 *   height: 24px;
 *   color: magenta;
 *   pointer-events: none;
 * }
 */
utils.Cursor = utils.extend(utils.Object, {
    /**
     * Initialze the cursor.
     *
     * config = {
     *   id: <string>,	 // optional id for the cursor's div
     *   parent: <Node>, // defaults to document.body
     *   icon: <string>	 // defaults to 'location_searching'
     * }
     */
    init: function(config) {
        this.config = config;
    },

    /**
     * Build the cursor's DOM elements.
     * @private
     */
    build: function() {
        if (this.div) {
            return;
        }
        var config = this.config;
        this.div = document.createElement('div');
        if (config && config.id) {
            this.div.id = config.id;
        }
        this.div.className = 'ui-cursor';
        this.i = document.createElement('i');
        this.i.className = 'material-icons';
        this.i.appendChild(document.createTextNode(
            (config && config.icon) || 'location_searching'
        ));
        this.div.appendChild(this.i);
        var parent = (config && config.parent) || document.body;
        parent.appendChild(this.div);
    },

    /**
     * Show the cursor at x,y relative to the target.
     */
    show: function(target, x, y) {
        this.build();
        this.move(target, x, y);
        if (this.div.style.visibility != 'visible') {
            this.div.style.visibility = 'visible';            
        }
    },

    /**
     * Move the cursor to x,y relative to the target.
     */
    move: function(target, x, y) {
        var div = this.div;
        if (!div) {
            return;
        }
        var bb = target.getBoundingClientRect();
        var size = div.getBoundingClientRect();
        var cx = (bb.x + x - size.width/2) + 'px';
        var cy = (bb.y + y - size.height/2) + 'px';
        if (div.style.left != cx) {
            div.style.left = cx;
        }
        if (div.style.top != cy) {
            div.style.top = cy;
        }
    },

    /**
     * Hide the cursor.
     */
    hide: function() {
        var div = this.div;
        if (div && div.style.visibility != 'hidden') {
            div.style.visibility = 'hidden';            
        }
    }
});

/**
 * Display a tooltip at a specified location.
 *
 * The tooltip consists of a title and a set of name/value pairs.
 * The title is placed in an h1 element.
 * The name/value pairs are placed in a table.
 *
 * Example CSS rules for the tooltip:
 *
 * .ui-tooltip {
 *   z-index: 11;
 *   position: fixed;
 *   display: flex;
 *   flex-direction: column;
 *   opacity: 0.75;
 *   pointer-events: none;
 * }
 * .ui-tooltip h1 {
 *   font-size: 16px;
 *   margin: 0px;
 * }
 * .ui-tooltip table {
 *   background-color: #f9f9f9;
 *   border: 1px solid #ccc;
 *   box-shadow: -3px 3px 5px #ccc;
 * }
 */
utils.ToolTip = utils.extend(utils.Object, {
    /**
     * Initialize the tooltip.
     * config = {
     *   id: <string>,	 // optional id for the tooltip's div
     *   parent: <Node>, // defaults to document.body
     *   icon: <string>	 // defaults to 'location_searching'
     *   fields: [
     *     {
     *        id: <string>,   // the field name
     *        label: <string> // the field label displayed in the table
     *     },
     *     ...
     *   ]
     * }
     */
    init: function(config) {
        this.config = config;
    },

    /**
     * Build the tooltip's DOM elements.
     * @private
     */
    build: function() {
        if (this.div) {
            return;
        }
        this.div = document.createElement('div');
        if (this.config.id) {
            this.div.id = this.config.id;
        }
        this.div.className = 'ui-tooltip';
        var fields = this.config.fields;
        var tb = utils.TableBuilder.create();
        for (var i = 0, n = fields.length; i < n; ++i) {
            var field = fields[i];
            if (field.id == 'title') {
                var h1 = document.createElement('h1');
                field.span = document.createElement('span');
                h1.appendChild(field.span);
                this.div.appendChild(h1);
                continue;
            }
            tb.rowAdd();
            var th = tb.cellAdd('th');
            th.style.textAlign = 'left';
            utils.contentText(th, field.label + ": ");
            var td = tb.cellAdd();
            td.style.textAlign = 'right';
            var span = document.createElement('span');
            td.appendChild(span);
            field.span = span;
        }
        this.div.appendChild(tb.table);
        var parent = this.config.parent || document.body;
        parent.appendChild(this.div);
    },

    /**
     * Show the tooltip at the mouse event location.
     * The params object contains the name/values pairs
     * to display in the table.
     */
    show: function(params, event) {
        this.build();
        var fields = this.config.fields;
        for (var i = 0, n = fields.length; i < n; ++i) {
            var field = fields[i];
            var val = params[field.id];
            if (val != undefined) {
                utils.contentText(field.span, val.toString());
            } else {
                utils.contentClear(field.span);
            }
        }
        if (event) {
            this.move(event);
        }
        if (this.div.style.visibility != 'visible') {
            this.div.style.visibility = 'visible';
        }
    },

    move: function(event) {
        var x = event.clientX;
        var y = event.clientY;
        var w = window.innerWidth;
        var h = window.innerHeight;
        var styles = {};
        if (x < w/2) {
            // right side
            styles.left = (x + 10) + 'px';
            styles.right = 'auto';
            styles.alignItems = 'flex-start';
        } else {
            // left side
            styles.left = 'auto';
            styles.right = (w - x + 10) + 'px';
            styles.alignItems = 'flex-end';
        }
        if (y < h/2) {
            // below
            styles.top = (y + 10) + 'px';
            styles.bottom = 'auto';
        } else {
            // above
            styles.top = 'auto';
            styles.bottom = (h - y + 10) + 'px';
        }
        utils.styleSet(this.div, styles);
    },

    hide: function() {
        var div = this.div;
        if (div && div.style.visibility != 'hidden') {
            div.style.visibility = 'hidden';
        }
    }
});

utils.ToolbarButton = utils.extend(utils.Object, {
    init: function(config) {
        var div = document.createElement('div');
        div.className = 'ui-toolbar-button';
        if (config.id) {
            div.id = config.id;
        }
        if (config.title) {
            div.title = config.title;
        }
        var icon;
        if (config.svg) {
            icon = document.createElement('img');
            icon.src = config.svg;
            utils.styleSet(icon, {
                width: '24px',
                height: '24px'
            });
        } else {
            icon = document.createElement('i');
            var iconClassName = 'material-icons';
            if (config.className) {
                iconClassName += ' ' + config.className;
            }
            icon.className = iconClassName;
            icon.appendChild(document.createTextNode(config.icon));
        }
        div.appendChild(icon);
        this.icon = icon;
        if (config.label) {
            var label = document.createElement('div');
            label.appendChild(document.createTextNode(config.label));
            div.appendChild(label);
            this.label = label;
        }
        this.div = div;
        if (config.handler) {
            utils.on(div, 'click', config.handler, config.scope);
        }
        if (config.toggle != undefined) {
            this.toggleSet(config.toggle);
            utils.on(div, 'click', this.toggleClick, this);
            this.handler = config.handler;
            this.scope = config.scope;
        }
    },
    toggleSet: function(state) {
        if (state) {
            this.toggle = true;
            this.div.className = 'ui-toolbar-button ui-toolbar-button-on';
        } else {
            this.toggle = false;
            this.div.className = 'ui-toolbar-button ui-toolbar-button-off';
        }
    },
    toggleClick: function() {
        this.toggleSet(!this.toggle);
        if (this.handler) {
            this.handler.call(this.scope, this.toggle);
        }
    }
});

utils.Toolbar = utils.extend(utils.Object, {
    HIDE_ICON: "arrow_drop_up",
    HIDE_MSG: "Hide the toolbar.",
    SHOW_ICON: "arrow_drop_down",
    SHOW_MSG: "Show the toolbar.",

    init: function(config) {
        var div = document.createElement('div');
        div.className = 'ui-toolbar';
        utils.userSelectSet(div, 'none');
        this.div = div;
        if (config.id) {
            div.id = config.id;
        }

        this.buttons = [];
        for (var i = 0, n = config.buttons.length; i < n; ++i) {
            var button = utils.ToolbarButton.create(config.buttons[i]);
            div.appendChild(button.div);
            this.buttons.push(button);
        }
        this.closeBtn = utils.ToolbarButton.create({
            icon: this.HIDE_ICON,
            title: this.HIDE_MSG,
            handler: this.closeHandler,
            scope: this
        });
        div.appendChild(this.closeBtn.div);

        var parent = config.parent || document.body;
        parent.appendChild(div);
    },

    closeHandler: function() {
        if (this.closed) {
            this.closed = false;
            this.closeBtn.div.title = this.HIDE_MSG;
            utils.contentText(this.closeBtn.icon, this.HIDE_ICON);
            this.displaySet('block');
        } else {
            this.closed = true;
            this.closeBtn.div.title = this.SHOW_MSG;
            utils.contentText(this.closeBtn.icon, this.SHOW_ICON);
            this.displaySet('none');
        }
    },
    displaySet: function(mode) {
        for (var i = 0, n = this.buttons.length; i < n; ++i) {
            var button = this.buttons[i];
            button.div.style.display = mode;
        }
    }
});
