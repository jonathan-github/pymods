/**
 * @file WebGL utility classes and functions
 * https://www.khronos.org/registry/webgl/specs/latest/2.0/
 */

/**
 * Manage a WebGL2RenderingContext instance.
 */
GL.Context = utils.extend(GL.ContextBase, {
    TYPE: 'Context',

    /**
     * config = {
     *   name: <string>
     * }
     */
    init: function(gl, config) {
        this.gl = gl;
        this.config = config;
        this.name = config && config.name || "context";
        this.idGen = 0;
        this.idMap = {};
        this.bufferTargets = {};
        this.samplers = {};
        this.activeTextureUnit = undefined;
        this.activeTextureTargets = undefined;
        this.textureTargets = {};
        this.validate = true;
        return this;
    },

    objectName: function(obj) {
        var id = obj.id;
        if (id == undefined) {
            obj.id = id = ++this.idGen;
        }
        var name = obj.name;
        if (!name) {
            var config = obj.config;
            obj.name = config && config.name || obj.TYPE + "#" + obj.id;
        }
    },

    objectAdd: function(obj) {
        this.objectName(obj);
        this.idMap[obj.id] = obj;
    },
    objectRemove: function(obj) {
        var id = obj.id;
        if (id != undefined) {
            if (this.idMap[id] == obj) {
                delete this.idMap[id];
            }
        }
    },

    objectFind: function(glObj, glProp) {
        if (glObj == null) {
            return null;
        }
        var idMap = this.idMap;
        for (var key in idMap) {
            var obj = idMap[key];
            if (obj[glProp] == glObj) {
                return obj;
            }
        }
        return null;
    },

    /**
     * Get the buffer currently bound to target.
     */
    bufferTargetGet: function(targetName) {
        var cur = this.bufferTargets[targetName];
        if (cur === undefined) {
            /* unknown */
            cur = this.gl.getParameter(
                GL.BufferTargetBindings[targetName]
            );
            this.bufferTargets[targetName] = cur;
        } else if (this.validate) {
            var expected = this.gl.getParameter(
                GL.BufferTargetBindings[targetName]
            );
            if (cur != expected) {
                console.log(
                    targetName,
                    this.objectFind(expected, 'glBuffer'),
                    this.objectFind(cur, 'glBuffer')
                );
            }
            utils.assert && utils.assert(
                cur == expected,
                targetName + " out of sync",
                [targetName,
                 this.objectFind(expected, 'glBuffer'),
                 this.objectFind(cur, 'glBuffer')]
            );
            if (cur != expected) {
                cur = this.bufferTargets[targetName] = expected;
            }
        }
        return cur;
    },

    /**
     * Bind the buffer to the target.
     */
    bindBuffer: function(target, buffer) {
        var gl = this.gl;
        var targetName = GL.enumName(target);
        var cur = this.bufferTargetGet(targetName);
        if (cur == buffer.glBuffer) {
            /* already bound to target */
            return;
        }
        (utils.debug || buffer.debug) && console.log(
            buffer.name,
            "bindBuffer",
            targetName
        );
        gl.bindBuffer(target, buffer.glBuffer);
        this.bufferTargets[targetName] = buffer.glBuffer;
    },

    /**
     * Unbind the buffer from the target.
     */
    unbindBuffer: function(target, buffer) {
        var gl = this.gl;
        var targetName = GL.enumName(target);
        var cur = this.bufferTargetGet(targetName);
        if (cur != buffer.glBuffer) {
            /* not bound to target */
            return;
        }
        (utils.debug || buffer.debug) && console.log(
            buffer.name,
            "unbindBuffer",
            targetName
        );
        gl.bindBuffer(target, null);
        this.bufferTargets[targetName] = null;
    },

    /**
     * Unbind the buffer from all targets.
     */
    unbindBufferAll: function(buffer) {
        for (var i = 0, n = GL.BufferTargets.length; i < n; ++i) {
            this.unbindBuffer(GL.BufferTargets[i], buffer);
        }
    },

    /**
     * Bind the sampler to the texture unit.
     */
    bindSampler: function(unit, sampler) {
        var gl = this.gl;
        var cur = this.samplers[unit];
        if (cur == sampler.glSampler) {
            /* already bound to unit */
            return;
        }
        (utils.debug || sampler.debug) && console.log(
            sampler.name,
            "bindSampler",
            unit
        );
        gl.bindSampler(unit, sampler.glSampler);
        this.samplers[unit] = sampler.glSampler;
    },

    /**
     * Unbind the sampler from the texture unit.
     */
    unbindSampler: function(unit, sampler) {
        var gl = this.gl;
        var cur = this.samplers[unit];
        if (cur != sampler.glSampler) {
            /* not bound to unit */
            return;
        }
        (utils.debug || sampler.debug) && console.log(
            sampler.name,
            "unbindSampler",
            unit
        );
        gl.bindSampler(unit, null);
        this.samplers[unit] = null;
    },

    /**
     * Unbind the sampler from all texture units.
     */
    unbindSamplerAll: function(sampler) {
        var gl = this.gl;
        var units = [];
        for (var key in this.samplers) {
            var cur = this.samplers[key];
            if (cur == sampler.glSampler) {
                units.push(parseInt(key));
            }
        }
        for (var i = 0, n = units.length; i < n; ++i) {
            this.unbindSampler(units[i], sampler);
        }
    },

    /**
     * Get the active texture unit TEXTURE<i> GLenum.
     */
    activeTextureGet: function() {
        var gl = this.gl;
        var cur = this.activeTextureUnit;
        if (cur === undefined) {
            /* unknown */
            cur = gl.getParameter(gl.ACTIVE_TEXTURE);
            this.activeTextureUnit = cur;
        } else if (this.validate) {
            var expected = gl.getParameter(gl.ACTIVE_TEXTURE);
            utils.assert && utils.assert(
                cur == expected,
                "ACTIVE_TEXTURE out of sync",
                [expected, cur]
            );
            if (cur != expected) {
                cur = this.activeTextureUnit = expected;
            }
        }
        var unitName = GL.enumName(cur);
        var textureTargets = this.textureTargets[unitName];
        if (!textureTargets) {
            textureTargets = this.textureTargets[unitName] = {};
        }
        this.activeTextureTargets = textureTargets;
        return cur;
    },

    /**
     * Set the active texture unit.
     */
    activeTexture: function(idx) {
        var gl = this.gl;
        var unit = gl.TEXTURE0 + idx;
        var cur = this.activeTextureGet();
        if (cur == unit) {
            /* already active */
            return;
        }
        var unitName = GL.enumName(unit);
        utils.debug && console.log(
            this.name,
            "activeTexture",
            unitName
        );
        gl.activeTexture(unit);
        this.activeTextureUnit = unit;
    },

    /**
     * Get the texture currently bound to target.
     */
    textureTargetGet: function(targetName) {
        var gl = this.gl;
        var unit = this.activeTextureGet();
        var textureTargets = this.activeTextureTargets;
        var cur = textureTargets[targetName];
        if (cur === undefined) {
            /* unknown */
            cur = gl.getParameter(
                GL.TextureTargetBindings[targetName]
            );
            textureTargets[targetName] = cur;
        } else if (this.validate) {
            var expected = gl.getParameter(
                GL.TextureTargetBindings[targetName]
            );
            utils.assert && utils.assert(
                cur == expected,
                targetName + " out of sync for texture unit " + unit,
                [expected, cur]
            );
            if (cur != expected) {
                cur = textureTargets[targetName] = expected;
            }
        }
        return cur;
    },

    /**
     * Bind the texture to the target.
     */
    bindTexture: function(target, texture) {
        var gl = this.gl;
        var targetName = GL.enumName(target);
        var cur = this.textureTargetGet(targetName);
        if (cur == texture.glTexture) {
            /* already bound */
            return;
        }
        (utils.debug || texture.debug) && console.log(
            texture.name,
            "bindTexture",
            targetName
        );
        gl.bindTexture(target, texture.glTexture);
        this.activeTextureTargets[targetName] = texture.glTexture;
    },

    /**
     * Unbind the texture from the target.
     */
    unbindTexture: function(target, texture) {
        var gl = this.gl;
        var targetName = GL.enumName(target);
        var cur = this.textureTargetGet(targetName);
        (utils.debug || texture.debug) && console.log(
            texture.name,
            "unbindTexture",
            targetName
        );
        gl.bindTexture(target, null);
        this.activeTextureTargets[targetName] = null;
    },

    /**
     * Unbind the texture from all targets.
     */
    unbindTextureAll: function(texture) {
        var gl = this.gl;
        for (var i = 0, n = GL.TextureTargets.length; i < n; ++i) {
            this.unbindTexture(GL.TextureTargets[i], texture);
        }
    },

    vertexArrayGet: function() {
        var gl = this.gl;
        var cur = this.vertexArray;
        if (cur === undefined) {
            /* unknown */
            cur = gl.getParameter(gl.VERTEX_ARRAY_BINDING);
            this.vertexArray = cur;
        } else if (this.validate) {
            /* validate */
            var expected = gl.getParameter(gl.VERTEX_ARRAY_BINDING);
            utils.assert && utils.assert(
                cur == expected,
                "VERTEX_ARRAY out of sync",
                [expected, cur]
            );
            if (cur != expected) {
                cur = this.vertexArray = expected;
            }
        }
        return cur;
    },

    bindVertexArray: function(vao) {
        var gl = this.gl;
        var cur = this.vertexArrayGet();
        if (cur == vao.glVertexArray) {
            /* already bound */
            return;
        }
        (utils.debug || vao.debug) && console.log(
            vao.name,
            "bindVertexArray"
        );
        gl.bindVertexArray(vao.glVertexArray);
        this.vertexArray = vao.glVertexArray;
    },

    unbindVertexArray: function(vao) {
        var gl = this.gl;
        var cur = this.vertexArrayGet();
        if (vao == undefined) {
            if (cur == null) {
                /* not bound */
                return;
            }
        } else if (cur != vao.glVertexArray) {
            /* not bound */
            return;
        }
        (utils.debug || vao.debug) && console.log(
            vao && vao.name || "null",
            "unbindVertexArray"
        );
        gl.bindVertexArray(null);
        this.vertexArray = null;
    },

    drawArrays: function(mode, first, count) {
        var gl = this.gl;
        (utils.debug || this.debug) && console.log(
            this.name,
            "drawArrays",
            { mode: GL.enumName(mode),
              first: first,
              count: count }
        );
        gl.drawArrays(mode, first, count);
    },

    drawElements: function(mode, count, type, offset) {
        var gl = this.gl;
        (utils.debug || this.debug) && console.log(
            this.name,
            "drawElements",
            { mode: GL.enumName(mode),
              count: count,
              type: GL.enumName(type),
              offset: offset }
        );
        gl.drawElements(mode, count, type, offset);
    }
});

/**
 * WebGLBuffer
 */
GL.Buffer = utils.extend(utils.Object, {
    TYPE: 'Buffer',

    /**
     * config = {
     *   name: <string>,
     *   target: <GLenum>
     * }
     */
    init: function(context, config) {
        this.context = context;
        this.config = config;
        this.allocated = false;
        this.glBuffer = context.gl.createBuffer();
        context.objectAdd(this);
        return this;
    },

    fini: function() {
        var glBuffer = this.glBuffer;
        if (glBuffer) {
            this.unbindAll(this);
            this.context.objectRemove(this);

            (utils.debug || this.debug) && console.log(
                this.name,
                "deleteBuffer"
            );
            this.context.gl.deleteBuffer(glBuffer);
            this.allocated = false;
            this.glBuffer = null;
            this.context = null;
            this.config = null;
        }
    },

    bind: function(target) {
        if (target == undefined) {
            target = this.config && this.config.target;
        }
        this.context.bindBuffer(target, this);
    },
    unbind: function(target) {
        if (target == undefined) {
            target = this.config && this.config.target;
        }
        this.context.unbindBuffer(target, this);
    },
    unbindAll: function() {
        this.context.unbindBufferAll(this);
    },

    /**
     * Copy the source data to the buffer.
     * params = {
     *   target: <GLenum> | config.target | ARRAY_BUFFER,
     *   size: <GLsizei>,
     *   usage: <GLenum>
     * }
     * params = {
     *   target: <GLenum> | config.target | ARRAY_BUFFER,
     *   srcData: <ArrayBufferView>,
     *   usage: <GLenum>
     *   srcOffset: <GLuint> | 0,
     *   length: <GLuint> | 0
     * }
     */
    setData: function(params) {
        var target = params.target,
            size = params.size,
            usage = params.usage,
            srcData = params.srcData,
            srcOffset = params.srcOffset,
            length = params.length;
        var gl = this.context.gl;
        var config = this.config;
        if (target == undefined) {
            target = config && config.target || gl.ARRAY_BUFFER;
        }
        if (srcData == undefined) {
            console.assert(
                size != undefined,
                this.name,
                "bufferData",
                "missing size"
            );
        } else {
            console.assert(
                size == undefined,
                this.name,
                "bufferData",
                "specify either size or srcData, but not both"
            );
            if (srcOffset == undefined) {
                srcOffset = 0;
            }
            if (length == undefined) {
                length = 0;
            }
        }

        this.bind(target);
        if (srcData) {
            (utils.debug || this.debug) && console.log(
                this.name,
                "bufferData",
                { target: GL.enumName(target),
                  srcData: srcData,
                  usage: GL.enumName(usage),
                  srcOffset: srcOffset,
                  length: length }
            );
            gl.bufferData(
                target, srcData, usage, srcOffset, length
            );
        } else {
            (utils.debug || this.debug) && console.log(
                this.name,
                "bufferData",
                { target: GL.enumName(target),
                  size: size,
                  usage: GL.enumName(usage) }
            );
            gl.bufferData(target, size, usage);
        }
        this.allocated = true;
    },

    /**
     * Update a subset of the buffer.
     * params = {
     *   target: <GLenum> | config.target | ARRAY_BUFFER,
     *   offset: <GLuint>,
     *   srcData: <ArrayBuffer>|<ArrayBufferView>,
     * }
     * params = {
     *   target: <GLenum> | config.target | ARRAY_BUFFER,
     *   dstByteOffset: <GLuint>,
     *   srcData: <ArrayBufferView>,
     *   srcOffset: <GLuint> | 0,
     *   length: <GLuint> | 0
     * }
     */
    setSubData: function(params) {
        utils.assert && utils.assert(
            this.allocated,
            "buffer " + this.name + " has not been allocated yet"
        );

        var target = params.target,
            offset = params.offset,
            dstByteOffset = params.dstByteOffset,
            srcData = params.srcData,
            srcOffset = params.srcOffset,
            length = params.length;
        var gl = this.context.gl;
        var config = this.config;
        if (target == undefined) {
            target = config && config.target || gl.ARRAY_BUFFER;
        }
        if (offset == undefined) {
            console.assert(
                dstByteOffset != undefined,
                this.name,
                "bufferSubData",
                "missing dstByteOffset"
            );
            if (srcOffset == undefined) {
                srcOffset = 0;
            }
            if (length == undefined) {
                length = 0;
            }
        } else {
            console.assert(
                dstByteOffset == undefined,
                this.name,
                "bufferSubData",
                "specify either offset or dstByteOffset, but not both"
            );
        }
        console.assert(
            srcData != undefined,
            this.name,
            "bufferSubData",
            "missing srcData"
        );

        this.bind(target);
        if (offset == undefined) {
            (utils.debug || this.debug) && console.log(
                this.name,
                "bufferSubData",
                "target =", GL.enumName(target),
                "dstByteOffset =", dstByteOffset,
                "srcData =", srcData,
                "usage =", GL.enumName(usage),
                "srcOffset =", srcOffset,
                "length =", length
            );
            gl.bufferSubData(
                target, dstByteOffset,
                srcData, srcOffset, length
            );
        } else {
            (utils.debug || this.debug) && console.log(
                this.name,
                "bufferSubData",
                "target =", GL.enumName(target),
                "offset =", offset,
                "srcData =", srcData
            );
            gl.bufferSubData(target, offset, srcData);
        }
    },

    /**
     * Copy data from another buffer into this buffer.
     *
     * This method will:
     *   if readBuffer
     *       bind readBuffer to readTarget
     *   bind this buffer to the writeTarget
     *   call copyBufferSubData
     *   unbind this boffer from the writeTarget
     *   if readBuffer
     *       unbind readBuffer from readTarget
     *
     * params = {
     *   readBuffer: <GL.Buffer>,
     *   readTarget: <GLenum> | COPY_READ_BUFFER,
     *   writeTarget: <GLenum> | COPY_WRITE_BUFFER,
     *   readOffset: <GLintptr>,
     *   writeOffset: <GLintptr>,
     *   size: <GLsizei>
     * }
     */
    copyBufferSubData: function(params) {
        utils.assert && utils.assert(
            this.allocated,
            "buffer " + this.name + " has not been allocated yet"
        );

        var readBuffer = params.readBuffer,
            readTarget = params.readTarget,
            writeTarget = params.writeTarget,
            readOffset = params.readOffset,
            writeOffset = params.writeOffset,
            size = params.size;
        var gl = this.context.gl;
        var config = this.config;
        if (readTarget == undefined) {
            readTarget = gl.COPY_READ_BUFFER;
        }
        if (writeTarget == undefined) {
            writeTarget = gl.COPY_WRITE_BUFFER;
        }
        if (readOffset == undefined) {
            readOffset = 0;
        }
        if (writeOffset == undefined) {
            writeOffset = 0;
        }
        console.assert(
            size != undefined,
            this.name,
            "copyBufferSubData",
            "missing size"
        );

        if (readBuffer) {
            readBuffer.bind(readTarget);
        }
        this.bind(writeTarget);
        (utils.debug || this.debug) && console.log(
            this.name,
            "copyBufferSubData",
            { readBuffer: (readBuffer ? readBuffer.name : null),
              readTarget: GL.enumName(readTarget),
              writeTarget:  GL.enumName(writeTarget),
              readOffset: readOffset,
              writeOffset: writeOffset,
              size: size }
        );
        gl.copyBufferSubData(
            readTarget, writeTarget,
            readOffset, writeOffset,
            size
        );
        this.unbind(writeTarget);
        if (readBuffer) {
            readBuffer.unbind(readTarget);
        }
    },

    /**
     * Get a subset of the buffer.
     * params = {
     *   target: <GLenum> | config.target | ARRAY_BUFFER,
     *   srcByteOffset: <GLuint> | 0,
     *   dstData: <ArrayBufferView>,
     *   dstOffset: <GLuint> | 0,
     *   length: <GLuint> | 0
     * }
     */
    getBufferSubData: function(params) {
        utils.assert && utils.assert(
            this.allocated,
            "buffer " + this.name + " has not been allocated yet"
        );

        var target = params.target,
            srcByteOffset = params.srcByteOffset,
            dstData = params.dstData,
            dstOffset = params.dstOffset,
            length = params.length;
        var gl = this.context.gl;
        var config = this.config;
        if (target == undefined) {
            target = config && config.target || gl.ARRAY_BUFFER;
        }
        if (srcByteOffset == undefined) {
            srcByteOffset = 0;
        }
        if (dstOffset == undefined) {
            dstOffset = 0;
        }
        if (length == undefined) {
            length = 0;
        }
        console.assert(
            dstData != undefined,
            this.name,
            "bufferSubData",
            "missing srcData"
        );

        this.bind(target);
        (utils.debug || this.debug) && console.log(
            this.name,
            "getBufferSubData",
            { target: GL.enumName(target),
              srcByteOffset: srcByteOffset,
              dstData: dstData,
              dstOffset: dstOffset,
              length: length }
        );
        gl.getBufferSubData(
            target,
            srcByteOffset,
            dstData,
            dstOffset,
            length
        );
        this.unbind(target);
    }
});

/**
 * WebGLSampler
 */
GL.Sampler = utils.extend(utils.Object, {
    TYPE: 'Sampler',

    /**
     * config = {
     *   name: <string>,
     *   params: {
     *     COMPARE_FUNC: <GLenum>,
     *     COMPARE_MODE: <GLenum>,
     *     MAG_FILTER: <GLenum>,
     *     MAX_LOD: <GLfloat>,
     *     MIN_FILTER: <GLenum>,
     *     MIN_LOD: <GLfloat>,
     *     WRAP_R: <GLenum>,
     *     WRAP_S: <GLenum>,
     *     WRAP_T: <GLenum>
     *   }
     * }
     */
    init: function(context, config) {
        this.context = context;
        this.config = config;
        this.glSampler = context.gl.createSampler();
        context.objectAdd(this);
        var params = config && config.params;
        if (params) {
            this.setParams(params);
        }
        return this;
    },

    fini: function() {
        var glSampler = this.glSampler;
        if (glSampler) {
            this.unbindAll(this);
            this.context.objectRemove(this);

            (utils.debug || this.debug) && console.log(
                this.name,
                "deleteSampler"
            );
            this.context.gl.deleteSampler(glSampler);
            this.glSampler = null;
            this.context = null;
            this.config = null;
        }
    },

    bind: function(unit) {
        this.context.bindSampler(unit, this);
    },
    unbind: function(unit) {
        this.context.unbindSampler(unit, this);
    },
    unbindAll: function(unit) {
        this.context.unbindSamplerAll(this);
    },

    getParams: function() {
        var gl = this.context.gl;
        var sampler = this.glSampler;
        var params = {};
        for (var name in GL.SamplerParams) {
            var enumValue = GL.SamplerParms[name];
            params[name] = gl.getSamplerParameter(sampler, enumValue);
        }
        return params;
    },

    setParams: function(params) {
        for (var pname in params) {
            var value = params[pname];
            var setter = this[pname];
            if (setter) {
                setter.call(this, value);
            } else {
                console.error("unknown sampler parameter", pname);
            }
        }
    },

    COMPARE_FUNC: function(value) {
        var gl = this.context.gl;
        var pname = gl.TEXTURE_COMPARE_FUNC;
        (utils.debug || this.debug) && console.log(
            this.name,
            "samplerParameteri",
            GL.enumName(pname),
            GL.enumName(value)
        );
        this.context.gl.samplerParameteri(this.glSampler, pname, value);
    },
    COMPARE_MODE: function(value) {
        var gl = this.context.gl;
        var pname = gl.TEXTURE_COMPARE_MODE;
        (utils.debug || this.debug) && console.log(
            this.name,
            "samplerParameteri",
            GL.enumName(pname),
            GL.enumName(value)
        );
        this.context.gl.samplerParameteri(this.glSampler, pname, value);
    },
    MAG_FILTER: function(value) {
        var gl = this.context.gl;
        var pname = gl.TEXTURE_MAG_FILTER;
        (utils.debug || this.debug) && console.log(
            this.name,
            "samplerParameteri",
            GL.enumName(pname),
            GL.enumName(value)
        );
        this.context.gl.samplerParameteri(this.glSampler, pname, value);
    },
    MAX_LOD: function(value) {
        var gl = this.context.gl;
        var pname = gl.TEXTURE_MAX_LOD;
        (utils.debug || this.debug) && console.log(
            this.name,
            "samplerParameterf",
            GL.enumName(pname),
           value
        );
        this.context.gl.samplerParameterf(this.glSampler, pname, value);
    },
    MIN_FILTER: function(value) {
        var gl = this.context.gl;
        var pname = gl.TEXTURE_MIN_FILTER;
        (utils.debug || this.debug) && console.log(
            this.name,
            "samplerParameteri",
            GL.enumName(pname),
            GL.enumName(value)
        );
        this.context.gl.samplerParameteri(this.glSampler, pname, value);
    },
    MIN_LOD: function(value) {
        var gl = this.context.gl;
        var pname = gl.TEXTURE_MIN_LOD;
        (utils.debug || this.debug) && console.log(
            this.name,
            "samplerParameterf",
            GL.enumName(pname),
           value
        );
        this.context.gl.samplerParameterf(this.glSampler, pname, value);
    },
    WRAP_R: function(value) {
        var gl = this.context.gl;
        var pname = gl.TEXTURE_WRAP_R;
        (utils.debug || this.debug) && console.log(
            this.name,
            "samplerParameteri",
            GL.enumName(pname),
            GL.enumName(value)
        );
        this.context.gl.samplerParameteri(this.glSampler, pname, value);
    },
    WRAP_S: function(value) {
        var gl = this.context.gl;
        var pname = gl.TEXTURE_WRAP_S;
        (utils.debug || this.debug) && console.log(
            this.name,
            "samplerParameteri",
            GL.enumName(pname),
            GL.enumName(value)
        );
        this.context.gl.samplerParameteri(this.glSampler, pname, value);
    },
    WRAP_T: function(value) {
        var gl = this.context.gl;
        var pname = gl.TEXTURE_WRAP_T;
        (utils.debug || this.debug) && console.log(
            this.name,
            "samplerParameteri",
            GL.enumName(pname),
            GL.enumName(value)
        );
        this.context.gl.samplerParameteri(this.glSampler, pname, value);
    }
});

/**
 * WebGLTexture
 */
GL.Texture = utils.extend(utils.Object, {
    TYPE: 'Texture',

    /**
     * config = {
     *   name: <string>,
     *   target: <GLenum>,
     *   internalFormat: <GLenum>,
     *   width: <GLsizei>,
     *   height: <GLsizei>,
     *   format: <GLenum>,
     *   type: <GLenum>
     * }
     */
    init: function(context, config) {
        this.context = context;
        this.config = config;
        this.allocated = false;
        this.glTexture = context.gl.createTexture();
        context.objectAdd(this);
        return this;
    },

    fini: function() {
        var glTexture = this.glTexture;
        if (glTexture) {
            this.unbindAll(this);
            this.context.objectRemove(this);

            (utils.debug || this.debug) && console.log(
                this.name,
                "deleteTexture"
            );
            this.context.gl.deleteTexture(glTexture);
            this.allocated = false;
            this.glTexture = null;
            this.context = null;
            this.config = null;
        }
    },

    bind: function(target) {
        if (target == undefined) {
            target = this.config && this.config.target;
        }
        this.context.bindTexture(target, this);
    },
    unbind: function(target) {
        if (target == undefined) {
            target = this.config && this.config.target;
        }
        this.context.unbindTexture(target, this);
    },
    unbindAll: function() {
        this.context.unbindTextureAll(this);
    },

    /**
     * Allocate texture storage.
     * params = {
     *   target: <GLenum> | config.target | TEXTURE_2D,
     *   levels: <GLint> | 1,
     *   internalFormat: <GLint> | config.internalFormat | RGBA,
     *   width: <GLsizei> | config.width,
     *   height: <GLsizei> | config.height
     * }
     */
    setStorage: function(params) {
        var gl = this.context.gl;
        var target = params.target,
            levels = params.levels,
            internalFormat = params.internalFormat,
            width = params.width,
            height = params.height;

        var config = this.config;
        if (target == undefined) {
            target = config && config.target || gl.TEXTURE_2D;
        }
        if (levels == undefined) {
            levels = 1;
        }
        if (internalFormat == undefined) {
            internalFormat = config && config.internalFormat || gl.RGBA;
        }
        if (width == undefined) {
            width = config && config.width;
        }
        if (height == undefined) {
            height = config && config.height;
        }
        console.assert(
            width != undefined,
            this.name,
            "texStorage2D",
            "missing width"
        );
        console.assert(
            height != undefined,
            this.name,
            "texStorage2D",
            "missing height"
        );

        this.bind(target);
        (utils.debug || this.debug) && console.log(
            this.name,
            "texStorage2D",
            "target =", GL.enumName(target),
            "levels =", levels,
            "internalFormat =", GL.enumName(internalFormat),
            "width =", width,
            "height =", height
        );
        this.context.gl.texStorage2D(
            target, levels, internalFormat, width, height
        );
        this.allocated = true;
        this.srcWidth = width;
        this.srcHeight = height;
    },

    /**
     * Copy the image data into the texture.
     * params = {
     *   target: <GLenum> | config.target | TEXTURE_2D,
     *   level: <GLint> | 0,
     *   internalFormat: <GLint> | config.internalFormat | RGBA,
     *   width: <GLsizei> | config.width | source.width,
     *   height: <GLsizei> | config.height | source.height,
     *   border: <GLint> | 0,
     *   format: <GLenum> | config.format | internalFormat,
     *   type: <GLenum> | config.type,
     *   source: <canvas> | <image> | ...
     * }
     */
    setImage: function(params) {
        var gl = this.context.gl;
        var target = params.target,
            level = params.level,
            internalFormat = params.internalFormat,
            width = params.width,
            height = params.height,
            border = params.border,
            format = params.format,
            type = params.type,
            source = params.source;

        var config = this.config;
        if (target == undefined) {
            target = config && config.target || gl.TEXTURE_2D;
        }
        if (level == undefined) {
            level = 0;
        }
        if (internalFormat == undefined) {
            internalFormat = config && config.internalFormat || gl.RGBA;
        }
        if (format == undefined) {
            format = internalFormat;
        }
        if (border == undefined) {
            border = 0;
        }
        if (type == undefined) {
            type = config && config.type || gl.UNSIGNED_BYTE;
        }
        console.assert(
            source != undefined,
            this.name,
            "texImage2D",
            "missing source"
        );
        if (width == undefined) {
            width = config && config.width || source.width;
        }
        if (height == undefined) {
            height = config && config.height || source.height;
        }
        console.assert(
            width != undefined,
            this.name,
            "texImage2D",
            "missing width"
        );
        console.assert(
            height != undefined,
            this.name,
            "texImage2D",
            "missing height"
        );

        this.bind(target);
        (utils.debug || this.debug) && console.log(
            this.name,
            "texImage2D",
            "target =", GL.enumName(target),
            "level =", level,
            "internalFormat =", GL.enumName(internalFormat),
            "width =", width,
            "height =", height,
            //"border =", border,
            "format =", GL.enumName(format),
            "type =", GL.enumName(type),
            "source =", source
        );
        this.context.gl.texStorage2D(
            target, level, internalFormat,
            width, height, border,
            format, type, source
        );
        this.allocated = true;
        this.srcWidth = width;
        this.srcHeight = height;
    },

    /**
     * Copy the ArrayBufferView into the texture.
     * params = {
     *   target: <GLenum> | config.target | TEXTURE_2D,
     *   level: <GLint> | 0,
     *   internalFormat: <GLint> | config.internalFormat | RGBA,
     *   width: <GLsizei> | config.width | srcData.width,
     *   height: <GLsizei> | config.height | srcData.height,
     *   border: <GLint> | 0,
     *   format: <GLenum> | config.format | internalFormat,
     *   type: <GLenum> | config.type,
     *   srcData: <ArrayBufferView>,
     *   srcOffset: <GLuint> | 0
     * }
     */
    setData: function(params) {
        var gl = this.context.gl;
        var target = params.target,
            level = params.level,
            internalFormat = params.internalFormat,
            width = params.width,
            height = params.height,
            border = params.border,
            format = params.format,
            type = params.type,
            srcData = params.srcData,
            srcOffset = params.srcOffset;

        var config = this.config;
        if (target == undefined) {
            target = config && config.target || gl.TEXTURE_2D;
        }
        if (level == undefined) {
            level = 0;
        }
        if (internalFormat == undefined) {
            internalFormat = config && config.internalFormat || gl.RGBA;
        }
        if (format == undefined) {
            format = config && config.format || internalFormat;
        }
        if (border == undefined) {
            border = 0;
        }
        if (type == undefined) {
            type = config && config.type || gl.UNSIGNED_BYTE;
        }
        if (srcOffset == undefined) {
            srcOffset = 0;
        }
        console.assert(
            srcData != undefined,
            this.name,
            "texImage2D",
            "missing srcData"
        );
        if (width == undefined) {
            width = config && config.width;
        }
        if (height == undefined) {
            height = config && config.height;
        }
        console.assert(
            width != undefined,
            this.name,
            "texImage2D",
            "missing width"
        );
        console.assert(
            height != undefined,
            this.name,
            "texImage2D",
            "missing height"
        );

        this.bind(target);
        (utils.debug || this.debug) && console.log(
            this.name,
            "texImage2D",
            { target: GL.enumName(target),
              level: level,
              internalFormat: GL.enumName(internalFormat),
              width: width,
              height: height,
              //border: border,
              format: GL.enumName(format),
              type: GL.enumName(type),
              srcData: srcData,
              srcOffset: srcOffset }
        );
        this.context.gl.texImage2D(
            target, level, internalFormat,
            width, height, border,
            format, type, srcData, srcOffset
        );
        this.allocated = true;
        this.srcWidth = width;
        this.srcHeight = height;
    },

    /**
     * Copy pixels from the current WebGLFramebuffer into the texture.
     * params = {
     *   target: <GLenum> || config.target || TEXTURE_2D,
     *   level: <GLint> || 0,
     *   internalFormat: <GLenum> || config.internalFormat || gl.RGBA,
     *   x: <GLint> || 0,
     *   y: <GLint> || 0,
     *   width: <GLsizei> || config.width,
     *   height: <GLsizei> || config.height,
     *   border: <GLint> || 0
     * }
     */
    copyFramebuffer: function(params) {
        var gl = this.context.gl;
        var target = params.target,
            level = params.level,
            internalFormat = params.internalFormat,
            x = params.x,
            y = params.y,
            width = params.width,
            height = params.height,
            border = params.border;

        var config = this.config;
        if (target == undefined) {
            target = config && config.target || gl.TEXTURE_2D;
        }
        if (level == undefined) {
            level = 0;
        }
        if (internalFormat == undefined) {
            internalFormat = config && config.internalFormat || gl.RGBA;
        }
        if (border == undefined) {
            border = 0;
        }
        if (width == undefined) {
            width = config && config.width || this.srcWidth;
        }
        if (height == undefined) {
            height = config && config.height || this.srcHeight;
        }
        console.assert(
            width != undefined,
            this.name,
            "copyTexImage2D",
            "missing width"
        );
        console.assert(
            height != undefined,
            this.name,
            "copyTextImage2D",
            "missing height"
        );
        
        this.bind(target);
        (utils.debug || this.debug) && console.log(
            this.name,
            "copyTexImage2D",
            "target =", GL.enumName(target),
            "level =", level,
            "internalFormat =", GL.enumName(internalFormat),
            "x =", x,
            "y =", y,
            "width =", width,
            "height =", height
            //,"border =", border
        );
        this.context.gl.copyTexImage2D(
            target, level, internalFormat,
            x, y, width, height,
            border
        );
    },

    /**
     * Copy the PIXEL_UNPACK_BUFFER to the texture.
     * params = {
     *   target: <GLenum> || config.target || TEXTURE_2D,
     *   level: <GLint> || 0,
     *   internalFormat: <GLenum> || config.internalFormat || gl.RGBA,
     *   width: <GLsizei> || config.width,
     *   height: <GLsizei> || config.height,
     *   border: <GLint> || 0
     *   format: <GLenum> || config.format || internalFormat,
     *   type: <GLenum> || config.type,
     *   offset: <GLintptr> || 0
     * }
     */
    copyBuffer: function(params) {
        var target = params.target,
            level = params.level,
            internalFormat = params.internalFormat,
            width = params.width,
            height = params.height,
            border = params.border,
            format = params.format,
            type = params.type,
            offset = params.offset,
            buffer = params.buffer;

        var gl = this.context.gl;
        var config = this.config;
        if (target == undefined) {
            target = config && config.target || gl.TEXTURE_2D;
        }
        if (level == undefined) {
            level = 0;
        }
        if (internalFormat == undefined) {
            internalFormat = config && config.internalFormat || gl.RGBA;
        }
        if (format == undefined) {
            format = config && config.format || internalFormat;
        }
        if (border == undefined) {
            border = 0;
        }
        if (type == undefined) {
            type = config && config.type || gl.UNSIGNED_BYTE;
        }
        if (offset == undefined) {
            offset = 0;
        }
        if (width == undefined) {
            width = config && config.width || this.srcWidth;
        }
        if (height == undefined) {
            height = config && config.height || this.srcHeight;
        }
        console.assert(
            width != undefined,
            this.name,
            "texImage2D",
            "missing width"
        );
        console.assert(
            height != undefined,
            this.name,
            "texImage2D",
            "missing height"
        );

        if (buffer) {
            buffer.bind(gl.PIXEL_UNPACK_BUFFER);
        }
        this.bind(target);
        (utils.debug || this.debug) && console.log(
            this.name,
            "texImage2D",
            { target: GL.enumName(target),
              level: level,
              internalFormat: GL.enumName(internalFormat),
              width: width,
              height: height,
              //border: border,
              format: GL.enumName(format),
              type: GL.enumName(type),
              offset: offset }
        );
        gl.texImage2D(
            target, level, internalFormat,
            width, height, border,
            format, type, offset
        );
        if (buffer) {
            buffer.unbind(gl.PIXEL_UNPACK_BUFFER);
        }
    }
});

/**
 * WebGL shader loader
 */
GL.Shader = utils.extend(utils.Object, {
    TYPE: 'Shader',

    /**
     * config = {
     *   name: <string>,
     *   type: VERTEX_SHADER | FRAGMENT_SHADER,
     *   defines: {
     *     <string>: <string>,
     *     ...
     *   }
     * }
     */
    init: function(context, config) {
	var gl = context.gl;
        this.context = context;
        this.config = config;
        this.glShader = gl.createShader(config.type);
        context.objectName(this);
        if (config.sourceCode) {
            this.compile(config.sourceCode);
            config.sourceCode = null;
        }
	return this;
    },

    fini: function() {
        var glShader = this.glShader;
        if (glShader) {
            this.context.gl.deleteShader(glShader);
            this.glShader = null;
            this.context = null;
            this.config = null;
        }
    },

    /// regular expression to find #includes to replace (#inclue "NAME")
    includeRE: /#\s*include\s+"([^"]+)"/g,

    /// regular expression to find #defines to replace (#define NAME __NAME__)
    defineRE: /#\s*define\s+(\w+)\s+__(\1)__/g,

    /**
     * Preprocess the source code.
     */
    preprocess: function(sourceCode, includes) {
        var name = this.name;
        if (includes) {
            sourceCode = sourceCode.replace(
                this.includeRE,
                function(match, p1, offset, string) {
                    var value = includes[p1];
                    if (value) {
                        utils.debug > 1 && console.log(name, "#include", p1);
                        return value;
                    } else {
                        throw new Error(name + ": missing #include for " + p1);
                    }
                }
            );
        }
        var defines = this.config.defines;
        if (defines) {
            sourceCode = sourceCode.replace(
                this.defineRE,
                function(match, p1, p2, offset, string) {
                    var value = defines && defines[p2];
                    if (value) {
                        var repl = "#define " + p1 + " " + value;
                        utils.debug > 1 && console.log(name, repl);
                        return repl;
                    } else {
                        throw new Error(name + ": missing value for #define " + p1);
                    }
                }
            );
        }
        return sourceCode;
    },

    compile: function(sourceCode, includes) {
	var gl = this.context.gl;
        var glShader = this.glShader;
        if (this.config.defines || includes) {
            sourceCode = this.preprocess(sourceCode, includes);
        }
        utils.debug && console.log(
            this.name,
            "compileShader",
            GL.enumName(this.config.type)
        );
	gl.shaderSource(glShader, sourceCode);
	gl.compileShader(glShader);
	if (!gl.getShaderParameter(glShader, gl.COMPILE_STATUS)) {
	    var info = gl.getShaderInfoLog(glShader);
            var msg = this.name +
                ": Could not compile WebGL program.\n\n" +
                info;
            alert(msg);
            throw new Error(msg);
	}
    }
});

GL.Uniform = utils.extend(utils.Object, {
    TYPE: 'Uniform',

    init: function(program, name, location, info) {
        this.program = program;
        this.name = name;
        this.location = location;
        this.info = info;
        return this;
    },

    set: function(value) {
        if (this.value != value) {
            this.value = value;
            this.dirty = true;
        }
        return this;
    }
});

GL.Uniform1f = utils.extend(GL.Uniform, {
    suffix: '1f',
    size: 1,

    flush: function() {
        if (!this.dirty) {
            return;
        }
        this.dirty = false;

        (utils.debug || this.debug || this.program.debug) && console.log(
            this.name,
            "uniform1f",
            this.value
        );
        var gl = this.program.context.gl;
        gl.uniform1f(this.location, this.value);
    }
});

GL.Uniform3f = utils.extend(GL.Uniform, {
    suffix: '3fv',
    size: 3,

    flush: function() {
        if (!this.dirty) {
            return;
        }
        this.dirty = false;

        (utils.debug || this.debug || this.program.debug) && console.log(
            this.name,
            "uniform3fv",
            this.value
        );
        var gl = this.program.context.gl;
        gl.uniform3fv(this.location, this.value);
    }
});

GL.UniformMatrix4f = utils.extend(GL.Uniform, {
    suffix: 'Matrix4fv',
    matrix: [4, 4],

    set: function(value, transpose) {
        if (transpose == undefined) {
            transpose = false;
        }
        if (this.value != value || this.transpose != transpose) {
            this.value = value;
            this.transpose = transpose;
            this.dirty = true;
        }
        return this;
    },
    flush: function() {
        if (!this.dirty) {
            return;
        }
        this.dirty = false;

        (utils.debug || this.debug || this.program.debug) && console.log(
            this.name,
            "uniformMatrix4fv",
            this.value
        );
        var gl = this.program.context.gl;
        gl.uniformMatrix4fv(this.location, this.transpose, this.value);
    }
});

GL.UniformSampler2D = utils.extend(GL.Uniform, {
    suffix: '1i',
    size: 1,

    SET_SPECS: {
        textureUnit: {
            type: 'number',
            defValue: 0
        },
        texture: {
            type: GL.Texture,
            required: true
        },
        sampler: {
            type: GL.Sampler
        }
    },

    set: function(value) {
        if (utils.parse(this.SET_SPECS, value, this)) {
            this.dirty = true;
        }
        return this;
    },
    flush: function() {
        var context = this.program.context;
        var gl = context.gl;
        context.activeTexture(this.textureUnit);
        if (this.sampler) {
            this.sampler.bind(this.textureUnit);
        }
        this.texture.bind(gl.TEXTURE_2D);

        if (!this.dirty) {
            return;
        }
        this.dirty = false;
        (utils.debug || this.debug || this.program.debug) && console.log(
            this.name,
            "uniform1i",
            this.textureUnit
        );
        gl.uniform1i(this.location, this.textureUnit);
    }
});

/**
 * WebGL uniform types
 */
GL.UniformTypes = {
    FLOAT: GL.Uniform1f,
    FLOAT_VEC3: GL.Uniform3f,
    FLOAT_MAT4: GL.UniformMatrix4f,
    SAMPLER_2D: GL.UniformSampler2D,
    UNSIGNED_INT_SAMPLER_2D: GL.UniformSampler2D
};

GL.Attribute = utils.extend(utils.Object, {
    TYPE: 'Attribute',

    init: function(program, name, index, info) {
        var gl = program.context.gl;
        this.program = program;
        this.name = name;
        this.index = index;
        this.info = info;
        return this;
    },

    /**
     * Set the attribute using the currently bound ARRAY_BUFFER.
     * value = {
     *   buffer: <GL.Buffer>,
     *   size: <GLint> | type.size,
     *   type: <GLenum> | type.type,
     *   normalized: <GLboolean> | config.normalized | false,
     *   stride: <GLsizei> | config.stride | 0,
     *   offset: <GLintptr> | config.offset | 0
     * }
     * @returns this
     */
    set: function(value) {
        if (utils.parse(this.SET_SPECS, value, this)) {
            this.dirty = true;
        }
        return this;
    },

    flush: function() {
        if (!this.dirty) {
            return;
        }
        this.dirty = false;

        var gl = this.program.context.gl;
        this.buffer.bind(gl.ARRAY_BUFFER);

        if (this.integer) {
            (utils.debug || this.debug) && console.log(
                this.name,
                "vertexAttribIPointer",
                { buffer: this.buffer.name,
                  index: this.index,
                  size: this.size,
                  type: GL.enumName(this.type),
                  stride: this.stride,
                  offset: this.offset }
            );
            gl.vertexAttribIPointer(
                this.index,
                this.size, this.type,
                this.stride, this.offset
            );
        } else {
            (utils.debug || this.debug) && console.log(
                this.name,
                "vertexAttribPointer",
                { buffer: this.buffer.name,
                  index: this.index,
                  size: this.size,
                  type: GL.enumName(this.type),
                  normalized: this.normalized,
                  stride: this.stride,
                  offset: this.offset }
            );
            gl.vertexAttribPointer(
                this.index,
                this.size, this.type, this.normalized,
                this.stride, this.offset
            );
        }
        (utils.debug || this.debug) && console.log(
            this.name,
            "enableVertexAttribArray",
            this.index
        );
        gl.enableVertexAttribArray(this.index);
    }
});

GL.AttributeUIVec2 = utils.extend(GL.Attribute, {
    integer: true,
    SET_SPECS: {
        buffer: { type: GL.Buffer, required: true },
        size: { type: 'number', defValue: 2 },
        type: { type: 'number', defValue: GL.Enums.UNSIGNED_INT },
        normalized: { type: 'boolean', defValue: false },
        stride: { type: 'number', defValue: 0 },
        offset: { type: 'number', defValue: 0 }
    }
});
GL.AttributeVec2 = utils.extend(GL.Attribute, {
    SET_SPECS: {
        buffer: { type: GL.Buffer, required: true },
        size: { type: 'number', defValue: 2 },
        type: { type: 'number', defValue: GL.Enums.FLOAT },
        normalized: { type: 'boolean', defValue: false },
        stride: { type: 'number', defValue: 0 },
        offset: { type: 'number', defValue: 0 }
    }
});
GL.AttributeVec3 = utils.extend(GL.Attribute, {
    SET_SPECS: {
        buffer: { type: GL.Buffer, required: true },
        size: { type: 'number', defValue: 3 },
        type: { type: 'number', defValue: GL.Enums.FLOAT },
        normalized: { type: 'boolean', defValue: false },
        stride: { type: 'number', defValue: 0 },
        offset: { type: 'number', defValue: 0 }
    }
});

/**
 * WebGL attribute types
 */
GL.AttributeTypes = {
    UNSIGNED_INT_VEC2: GL.AttributeUIVec2,
    FLOAT_VEC2: GL.AttributeVec2,
    FLOAT_VEC3: GL.AttributeVec3
};

GL.Varying = utils.extend(utils.Object, {
    TYPE: 'Varying',

    init: function(program, name, index, info) {
        this.program = program;
        this.name = name;
        this.index = index;
        this.info = info;
        return this;
    },

    bufferBase: function(buffer) {
        this.buffer = buffer;
        this.offset = undefined;
        this.size = undefined;
    },
    bufferRange: function(buffer, offset, size) {
        this.buffer = buffer;
        this.offset = offset;
        this.size = size;
    },

    bind: function() {
        var gl = this.program.context.gl;
        if (!this.buffer) {
            return;
        }
        var target = gl.TRANSFORM_FEEDBACK_BUFFER;
        if (this.offset != undefined && this.size != undefined) {
            (utils.debug || this.debug) && console.log(
                this.name,
                "bindBufferRange",
                { target: GL.enumName(target),
                  index: this.index,
                  buffer: buffer.name,
                  offset: offset,
                  size: size }
            );
            gl.bindBufferRange(target, this.index, this.buffer.glBuffer,
                               this.offset, this.size);
        } else {
            (utils.debug || this.debug) && console.log(
                this.name,
                "bindBufferBase",
                { target: GL.enumName(target),
                  index: this.index,
                  buffer: this.buffer.name }
            );
            gl.bindBufferBase(target, this.index, this.buffer.glBuffer);
        }
    },

    unbind: function() {
        if (!this.buffer) {
            return;
        }
        var gl = this.program.context.gl;
        var target = gl.TRANSFORM_FEEDBACK_BUFFER;
        (utils.debug || this.debug) && console.log(
            this.name,
            "unbindBufferBase",
            { target: GL.enumName(target),
              index: this.index,
              buffer: this.buffer.name }
        );
        gl.bindBufferBase(target, this.index, null);
    }
});

GL.TransformFeedback = utils.extend(utils.Object, {
    TYPE: 'TransformFeedback',

    init: function(context, config) {
        var gl = context.gl;
        this.context = context;
        this.config = config;
        context.objectName(this);
        this.glFeedback = gl.createTransformFeedback();
        return this;
    },

    fini: function() {
        var glFeedback = this.glFeedback;
        if (glFeedback) {
            var gl = this.context.gl;
            this.unbind();
            gl.deleteTransformFeedback(glFeedback);
            this.glFeedback = null;
            this.context = null;
            this.config = null;
        }
    },

    bind: function() {
        var gl = this.context.gl;
        var cur = gl.getParameter(gl.TRANSFORM_FEEDBACK_BINDING);
        if (cur == this.glFeedback) {
            /* already bound */
            return;
        }
        (utils.debug || this.debug) && console.log(
            this.name,
            "bindTransformFeedback"
	);
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, this.glFeedback);
    },

    unbind: function() {
        var gl = this.context.gl;
        var cur = gl.getParameter(gl.TRANSFORM_FEEDBACK_BINDING);
        if (cur != this.glFeedback) {
            /* not bound */
            return;
        }
        (utils.debug || this.debug) && console.log(
            this.name,
            "unbindTransformFeedback"
	);
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
    },

    begin: function(program, mode) {
        var gl = this.context.gl;
        this.bind();
        var varyings = program.varyingItems;
        this.varyings = varyings;
        for (var i = 0, n = varyings.length; i < n; ++i) {
            var varying = varyings[i];
            varying.bind();
        }
        (utils.debug || this.debug) && console.log(
            this.name,
            "beginTransformFeedback",
            GL.enumName(mode)
	);
        gl.beginTransformFeedback(mode);
    },

    end: function() {
        var gl = this.context.gl;
        (utils.debug || this.debug) && console.log(
            this.name,
            "endTransformFeedback"
	);
        gl.endTransformFeedback();
        this.unbind();
        var varyings = this.varyings;
        if (varyings) {
            for (var i = 0, n = varyings.length; i < n; ++i) {
                var varying = varyings[i];
                varying.unbind();
            }
            this.varyings = null;
        }
    }
});

GL.Program = utils.extend(utils.Object, {
    TYPE: 'Program',

    /**
     * config = {
     *   name: <string>,
     *   vertexShader: <GL.Shader>,
     *   fragmentShader: <GL.Shader>,
     * }
     */
    init: function(context, config) {
        var gl = context.gl;
        this.context = context;
        this.config = config;
	this.glProgram = gl.createProgram();
        context.objectAdd(this);
        if (config.vertexShader && config.fragmentShader) {
            this.link(config.vertexShader, config.fragmentShader);
            config.vertexShader = null;
            config.fragmentShader = null;
        }
        return this;
    },

    fini: function() {
        var glProgram = this.glProgram;
        if (glProgram) {
            this.context.objectRemove(this);

            (utils.debug || this.debug) && console.log(
                this.name,
                "deleteProgram"
            );
            this.context.gl.deleteProgram(glProgram);
            this.uniforms = null;
            this.attributeInfo = null;
            this.varyings = null;
            this.varyingItems = null;
            this.items = null;
            this.glProgram = null;
            this.context = null;
            this.config = null;
        }
    },

    link: function(vertexShader, fragmentShader) {
	var gl = this.context.gl;
        var glProgram = this.glProgram;
	gl.attachShader(glProgram, vertexShader.glShader);
	gl.attachShader(glProgram, fragmentShader.glShader);

        var varyings = this.config.varyings;
        if (varyings) {
            var bufferMode = this.config.bufferMode || gl.SEPARATE_ATTRIBS;
            utils.debug && console.log(
                this.name,
                "transformFeedbackVaryings",
                varyings,
                GL.enumName(bufferMode)
            );            
            gl.transformFeedbackVaryings(
                glProgram,
                varyings,
                bufferMode
            );
        }
        utils.debug && console.log(
            this.name,
            "linkProgram",
            vertexShader.name,
            fragmentShader.name
        );            
	gl.linkProgram(glProgram);
	if (!gl.getProgramParameter(glProgram, gl.LINK_STATUS)) {
	    var info = gl.getProgramInfoLog(glProgram);
	    throw new Error(
                this.name +
                ": Could not link WebGL program.\n\n" +
                info
            );
	}

        this.items = [];
        this.uniformsInit();
        this.attributesInit();
        this.varyingsInit();
    },

    uniformsInit: function() {
        var gl = this.context.gl;
        var glProgram = this.glProgram;

        this.uniforms = {};
        var n = gl.getProgramParameter(glProgram, gl.ACTIVE_UNIFORMS);
        for (var i = 0; i < n; ++i) {
            var info = gl.getActiveUniform(glProgram, i);
            var name = info.name;
            var itemName = this.name + '.' + name;
            var typeName = GL.enumName(info.type);
            utils.debug && console.log(
                this.name,
                "uniform " + name + "=" + i + " " + typeName +
                (info.size > 1 ? "[" + info.size + "]" : "")
            );
            var location = gl.getUniformLocation(glProgram, name);
            var cls = GL.UniformTypes[typeName];
            utils.assert && utils.assert(
                cls,
                itemName + ": unsupported type " + typeName +
                " for uniform"
            );
            var item = cls.create(this, itemName, location, info);
            this.uniforms[name] = item;
            this.items.push(item);
        }
    },

    attributesInit: function() {
        var gl = this.context.gl;
        var glProgram = this.glProgram;

        this.attributeInfo = [];
        var n = gl.getProgramParameter(glProgram, gl.ACTIVE_ATTRIBUTES);
        for (var i = 0; i < n; ++i) {
            var info = gl.getActiveAttrib(glProgram, i);
            var name = info.name;
            if (name.startsWith("gl_")) {
                // skip built-in attributes
                continue;
            }
            var itemName = this.name + '.' + name;
            var typeName = GL.enumName(info.type);
            utils.debug && console.log(
                this.name,
                "attribute " + name + "=" + i + " " + typeName +
                (info.size > 1 ? "[" + info.size + "]" : "")
            );
            var cls = GL.AttributeTypes[typeName];
            utils.assert && utils.assert(
                cls,
                itemName + ": unsupported type " + typeName +
                " for attribute"
            );
            var index = gl.getAttribLocation(glProgram, name);
            if (index < 0) {
                throw Error(
                    this.name +
                    ": attribute " + name + " location error"
                );
            }
            this.attributeInfo.push({
                cls: cls,
                index: index,
                info: info
            });
        }
    },

    varyingsInit: function() {
        var gl = this.context.gl;
        var glProgram = this.glProgram;

        this.varyings = {};
        this.varyingItems = [];
        var n = gl.getProgramParameter(glProgram, gl.TRANSFORM_FEEDBACK_VARYINGS);
        for (var i = 0; i < n; ++i) {
            var info = gl.getTransformFeedbackVarying(glProgram, i);
            var name = info.name;
            var itemName = this.name + '.' + name;
            var typeName = GL.enumName(info.type);
            utils.debug && console.log(
                this.name,
                "varying " + name + "=" + i + " " + typeName +
                (info.size > 1 ? "[" + info.size + "]" : "")
            );
            var item = GL.Varying.create(this, itemName, i, info);
            this.varyings[name] = item;
            this.varyingItems.push(item);
        }
    },

    useProgram: function() {
        (utils.debug || this.debug) && console.log(
            this.name,
            "useProgram"
        );
        this.context.gl.useProgram(this.glProgram);
    },

    flush: function() {
        var items = this.items;
        for (var i = 0, n = items.length; i < n; ++i) {
            var item = items[i];
            item.flush();
        }
    }
});

/**
 * WebGLVertexArray
 */
GL.VertexArray = utils.extend(utils.Object, {
    TYPE: 'VertexArray',

    /**
     * config = {
     *   name: <string>,
    *    program: <GL.Program>
     * }
     */
    init: function(config) {
        this.config = config;

        var program = config.program;
        var context = program.context;
        var gl = context.gl;
        var glProgram = program.glProgram;

        this.name = config.name || program.name;
	this.glVertexArray = gl.createVertexArray();

        this.items = [];
        this.attributes = {};
        var attrs = program.attributeInfo;
        for (var i = 0, n = attrs.length; i < n; ++i) {
            var attr = attrs[i];
            var info = attr.info;
            var item = attr.cls.create(
                program,
                this.name + "." + info.name,
                attr.index,
                info
            );
            this.attributes[info.name] = item;
            this.items.push(item);
        }
    },

    fini: function() {
        var glVertexArray = this.glVertexArray;
        if (glVertexArray) {
            (utils.debug || this.debug) && console.log(
                this.name,
                "deleteVertexArray"
            );
            this.config.program.context.gl.deleteVertexArray(glVertexArray);
            this.glVertexArray = null;
            this.config = null;
        }
    },

    bind: function() {
        this.config.program.context.bindVertexArray(this);
    },
    unbind: function() {
        this.config.program.context.unbindVertexArray(this);
    },

    flush: function() {
        var items = this.items;
        for (var i = 0, n = items.length; i < n; ++i) {
            var item = items[i];
            item.flush();
        }
    }
});

/**
 * Utility class for loading shaders.
 */
GL.ShaderLoader = utils.extend(utils.Object, {
    /**
     * config = {
     *   shaders: [
     *     { name: <name>,
     *       url: <url>,
     *       type: VERTEX_SHADER | FRAGMENT_SHADER | '#include' },
     *     ...,
     *   ],
     *   programs: [
     *     { name: <string>,
     *       vertexShader: <url>,
     *       fragmentShader: <url> },
     *     ...
     *   ]
     * }
     *
     * TBD: just save shader source and then compile/link later
     * allowing #define constants to be calculated after assets
     * have been loaded.
     */
    init: function(loader, config) {
        this.config = config;
        this.urls = {};
        for (var i = 0, n = config.shaders.length; i < n; ++i) {
            var sconfig = config.shaders[i];
            var url = sconfig.url || sconfig.name;
            var rec = this.urls[url];
            if (rec) {
                rec.configs.push(sconfig);
                continue;
            }
            var asset = utils.AssetRequest.create({
                url: url,
                responseType: 'text'
            });
            loader.add(asset);            
            this.urls[url] = {
                asset: asset,
                configs: [sconfig]
            };
        }
        return this;
    },

    compile: function(context, programs) {
        var includes = {};
        for (var url in this.urls) {
            var rec = this.urls[url];
            var src = rec.asset.responseText();
            var configs = rec.configs;
            for (var i = 0, n = configs.length; i < n; ++i) {
                var sconfig = configs[i];
                if (sconfig.type == '#include') {
                    includes[sconfig.name || url] = src;
                }
            }
        }
        var shaders = {};
        for (var url in this.urls) {
            var rec = this.urls[url];
            var src = rec.asset.responseText();
            var configs = rec.configs;
            for (var i = 0, n = configs.length; i < n; ++i) {
                var sconfig = configs[i];
                if (sconfig.type != '#include') {
                    var shader = GL.Shader.create(context, sconfig);
                    shader.compile(src, includes);
                    shaders[shader.name] = shader;
                }
            }
        }
        this.urls = null;

        for (var i = 0, n = this.config.programs.length; i < n; ++i) {
            var pconfig = this.config.programs[i];
            var vertexShader = shaders[pconfig.vertexShader];
            utils.assert && utils.assert(
                vertexShader,
                "unknown vertex shader " + pconfig.vertexShader +
                " for program " + pconfig.name
            );
            var fragmentShader = shaders[pconfig.fragmentShader];
            utils.assert && utils.assert(
                fragmentShader,
                "unknown fragment shader " + pconfig.fragmentShader +
                " for program " + pconfig.name
            );
            utils.assert && utils.assert(
                programs[pconfig.name] == undefined,
                "multiple programs with name " + pconfig.name
            );
            programs[pconfig.name] = GL.Program.create(context, {
                name: pconfig.name,
                vertexShader: vertexShader,
                fragmentShader: fragmentShader,
                varyings: pconfig.varyings,
                bufferMode: pconfig.bufferMode
            });
        }
        return programs;
    }
});
