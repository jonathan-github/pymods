import collections

from . import utils
from . import reader

def debugFmt(obj):
    if obj is None:
        return "None"
    if isinstance(obj, Object):
        return obj.treePath()
    if isinstance(obj, (dict, list)):
        s = str(obj)
        if len(s) > 16:
            s = s[:16] + "..."
            pass
        return s
    return str(obj)

def objInstances(obj):
    yield obj
    if isinstance(obj, Object) and obj.instDef:
        yield obj.instDef
    pass

def objEq(a, b):
    if a is b:
        return True
    for i in objInstances(a):
        for j in objInstances(b):
            if i is j:
                return True
            pass
        pass
    return False

def objName(obj):
    name = obj.get('name')
    id = obj.get('id')
    type = obj.get('type') or obj.__class__.__name__
    parts = []
    if name:
        parts.append(name)
        pass
    if id:
        parts.append('id:' + id)
        pass
    if type:
        parts.append('type:' + type)
        pass
    if not parts:
        if 'count' in obj and 'values' in obj:
            return "[{}]".format(obj['count'])
        return "unknown"
    return " ".join(parts)

def objDesc(obj):
    if isinstance(obj, Object):
        return repr(obj)
    if isinstance(obj, dict):
        return objName(obj)
    elif isinstance(obj, list):
        return "[{}]".format(len(obj))
    raise Exception(
        "don't know how to describe object {}".format(obj)
    )

def forEach(obj, pred=None, allowLists=False):
    if allowLists and isinstance(obj, list):
        for child in obj:
            yield from forEach(child, pred=pred)
            pass
        pass
    elif isinstance(obj, Object):
        if pred is None or pred(obj):
            yield obj
            pass
        for value in obj.values():
            yield from forEach(value, pred=pred, allowLists=True)
            pass
        pass
    pass

def propFind(obj, targetId, useInstDef=True, defValue=None, exclude=None):
    if isinstance(obj, (Object, dict)):
        if targetId == obj.get('id'):
            # id match
            return obj
        if targetId == obj.get('name'):
            # name match
            return obj
        if targetId == obj.get('type'):
            # type match
            return obj
        pval = obj.get(targetId)
        if pval is not None:
            # property match
            return pval
        for childName, child in obj.items():
            if exclude and childName in exclude:
                continue
            pval = propFind(child, targetId,
                            useInstDef=useInstDef,
                            exclude=exclude)
            if pval is not None:
                # child match
                return pval
            pass
        if useInstDef and isinstance(obj, Object) and obj.instDef:
            pval = propFind(obj.instDef, targetId,
                            useInstDef=useInstDef,
                            exclude=exclude)
            if pval is not None:
                # instDef match
                return pval
            pass
        pass
    elif isinstance(obj, list):
        for child in obj:
            pval = propFind(child, targetId,
                            useInstDef=useInstDef,
                            exclude=exclude)
            if pval is not None:
                # array element match
                return pval
            pass
        pass
    # not found
    return defValue

def propGet(obj, targetId, useInstDef=True, defValue=None, exclude=None):
    pval = propFind(obj, targetId,
                    useInstDef=useInstDef,
                    defValue=defValue,
                    exclude=exclude)
    if pval is None:
        raise Exception(
            "can't find target id {} in object {}".format(
                targetId,
                objDesc(obj)
            )
        )
    return pval

def pathFind(obj, path, useInstDef=True, defValue=None, exclude=None):
    roots = [obj]
    if useInstDef and isinstance(obj, Object) and obj.instDef:
        roots.append(obj.instDef)
        pass
    for targetId in path:
        found = []
        for root in roots:
            root = propFind(root, targetId, useInstDef=False, exclude=exclude)
            if root is not None:
                if isinstance(root, Ref):
                    root = root.obj
                    pass
                found.append(root)
                if useInstDef and isinstance(root, Object) and root.instDef:
                    found.append(root.instDef)
                    pass
                pass
            pass
        roots = found
        if not found:
            break
        pass
    if roots:
        return roots[0]
    return defValue

def pathGet(obj, path, useInstDef=True, defValue=None, exclude=None):
    child = pathFind(obj, path, useInstDef=True, defValue=defValue, exclude=exclude)
    if child is None:
        raise Exception(
            "can't find path {} in {}".format(
                "/".join(path),
                utils.toJSON(obj)
            )
        )
    return child

def urlFind(obj, url):
    if not isinstance(url, utils.URL):
        url = utils.URL(url)
        pass
    if url.scheme == 'name':
        # TBD: handle name URLs (eg, "name://@selection:")
        return url
    if url.path:
        return reader.cache.loadURL(url)

    root = obj
    if url.scheme:
        obj = obj.idFind(url.scheme)
        if obj is None:
            print("WARNING: unknown scheme in url {} for object {}".format(
                url, obj
            ))
            pass
        else:
            obj = root
            pass
        pass
    if url.fragment:
        obj = obj.idFind(url.fragment)
        if obj is None:
            print("WARNING: unknown fragment in url {} for {}".format(
                url,
                utils.toJSON(root.rootGet())
            ))
            return None
        pass
    if obj and url.propPath:
        obj = obj.propFind(url.propPath)
        if obj is None:
            print("WARNING: unknown property in url {} for {}".format(
                url,
                utils.toJSON(root.rootGet())
            ))
            return None
        pass
    return obj

def urlGet(obj, url):
    value = urlFind(obj, url)
    if value is None:
        raise Exception(
            "can't find url {} in object {}".format(
                url, obj
            )
        )
    return value

class Ref:
    def __init__(self, url):
        self.url = url
        self.obj = None
        pass
    def load(self, parent):
        self.obj = urlGet(parent, self.url)
        pass
    pass

class PropDef:
    def __init__(self, cls=None, isArray=False, isRef=False, isInstDef=False):
        self.cls = cls
        self.isArray = isArray
        self.isRef = isRef
        self.isInstDef = isInstDef
        pass

    def clsGet(self):
        cls = self.cls
        if cls and isinstance(cls, str):
            # lookup the class by name
            cls = Object.typeGet(cls)
            self.cls = cls
            pass
        return cls

    def checkType(self, value, expectedType=None):
        if expectedType is None:
            if self.isArray:
                expectedType = list
            else:
                expectedType = dict
                pass
            pass
        if not isinstance(value, expectedType):
            raise Exception("property {}.{} = \"{}\" is type {}, but expected {}".format(
                cls.__name__,
                key,
                debugFmt(value),
                value.__type__.__name__,
                expectedType.__name__
            ))
        pass

    def load(self, parent, key, value):
        cls = self.clsGet()
        if self.isArray:
            if cls:
                self.checkType(value)
                return [cls.load(obj, parent=parent) for obj in value]
            if isinstance(value, dict) and 'values' in value:
                self.checkType(value['values'])
                pass
            else:
                self.checkType(value)
                pass
            return value

        if cls:
            self.checkType(value)
            return cls.load(value, parent=parent)
        return value

    def refLoad(self, parent, key, value):
        if not self.isRef:
            return value
        if self.isArray:
            self.checkType(value)
            for i in range(len(value)):
                child = value[i]
                if not isinstance(child, Ref):
                    ref = Ref(child)
                    ref.load(parent)
                    value[i] = ref
                    pass
                pass
            return value
        if not isinstance(value, Ref):
            ref = Ref(value)
            ref.load(parent)
            if self.isInstDef:
                parent.instDef = ref.obj
                pass
            return ref
        return value
    pass

class PropArrayDef(PropDef):
    def __init__(self, cls=None, isRef=False):
        PropDef.__init__(self, cls=cls, isArray=True)
        pass
    pass

class PropDefs:
    def __init__(self, *args):
        self.pdefsAll = [self.build(arg) for arg in args]
        pass

    def build(self, pdefs):
        if isinstance(pdefs, PropDefs):
            return pdefs
        patched = {}
        for key, value in pdefs.items():
            if value is True:
                value = PD_Value
            elif isinstance(value, str):
                # className
                value = PropDef(value)
                pass
            elif isinstance(value, list) and len(value) == 1:
                # array of className
                value = PropArrayDef(value[0])
                pass
            patched[key] = value
            pass
        return patched

    def get(self, key):
        for pdefs in self.pdefsAll:
            pdef = pdefs.get(key)
            if pdef is not None:
                return pdef
            pass
        return None

    def load(self, parent, key, value):
        pdef = self.get(key)
        if pdef:
            return pdef.load(parent, key, value)
        print(
            "WARNING: unknown property {} for class {}".format(
                key,
                parent.__class__.__name__
            )
        )
        return value

    def refsLoad(self, parent):
        for pdefs in self.pdefsAll:
            if isinstance(pdefs, dict):
                for key, pdef in pdefs.items():
                    self.refLoad(parent, pdef, key)
                    pass
                pass
            else:
                pdefs.refsLoad(parent)
                pass
            pass
        pass

    def refLoad(self, parent, pdef, key):
        if key not in parent:
            return
        value = parent[key]
        ref = pdef.refLoad(parent, key, value)
        if ref is not value:
            parent[key] = ref
            pass
        pass
    pass

class PropDefsAny(PropDefs):
    def __init__(self):
        PropDefs.__init__(self)
        pass
    def load(self, parent, key, value):
        # accept any value and return as is
        return value
    pass

# commonly used property definitions
PD_Value = PropDef()
PD_Ref = PropDef(isRef=True)
PD_InstDef = PropDef(isRef=True, isInstDef=True)
PD_Array = PropArrayDef()
PD_RefArray = PropArrayDef(isRef=True)
PD_Channel = PropDef('Channel')
PD_ChannelArray = PropArrayDef('Channel')
PD_FormulaArray = PropArrayDef('Formula')
PD_MaterialChannel = PropDef('MaterialChannel')
PD_MaterialChannelArray = PropArrayDef('MaterialChannel')
PD_Presentation = PropDef('Presentation')

class Object(collections.UserDict):
    # map of all Object types indexed by Python class name
    Types = {}

    # map of all object types indexed by DSON type name
    TypeNames = {}

    # list of the object's DSON type names (can be empty)
    typeNames = []

    # if True, the DSON type property determines which class to construct
    autoType = False

    @classmethod
    def typeRegister(self, cls):
        assert cls.__name__ not in self.Types
        self.Types[cls.__name__] = cls
        for typeName in cls.typeNames:
            if typeName in self.TypeNames:
                raise Exception(
                    "{}: type {} is already registered to {}".format(
                        typeName, cls, self.TypeNames[typeName]
                    )
                )
            self.TypeNames[typeName] = cls
            pass
        return cls

    @classmethod
    def typeGet(self, cls):
        if isinstance(cls, str):
            cls = self.Types[cls]
            pass
        return cls

    propDefs = PropDefs({
        'extra': PropArrayDef('Extra')
    })

    def __init__(self, srcData, parent=None):
        self.parent = parent
        self.srcData = srcData
        self.instDef = None
        self.data = {}
        self.idMap = None
        self.assets = None
        pass

    def isA(self, cls):
        if isinstance(cls, (tuple, list)):
            for c in cls:
                if self.isA(c):
                    return True
                pass
            return False

        if isinstance(self, cls):
            return True
        if self.instDef is not None:
            return self.instDef.isA(cls)
        return False

    def isEq(self, obj):
        return objEq(self, obj)

    def rootGet(self):
        root = self
        while root.parent is not None:
            root = root.parent
            pass
        return root

    def treePath(self, sep="/", idFormat="#{}"):
        path = []
        root = self
        while root is not None:
            nodeName = root.__class__.__name__
            if 'id' in root:
                nodeName += idFormat.format(root['id'])
                pass
            path.append(nodeName)
            root = root.parent
            pass
        path.reverse()
        return sep.join(path)

    def idRootGet(self):
        parent = self
        while parent is not None:
            if parent.idMap is not None:
                return parent
            parent = parent.parent
            pass
        return None

    def idIndex(self):
        id = self.srcData.get('id')
        if id is not None:
            root = self.idRootGet()
            if root is not None:
                assert id not in root.idMap
                root.idMap[id] = self
                if root.assets is not None:
                    root.assets.append(self)
                    pass
                pass
            else:
                raise Exception("can't find idMap for registering {}".format(
                    self.treePath()
                ))
                pass
            pass
        pass

    def idFind(self, id):
        root = self.idRootGet()
        if root is not None:
            return root.idMap.get(id)
        return None

    def idGet(self, id):
        obj = self.idFind(id)
        if obj is None:
            raise Exception(
                "can't find id {} in object {}".format(
                    id,
                    self
                )
            )
        return obj

    def propFind(self, *targetIds, defValue=None, exclude=None):
        return pathFind(self, targetIds, defValue=defValue, exclude=exclude)

    def propGet(self, *targetIds, defValue=None, exclude=None):
        return pathGet(self, targetIds, defValue=defValue, exclude=exclude)

    def refsLoad(self):
        for obj in forEach(self):
            obj.propDefs.refsLoad(obj)
            obj.refsLoaded()
            pass
        pass

    def refsLoaded(self):
        pass

    def __str__(self):
        return objName(self)

    @classmethod
    def load(self, srcData, parent=None):
        cls = self.loadCls(srcData)
        obj = cls(srcData, parent=parent)
        data = obj.data
        if not isinstance(srcData, dict):
            raise Exception("using invalid value \"{}\" to construct {}".format(
                debugFmt(srcData),
                cls.__name__
            ))
        for key in sorted(srcData.keys()):
            data[key] = obj.propDefs.load(obj, key, srcData[key])
            pass
        return obj

    @classmethod
    def loadCls(self, srcData):
        if not self.autoType:
            return self
        typeName = srcData.get('type')
        if typeName:
            subCls = self.TypeNames.get(typeName)
            if subCls and issubclass(subCls, self):
                return subCls
            print("WARNING: unknown type {} for {}".format(
                typeName,
                self.__name__
            ))
            pass
        return self
    pass

@Object.typeRegister
class DAZ(Object):
    propDefs = PropDefs(Object.propDefs, {
        'file_version': PD_Value,
        'asset_info': PD_Value,
        'geometry_library': PropArrayDef('Geometry'),
        'node_library': PropArrayDef('Node'),
        'uv_set_library': PropArrayDef('UVSet'),
        'modifier_library': PropArrayDef('Modifier'),
        'image_library': PropArrayDef('Image'),
        'material_library': PropArrayDef('Material'),
        'scene': PropDef('Scene')
    })

    def __init__(self, srcData, parent=None):
        Object.__init__(self, srcData, parent=parent)
        self.idMap = {}
        self.assets = []
        pass

    def refsLoaded(self):
        self.asset_info = self['asset_info']
        pass
    pass

@Object.typeRegister
class CameraOrthographic(Object):
    propDefs = [Object.propDefs, {
        'znear': PD_Value,
        'zfar': PD_Value,
        'ymag': PD_Value
    }]

    def __init__(self, srcData, parent=None):
        Object.__init__(self, srcData, parent=parent)
        pass
    pass

@Object.typeRegister
class CameraPerspective(Object):
    propDefs = PropDefs(Object.propDefs, {
        'znear': PD_Value,
        'zfar': PD_Value,
        'yfov': PD_Value,
        'focal_length': PD_Value,
        'depth_of_field': PD_Value,
        'focal_distance': PD_Value,
        'fstop': PD_Value
    })

    def __init__(self, srcData, parent=None):
        Object.__init__(self, srcData, parent=parent)
        pass
    pass

@Object.typeRegister
class Channel(Object):
    autoType = True

    propDefs = PropDefs(Object.propDefs, {
        'id': PD_Value,
        'type': PD_Value,
        'name': PD_Value,
        'label': PD_Value,
        'visible': PD_Value,
        'locked': PD_Value,
        'auto_follow': PD_Value
    })

    def __init__(self, srcData, parent=None):
        Object.__init__(self, srcData, parent=parent)
        pass

    @staticmethod
    def isArray(obj):
        if isinstance(obj, list) and len(obj) >= 1:
            for child in obj:
                if not isinstance(child, Channel):
                    return False
                pass
            return True
        return False

    @staticmethod
    def unpack(obj):
        if Channel.isArray(obj):
            rec = {}
            for chan in obj:
                id = chan['id']
                assert id not in rec
                if 'current_value' in chan:
                    rec[id] = chan['current_value']
                else:
                    rec[id] = chan['value']
                    pass
                pass
            return rec
        if isinstance(obj, Channel):
            return obj['value']
        return obj
    pass

@Object.typeRegister
class ChannelBase(Channel):
    propDefs = PropDefs(Channel.propDefs, {
        'value': PD_Value,
        'current_value': PD_Value,
        # undocumented properties
        'default_image_gamma': PD_Value,
        'image_file': PD_Value,
        'image': PD_Value
    })

    def __init__(self, srcData, parent=None):
        Channel.__init__(self, srcData, parent=parent)
        pass
    pass

@Object.typeRegister
class ChannelBaseMinMax(ChannelBase):
    propDefs = PropDefs(ChannelBase.propDefs, {
        'min': PD_Value,
        'max': PD_Value,
        'clamped': PD_Value,
        'step_size': PD_Value,
        'mappable': PD_Value
    })

    def __init__(self, srcData, parent=None):
        ChannelBase.__init__(self, srcData, parent=parent)
        pass
    pass

@Object.typeRegister
class ChannelAlias(Channel):
    typeNames = ['alias']

    propDefs = PropDefs(Channel.propDefs, {
        'target_channel': PD_Ref
    })

    def __init__(self, srcData, parent=None):
        Channel.__init__(self, srcData, parent=parent)
        self.target_channel = None
        pass
    pass

@Object.typeRegister
class ChannelAnimation(Object):
    propDefs = PropDefs(Object.propDefs, {
        'url': PD_Ref,
        'keys': PD_Value
    })

    def __init__(self, srcData, parent=None):
        Object.__init__(self, srcData, parent=parent)
        self.channel = None
        pass
    pass

@Object.typeRegister
class ChannelBool(ChannelBaseMinMax):
    typeNames = ['bool']

    def __init__(self, srcData, parent=None):
        ChannelBaseMinMax.__init__(self, srcData, parent=parent)
        pass
    pass

@Object.typeRegister
class ChannelColor(ChannelBaseMinMax):
    typeNames = ['color', 'float_color']

    def __init__(self, srcData, parent=None):
        ChannelBaseMinMax.__init__(self, srcData, parent=parent)
        pass
    pass

@Object.typeRegister
class ChannelEnum(Channel):
    typeNames = ['enum']

    propDefs = PropDefs(Channel.propDefs, {
        'value': PD_Value,
        'enum_values': PD_Value
    })

    def __init__(self, srcData, parent=None):
        Channel.__init__(self, srcData, parent=parent)
        pass
    pass

@Object.typeRegister
class ChannelFloat(ChannelBaseMinMax):
    typeNames = ['float']

    propDefs = PropDefs(ChannelBaseMinMax.propDefs, {
        'display_as_percent': PD_Value
    })

    def __init__(self, srcData, parent=None):
        ChannelBaseMinMax.__init__(self, srcData, parent=parent)
        pass
    pass

@Object.typeRegister
class ChannelImage(ChannelBase):
    typeNames = ['image']

    def __init__(self, srcData, parent=None):
        ChannelBase.__init__(self, srcData, parent=parent)
        pass
    pass

@Object.typeRegister
class ChannelInt(ChannelBaseMinMax):
    typeNames = ['int']

    def __init__(self, srcData, parent=None):
        ChannelBaseMinMax.__init__(self, srcData, parent=parent)
        pass
    pass

@Object.typeRegister
class ChannelString(ChannelBase):
    typeNames = ['string']

    def __init__(self, srcData, parent=None):
        ChannelBase.__init__(self, srcData, parent=parent)
        pass
    pass

@Object.typeRegister
class Extra(Object):
    propDefs = PropDefsAny()

    def __init__(self, srcData, parent=None):
        Object.__init__(self, srcData, parent=parent)
        pass
    pass

@Object.typeRegister
class Formula(Object):
    propDefs = PropDefs(Object.propDefs, {
        'output': PD_Value,
        'stage': PD_Value,
        'operations': PropArrayDef('Operation')
    })

    def __init__(self, srcData, parent=None):
        Object.__init__(self, srcData, parent=parent)
        pass
    pass
    
@Object.typeRegister
class Geometry(Object):
    propDefs = PropDefs(Object.propDefs, {
        'id': PD_Value,
        'name': PD_Value,
        'label': PD_Value,
        'type': PD_Value,
        'source': PD_Value,
        'edge_interpolation_mode': PD_Value,
        'default_uv_set': PD_Ref,
        'vertices': PD_Array,
        'polygon_groups': PD_Array,
        'polygon_material_groups': PD_Array,
        'polylist': PD_Array,
        'root_region': PropDef('Region'),
        'graft': PropDef('Graft'),
        'rigidity': PropDef('Rigidity')
    })

    def __init__(self, srcData, parent=None):
        Object.__init__(self, srcData, parent=parent)
        self.idIndex()
        self.default_uv_set = None
        pass
    pass

@Object.typeRegister
class GeometryInstance(Object):
    propDefs = PropDefs(Geometry.propDefs, {
        'url': PD_InstDef,
        # undocumented
        'current_subdivision_level': PD_Value
    })

    def __init__(self, srcData, parent=None):
        Object.__init__(self, srcData, parent=parent)
        self.idIndex()
        pass
    pass
    
@Object.typeRegister
class Graft(Object):
    propDefs = PropDefs(Object.propDefs, {
        'vertex_count': PD_Value,
        'poly_count': PD_Value,
        'vertex_pairs': PD_Array,
        'hidden_polys': PD_Array
    })

    def __init__(self, srcData, parent=None):
        Object.__init__(self, srcData, parent=parent)
        pass
    pass

@Object.typeRegister
class Image(Object):
    propDefs = PropDefs(Object.propDefs, {
        'id': PD_Value,
        'name': PD_Value,
        'source': PD_Value,
        'map_gamma': PD_Value,
        'map_size': PD_Value,
        'map': PropArrayDef('ImageMap')
    })

    def __init__(self, srcData, parent=None):
        Object.__init__(self, srcData, parent=parent)
        self.idIndex()
        pass

    def loadProperty(self, key, value):
        if key in ('id', 'name', 'source',
                   'map_gamma', 'map_size'):
            return value
        elif key == 'map':
            return self.loadArray(ImageMap, value)
        else:
            return self.loadUnknown(key, value)
        pass
    pass

@Object.typeRegister
class ImageMap(Object):
    propDefs = PropDefs(Object.propDefs, {
        'url': PD_Value,
        'label': PD_Value,
        'color': PD_Value,
        'transparency': PD_Value,
        'invert': PD_Value,
        'rotation': PD_Value,
        'xmirror': PD_Value,
        'ymirror': PD_Value,
        'xscale': PD_Value,
        'yscale': PD_Value,
        'xoffset': PD_Value,
        'yoffset': PD_Value,
        'operation': PD_Value
    })

    def __init__(self, srcData, parent=None):
        Object.__init__(self, srcData, parent=parent)
        pass
    pass

@Object.typeRegister
class MaterialChannel(Object):
    propDefs = PropDefs(Object.propDefs, {
        'channel': PD_Channel,
        'group': PD_Value,
        'color': PD_Value,
        'strength': PD_Value,
        'image': PD_Value,
        # undocumented
        'presentation': PD_Value
    })

    def __init__(self, srcData, parent=None):
        Object.__init__(self, srcData, parent=parent)
        pass
    pass

@Object.typeRegister
class Material(Object):
    propDefs = PropDefs(Object.propDefs, {
        'id': PD_Value,
        'name': PD_Value,
        'label': PD_Value,
        'source': PD_Value,
        'uv_set': PD_Ref,
        'type': PD_Value,
        'diffuse': PD_MaterialChannel,
        'diffuse_strength': PD_MaterialChannel,
        'specular': PD_MaterialChannel,
        'specular_strength': PD_MaterialChannel,
        'glossiness': PD_Value,
        'ambient': PD_MaterialChannel,
        'ambient_strength': PD_MaterialChannel,
        'reflection': PD_MaterialChannel,
        'reflection_strength': PD_MaterialChannel,
        'refraction': PD_MaterialChannel,
        'refraction_strength': PD_MaterialChannel,
        'ior': PD_Value,
        'bump': PD_MaterialChannel,
        'bump_min': PD_MaterialChannel,
        'bump_max': PD_MaterialChannel,
        'displacement': PD_MaterialChannel,
        'displacement_min': PD_MaterialChannel,
        'displacement_max': PD_MaterialChannel,
        'transparency': PD_MaterialChannel,
        'normal': PD_MaterialChannel,
        'u_offset': PD_MaterialChannel,
        'u_scale': PD_MaterialChannel,
        'v_offset': PD_MaterialChannel,
        'v_scale': PD_MaterialChannel
    })

    def __init__(self, srcData, parent=None):
        Object.__init__(self, srcData, parent=parent)
        self.idIndex()
        pass
    pass

@Object.typeRegister
class MaterialInstance(Object):
    propDefs = PropDefs(Material.propDefs, {
        'parent': PD_Ref,
        'geometry': PD_Ref,
        'groups': PD_Value,
        'url': PD_InstDef
    })

    def __init__(self, srcData, parent=None):
        Object.__init__(self, srcData, parent=parent)
        self.idIndex()
        self.geometry = None
        pass
    pass

@Object.typeRegister
class Modifier(Object):
    propDefs = PropDefs(Object.propDefs, {
        'id': PD_Value,
        'name': PD_Value,
        'label': PD_Value,
        'source': PD_Value,
        'parent': PD_Ref,
        'region': PD_Value,
        'group': PD_Value,
        'presentation': PD_Presentation,
        'channel': PD_Channel,
        'formulas': PD_FormulaArray,
        'morph': PropDef('Morph'),
        'skin': PropDef('SkinBinding')
    })

    def __init__(self, srcData, parent=None):
        Object.__init__(self, srcData, parent=parent)
        self.idIndex()
        self.parentModifier = None
        pass
    pass

@Object.typeRegister
class ModifierInstance(Object):
    propDefs = PropDefs(Modifier.propDefs, {
        'url': PD_InstDef
    })

    def __init__(self, srcData, parent=None):
        Object.__init__(self, srcData, parent=parent)
        self.idIndex()
        self.parentNode = None
        pass
    pass

@Object.typeRegister
class Morph(Object):
    propDefs = PropDefs(Modifier.propDefs, {
        'vertex_count': PD_Value,
        'deltas': PD_Array,
        # undocumented property
        'hd_url': PD_Value
    })

    def __init__(self, srcData, parent=None):
        Object.__init__(self, srcData, parent=parent)
        pass
    pass

@Object.typeRegister
class Node(Object):
    autoType = True
    typeNames = ['node']

    propDefs = PropDefs(Object.propDefs, {
        'id': PD_Value,
        'name': PD_Value,
        'type': PD_Value,
        'label': PD_Value,
        'source': PD_Value,
        'parent': PD_Ref,
        'rotation_order': PD_Value,
        'inherits_scale': PD_Value,
        'center_point': PD_ChannelArray,
        'end_point': PD_ChannelArray,
        'orientation': PD_ChannelArray,
        'rotation': PD_ChannelArray,
        'translation': PD_ChannelArray,
        'scale': PD_ChannelArray,
        'general_scale': PD_Channel,
        'presentation': PD_Presentation,
        'formulas': PD_FormulaArray,
        # undocumented
        'id_aliases': PD_Value,
        'name_aliases': PD_Value
    })

    def __init__(self, srcData, parent=None):
        Object.__init__(self, srcData, parent=parent)
        self.idIndex()
        self.children = []
        pass

    def refsLoaded(self):
        parentRef = self.get('parent')
        if parentRef:
            parent = parentRef.obj
            parent.children.append(self)
            pass
        pass

    def globalTransform(self):
        # TBD
        # http://docs.daz3d.com/doku.php/public/dson_spec/object_definitions/node/start

        # The translation, rotation, scale, and general_scale elements
        # each represent transforms that convert to transform matrices.
        # To arrive at the full base transform for the node, each of those
        # elements is converted to matrix form.
        # The full transform for a node is determined using the following algorithm:
        center_offset = center_point - parent.center_point
        global_translation = parent.global_transform * (center_offset + translation)
        global_rotation = parent.global_rotation * orientation * rotation * inv(orientation)
        if inherits_scale:
            global_scale = parent.global_scale * orientation * scale * general_scale * inv(orientation)
        else:
            global_scale = parent.global_scale * inv(parent.local_scale) * orientation * scale * general_scale * inv(orientation)
            pass
        global_transform = global_translation * global_rotation * global_scale

        # Vertices are taken to global space by post-multiplying as follows:
        global_vertex = global_transform * vertex

        center_point = self['center_point']
        parent_center_point = self['parent'].obj['center_point']
        center_offset = vec3.sub(center_point, parent_center_point)

        translation = self['translation']
        
        pass

    pass

@Object.typeRegister
class NodeInstance(Object):
    propDefs = PropDefs(Node.propDefs, {
        'url': PD_InstDef,
        'parent_in_place': PD_Ref,
        'conform_target': PD_Ref,
        'geometries': PropArrayDef('GeometryInstance'),
        'preview': PropDef('Preview')
    })

    def __init__(self, srcData, parent=None):
        Object.__init__(self, srcData, parent=parent)
        self.idIndex()
        self.parent_in_place = None
        self.conform_target = None
        self.children = []
        pass

    def refsLoaded(self):
        parentRef = self.get('parent')
        if parentRef:
            parent = parentRef.obj
            if isinstance(parent, Object):
                parent.children.append(self)
                pass
            pass
        pass
    pass

@Object.typeRegister
class Bone(Node):
    typeNames = ['bone']

    def __init__(self, srcData, parent=None):
        Node.__init__(self, srcData, parent=parent)
        pass
    pass

@Object.typeRegister
class Camera(Node):
    typeNames = ['camera']

    propDefs = PropDefs(Node.propDefs, {
        'camera_perspective': PropDef('CameraPerspective'),
        'camera_orthographic': PropDef('CameraOrthographic')
    })

    def __init__(self, srcData, parent=None):
        Node.__init__(self, srcData, parent=parent)
        pass
    pass

@Object.typeRegister
class Figure(Node):
    typeNames = ['figure']

    def __init__(self, srcData, parent=None):
        Node.__init__(self, srcData, parent=parent)
        pass
    pass

@Object.typeRegister
class Light(Node):
    typeNames = ['light']

    propDefs = PropDefs(Node.propDefs, {
        'color': PD_Value,
        'on': PD_Value,
        'point': PropDef('LightPoint'),
        'directional': PropDef('LightDirectional'),
        'spot': PropDef('LightSpot')
    })

    def __init__(self, srcData, parent=None):
        Node.__init__(self, srcData, parent=parent)
        pass
    pass

@Object.typeRegister
class LightDirectional(Object):
    propDefs = PropDefs(Object.propDefs, {
        'intensity': PD_Value,
        'shadow_type': PD_Value,
        'shadow_softness': PD_Value,
        'shadow_bias': PD_Value
    })

    def __init__(self, srcData, parent=None):
        Node.__init__(self, srcData, parent=parent)
        pass
    pass

@Object.typeRegister
class LightPoint(Object):
    propDefs = PropDefs(LightDirectional.propDefs, {
        'constant_attenuation': PD_Value,
        'linear_attenuation': PD_Value,
        'quadratic_attenuation': PD_Value
    })

    def __init__(self, srcData, parent=None):
        Node.__init__(self, srcData, parent=parent)
        pass

    def colorScaling(self, Dist):
        # TBD
        # http://docs.daz3d.com/doku.php/public/dson_spec/object_definitions/light_point/start        

        # The constant_attenuation, linear_attenuation, and
        # quadratic_attenuation are used to calculate the total attenuation
        # of this light given a distance. The equation used is:
        color_scaling = constant_attenuation + ( Dist * linear_attenuation ) + (( Dist^2 ) * quadratic_attenuation )
        pass
    pass

@Object.typeRegister
class LightSpot(Object):
    propDefs = PropDefs(LightPoint.propDefs, {
        'falloff_angle': PD_Value,
        'falloff_exponent': PD_Value
    })

    def __init__(self, srcData, parent=None):
        Node.__init__(self, srcData, parent=parent)
        pass

    def colorScaling(self, Dist):
        # TBD
        # http://docs.daz3d.com/doku.php/public/dson_spec/object_definitions/light_spot/start

        # The constant_attenuation, linear_attenuation, and
        # quadratic_attenuation are used to calculate the total attenuation
        # of this light given a distance. The equation used is:
        color_scaling = constant_attenuation + ( Dist * linear_attenuation ) + (( Dist^2 ) * quadratic_attenuation )

        # The falloff_angle and falloff_exponent are used to specify
        # the amount of attenuation based on the direction of the light.
        pass
    pass

@Object.typeRegister
class Operation(Object):
    propDefs = PropDefs(Object.propDefs, {
        'op': PD_Value,
        'val': PD_Value,
        # TBD: url is a ref, but may not exist
        #'url': PD_Ref
        'url': PD_Value
    })

    def __init__(self, srcData, parent=None):
        Object.__init__(self, srcData, parent=parent)
        self.propRef = None
        pass
    pass

@Object.typeRegister
class Presentation(Object):
    propDefs = PropDefs(Object.propDefs, {
        'type': PD_Value,
        'label': PD_Value,
        'description': PD_Value,
        'icon_large': PD_Value,
        'icon_small': PD_Value,
        'colors': PD_Value,
        # undocumented property
        'auto_fit_base': PD_Value,
        'preferred_base': PD_Value
    })

    def __init__(self, srcData, parent=None):
        Object.__init__(self, srcData, parent=parent)
        pass
    pass

@Object.typeRegister
class Preview(Object):
    propDefs = PropDefs(Object.propDefs, {
        'oriented_box': PD_Value,
        'center_point': PD_Value,
        'end_point': PD_Value,
        'rotation_order': PD_Value,
        # undocumented property
        'type': PD_Value
    })

    def __init__(self, srcData, parent=None):
        Object.__init__(self, srcData, parent=parent)
        pass
    pass
    
@Object.typeRegister
class Region(Object):
    propDefs = PropDefs(Object.propDefs, {
        'id': PD_Value,
        'label': PD_Value,
        'display_hint': PD_Value,
        'map': PD_Array,
        'children': PropArrayDef('Region')
    })

    def __init__(self, srcData, parent=None):
        Object.__init__(self, srcData, parent=parent)
        pass
    pass
    
@Object.typeRegister
class Rigidity(Object):
    propDefs = PropDefs(Object.propDefs, {
        'weights': PD_Array,
        'groups': PropArrayDef('RigidityGroup')
    })

    def __init__(self, srcData, parent=None):
        Object.__init__(self, srcData, parent=parent)
        pass
    pass
    
@Object.typeRegister
class RigidityGroup(Object):
    propDefs = PropDefs(Object.propDefs, {
        'id': PD_Value,
        'rotation_mode': PD_Value,
        'scale_modes': PD_Value,
        'reference': PD_Value,
        'transform_nodes': PD_RefArray,
        'reference_vertices': PD_Array,
        'mask_vertices': PD_Array
    })

    def __init__(self, srcData, parent=None):
        Object.__init__(self, srcData, parent=parent)
        self.transform_nodes = None
        pass
    pass

@Object.typeRegister
class Scene(Object):
    propDefs = PropDefs(Object.propDefs, {
        'presentation': PD_Presentation,
        'nodes': PropArrayDef('NodeInstance'),
        'uvs': PropArrayDef('UVSetInstance'),
        'modifiers': PropArrayDef('ModifierInstance'),
        'materials': PropArrayDef('MaterialInstance'),
        'animations': PropArrayDef('ChannelAnimation'),
        'current_camera': PD_Ref
    })

    def __init__(self, srcData, parent=None):
        Object.__init__(self, srcData, parent=parent)
        self.current_camera = None
        pass
    pass

@Object.typeRegister
class SkinBinding(Object):
    propDefs = PropDefs(Object.propDefs, {
        'node': PD_Ref,
        'geometry': PD_Ref,
        'vertex_count': PD_Value,
        'joints': PropArrayDef('WeightedJoint'),
        'selection_sets': PD_Value,
        # undocumented property
        'selection_map': PD_Value
        })

    def __init__(self, srcData, parent=None):
        Object.__init__(self, srcData, parent=parent)
        self.node = None
        self.geometry = None
        pass
    pass

@Object.typeRegister
class WeightedJoint(Object):
    propDefs = PropDefs(Object.propDefs, {
        'id': PD_Value,
        'node': PD_Ref,
        'node_weights': PD_Array,
        'scale_weights': PD_Array,
        # TBD: unpack these
        'local_weights': PD_Value,
        'bulge_weights': PD_Value
    })

    def __init__(self, srcData, parent=None):
        Object.__init__(self, srcData, parent=parent)
        self.node = None
        pass
    pass

@Object.typeRegister
class UVSet(Object):
    propDefs = PropDefs(Object.propDefs, {
        'id': PD_Value,
        'label': PD_Value,
        'name': PD_Value,
        'vertex_count': PD_Value,
        'polygon_vertex_indices': PD_Value,
        'uvs': PD_Array
    })

    def __init__(self, srcData, parent=None):
        Object.__init__(self, srcData, parent=parent)
        self.idIndex()
        pass
    pass

@Object.typeRegister
class UVSetInstance(Object):
    propDefs = PropDefs(UVSet.propDefs, {
        'url': PD_InstDef,
        'parent': PD_Ref
    })

    def __init__(self, srcData, parent=None):
        Object.__init__(self, srcData, parent=parent)
        self.idIndex()
        pass
    pass
