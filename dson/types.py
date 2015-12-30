import collections
import urllib
import urllib.parse

from . import reader
from . import utils

ObjectTypes = {}
ObjectTypeHints = {
    'geometry_library': 'geometry',
    'image_library': 'image',
    'material_library': 'material',
    'modifier_library': 'modifier',
    'node_library': 'node'
}

def objName(obj):
    parts = []
    id = obj.get('id')
    name = obj.get('name')
    type = obj.typeGet()
    parts = []
    if name:
        parts.append(name)
        pass
    if id:
        parts.append('id:' + id)
        pass
    if type:
        if obj.isInstance():
            type = 'instance(' + type + ')'
            pass
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

def objBox(obj, typeHint=None):
    if isinstance(obj, dict):
        changed = False
        cls = None
        type = obj.get('type')
        # only use type if it is a string
        if type is not None and isinstance(type, str):
            cls = ObjectTypes.get(type)
            pass
        if cls is None and typeHint:
            cls = ObjectTypes.get(typeHint)
            pass
        if cls is None:
            cls = Object
            pass
        data = {}
        for key, value in obj.items():
            if key != 'type':
                idx = key.rfind('_library')
                if idx > 0 and isinstance(value, list):
                    typeHint = key[:idx]
                    newValue = arrayBox(value, typeHint=typeHint)
                else:
                    newValue = objBox(value, typeHint=typeHint)
                    pass
                if newValue is not value:
                    changed = True
                    value = newValue
                    pass
                pass
            data[key] = value
            pass
        return cls(data if changed else obj, obj)
    elif isinstance(obj, list):
        return arrayBox(obj)
    return obj

def arrayBox(obj, typeHint=None):
    changed = False
    data = []
    idx = 0
    for value in obj:
        newValue = objBox(value, typeHint=typeHint)
        if newValue is not value:
            changed = True
            value = newValue
            pass
        data.append(value)
        idx += 1
        pass
    return data if changed else obj

def idFind(obj, targetId, recursive=False):
    if isinstance(obj, Object):
        child = obj.idFind(targetId, recursive=recursive)
        if child is None and obj.instDef:
            child = obj.instDef.idFind(targetId, recursive=recursive)
            pass
        return child
    elif isinstance(obj, dict):
        # check for an id match
        if targetId == obj.get('id'):
            return obj
        # check for a name match
        if targetId == obj.get('name'):
            return obj
        # check for a property match
        child = obj.get(targetId)
        if child is not None:
            return child
        if recursive:
            # recursively check for a child match
            for child in obj.values():
                child = idFind(child, targetId, recursive=True)
                if child is not None:
                    return child
                pass
            pass
        pass
    elif isinstance(obj, list):
        for child in obj:
            child = idFind(child, targetId, recursive=recursive)
            if child is not None:
                return child
            pass
        pass
    return None

def idGet(obj, targetId, recursive=False):
    match = idFind(obj, targetId, recursive=recursive)
    if match is None:
        raise Exception(
            "can't find target id {} in object {}".format(
                targetId,
                objDesc(obj)
            )
        )
    return match

def pathFind(obj, path, recursive=False):
    for targetId in path:
        obj = idFind(obj, targetId, recursive=recursive)
        if obj is None:
            return None
        pass
    return obj

def pathGet(obj, path, recursive=False):
    for targetId in path:
        child = idFind(obj, targetId, recursive=recursive)
        if child is None:
            print("pathGet:", obj)
            for key, value in obj.items():
                print(" {} = {}".format(key, value))
                pass
            raise Exception(
                "can't find path {} in {}".format(
                    "/".join(path),
                    objDesc(obj)
                )
            )
        obj = child
        pass
    return obj

def urlFind(obj, url, recursive=False):
    if not isinstance(url, utils.URL):
        url = utils.URL(url)
        pass
    if url.path:
        return reader.cache.loadURL(url)

    if url.scheme:
        obj = idFind(obj, url.scheme, recursive=recursive)
        if obj is None:
            return None
        pass
    if url.fragment:
        obj = idFind(obj, url.fragment, recursive=recursive)
        if obj is None:
            return None
        pass
    if obj and url.propPath:
        obj = obj.pathFind(url.propPath, recursive=recursive)
        if obj is None:
            return None
        pass
    return obj

def urlGet(obj, url, recursive=False):
    if not isinstance(url, utils.URL):
        url = utils.URL(url)
        pass
    if url.path:
        return reader.cache.loadURL(url)
    if url.scheme:
        obj = idGet(obj, url.scheme, recursive=recursive)
        pass
    if url.fragment:
        obj = idGet(obj, url.fragment, recursive=recursive)
        pass
    if obj and url.propPath:
        obj = obj.pathGet(url.propPath, recursive=recursive)
        pass
    return obj

class Object(collections.UserDict):
    def __init__(self, data, srcData):
        self.data = data
        self.srcData = srcData
        self.treeRoot = None
        self.treePath = None
        self.treeDepth = 0
        self.instDef = None
        self.parent = None
        self.children = []
        self.nodeRef = None
        pass

    def treeRootSet(self, root):
        self.treeDepth = 0
        self.treeRoot = root
        self.treeKey = []
        path = []
        while root is not None:
            self.treeDepth += len(root) - 1
            self.treeKey.append(root[1:])
            root = root[0].treeRoot
            pass
        self.treeKey.reverse()
        self.treePath = "/" + "/".join(
            ["/".join([str(y) for y in x]) for x in self.treeKey]
        )
        pass

    def treeSiblingFind(self, id):
        root = self.treeRoot
        if len(root) == 3:
            siblings = root[0][root[1]]
            for sibling in siblings:
                if sibling.get('id') == id:
                    return sibling
                if sibling.get('name') == id:
                    return sibling
                pass
            pass
        return None

    def treeParentFind(self, id):
        root = self.treeRoot
        while root is not None:
            parent = root[0]
            if id == 'Default Templates':
                print("{}: looking for parent {} in {}".format(self.treePath, id, parent))
                pass
            if parent.get('id') == id:
                return parent
            if parent.get('name') == id:
                return parent
            root = parent.treeRoot
            pass
        return None

    def add(self, child):
        child.parent = self
        self.children.append(child)
        pass

    def isInstance(self):
        return self.instDef is not None

    def isType(self, type):
        if isinstance(type, tuple):
            return self.typeGet() in type
        return self.typeGet() == type

    def typeGet(self):
        if 'type' in self:
            return self['type']
        if self.instDef:
            return self.instDef.typeGet()
        return None

    def idFind(self, targetId, recursive=False):
        return idFind(self.data, targetId, recursive=recursive)

    def idGet(self, targetId, recursive=False):
        return idGet(self, targetId , recursive=recursive)

    def pathFind(self, path, recursive=False):
        return pathFind(self.data, path, recursive=recursive)

    def pathGet(self, path, recursive=False):
        return pathGet(self, path, recursive=recursive)

    def __repr__(self):
        return objName(self)

    def toJSON(self, **kwargs):
        return utils.toJSON(self.srcData, **kwargs)

    def dump(self, depth=0):
        print("{:>{}}{}".format('', depth, self))
        depth += 1
        for child in self.children:
            child.dump(depth)
            pass
        pass

    def dumpProps(self, depth=0):
        print("{:>{}}{}".format('', depth, self))
        depth += 1
        for key, value in self.items():
            print("{:>{}}{} = {}".format('', depth, key, value))
            pass
        pass

    def geometryExport(self):
        vList = self.pathGet(['vertices', 'values'])
        pgList = self.pathGet(['polygon_groups', 'values'])
        pList = self.pathGet(['polylist', 'values'])
        pgMap = {}
        for pt in pList:
            assert len(pt) >= 5 and len(pt) <= 6
            #assert pt[0] == pt[1]
            pg = pgList[pt[0]]
            if pg not in pgMap:
                poly = pgMap[pg] = []
                pass
            poly.append(pt[2:])
            pass
        return {
            'vertices': vList,
            'polygon_groups': pgMap
        }
    pass

class DAZ(Object):
    def __init__(self, url, obj):
        Object.__init__(self, objBox(obj), obj)
        self.url = url
        self.asset_info = self['asset_info']
        self.assetMap = {}
        self.objects = []
        self.idMap = {}
        self.treeIndex(None, self)
        self.assetIndex()
        self.loadRefs(self)
        self.objects.sort(key=lambda obj: obj.treeKey)
        pass

    def idFind(self, targetId, recursive=False):
        return self.assetMap.get(targetId)

    def assetList(self, type):
        assets = []
        for asset in self.assetMap.values():
            if asset.isType(type):
                assets.append(asset)
                pass
            pass
        return assets

    def treeIndex(self, root, obj):
        if isinstance(obj, list):
            idx = 0
            for child in obj:
                self.treeIndex((*root, idx), child)
                idx += 1
                pass
            return
        elif isinstance(obj, Object):
            obj.treeRootSet(root)
            if obj is not self.asset_info:
                self.objects.append(obj)
                if 'id' in obj:
                    self.idAdd(obj)
                    pass
                pass
            for key, value in obj.items():
                self.treeIndex((obj, key), value)
                pass
            pass
        pass

    NOT_INDEXED_TYPES = (
        'color', 'bool', 'enum',
        'float', 'float_color',
        'int', 'numeric_node',
        'string'
    )

    def idAdd(self, obj):
        type = obj.get('type')
        if type in self.NOT_INDEXED_TYPES:
            # don't index objects of these types
            return
        root = obj.treeRoot
        if root:
            prop = root[1]
            if prop in ('channel', 'children', 'joints'):
                # don't index objects stored in these props
                return
            pass

        id = obj['id']
        objs = self.idMap.get(id)
        if objs is None:
            self.idMap[id] = objs = []
            pass
        objs.append(obj)
        pass

    def assetIndex(self):
        for id, objs in self.idMap.items():
            n = len(objs)
            if n > 1:
                objs.sort(key=lambda obj: obj.treeDepth)
                if utils.verbose:
                    print("{}: multiple matches for id in {}".format(id, self.url))
                    for val in objs:
                        print(" {} = {}".format(val.treePath, val))
                        pass
                    pass
                pass
            obj = objs[0]
            self.assetMap[id] = obj
            pass
        pass

    def loadRefs(self, obj):
        if isinstance(obj, list):
            for child in obj:
                self.loadRefs(child)
                pass
            return
        elif not isinstance(obj, Object):
            return
        self.refParent(obj)
        self.refNode(obj)
        self.refURL(obj)
        for key, value in obj.items():
            self.loadRefs(value)
            pass
        pass

    def refParent(self, obj):
        url = obj.get('parent')
        if url:
            # first check for a matching sibling
            parent = obj.treeSiblingFind(url)
            if parent is None:
                # then check for a matching parent
                parent = obj.treeParentFind(url)
                pass
            if parent is None:
                # then check for a matching URL
                parent = urlGet(self, url)
                pass
            parent.add(obj)
            pass
        pass

    def refNode(self, obj):
        url = obj.get('node')
        if url:
            # first check for a matching sibling
            node = obj.treeSiblingFind(url)
            if node is None:
                # then check for a matching parent
                node = obj.treeParentFind(url)
                pass
            if node is None:
                # then check for a matching URL
                node = urlGet(self, url)
                pass
            obj.nodeRef = node
            pass
        pass

    def __repr__(self):
        return objName(self.asset_info)
    pass

    def refURL(self, obj):
        id = obj.get('id')
        url = obj.get('url')
        if id and url:
            obj.instDef = urlGet(self, url)
            pass
        pass

    def __repr__(self):
        return objName(self.asset_info)
    pass

class Figure:
    def __init__(self, obj):
        self.obj = obj
        pass

    def skeletonExport(self):
        return self.boneExport(self.obj)

    def boneExport(self, obj):
        rec = {
            'id': obj['name'],
            'center_point': self.pointExport(obj.idGet('center_point')),
            'end_point': self.pointExport(obj.idGet('center_point'))
        }
        children = []
        for child in obj.children:
            if child.isType(('bone', 'figure')):
                children.append(self.boneExport(child))
                pass
            pass
        if children:
            rec['children'] = children
            pass
        return rec

    def pointExport(self, pt):
        assert pt[0]['id'] == 'x'
        assert pt[1]['id'] == 'y'
        assert pt[2]['id'] == 'z'
        return [
            pt[0]['value'],
            pt[1]['value'],
            pt[2]['value']
        ]
    pass

class Geometry:
    def __init__(self, obj):
        self.load(obj)
        pass

    def load(self, obj):
        self.obj = obj
        self.vertices = obj.pathGet(['vertices', 'values'])
        self.polygon_groups = obj.pathGet(['polygon_groups', 'values'])
        self.polygon_material_groups = obj.pathGet(['polygon_material_groups', 'values'])
        self.polylist = obj.pathGet(['polylist', 'values'])
        self.groupMap = {}
        self.materialMap = {}
        for poly in self.polylist:
            assert len(poly) >= 5 and len(poly) <= 6
            group = self.polygon_groups[poly[0]]
            groupPolys = self.groupMap.get(group)
            if not groupPolys:
                self.groupMap[group] = groupPolys = []
                pass
            material = self.polygon_material_groups[poly[1]]
            materialPolys = self.materialMap.get(material)
            if not materialPolys:
                self.materialMap[material] = materialPolys = []
                pass
            face = poly[2:]
            groupPolys.append(face)
            materialPolys.append(face)
            pass
        pass

    def faceNormal(vertices, poly):
        normal = [0, 0, 0]
        center = [0, 0, 0]
        n = len(poly)
        assert n > 0
        for i in range(n):
            ax, ay, az = vertices[poly[i]]
            bx, by, bz = vertices[poly[(i + 1) % n]]

            normal[0] += (ay - by) * (az + bz)
            normal[1] += (az - bz) * (ax + bx)
            normal[2] += (ax - bx) * (ay + by)
            cx[0] += ax
            cy[1] += ay
            cz[2] += az
            pass
        utils.normalizev(normal)
        utils.scalev(center, 1 / n)
        return (normal, center)

    def vertexNormals(vertices, polys):
        vertexMap = {}
        for poly in polys:
            normal, center = self.faceNormal(vertices, poly)
            for vertex in poly:
                normals = vertexMap.get(vertex)
                if normals is None:
                    normals = vertexMap[vertex] = [0, [0, 0, 0]]
                    pass
                normals[0] += 1
                utils.addv(normals[1], normal)
                pass
            pass
        for vertex, rec in vertexMap:
            count, normal = rec
            utils.scalev(normal, 1/count)
            utils.normalizev(normal)
            pass
        out = []
        for vertex in vertices:
            rec = vertexMap.get(vertex)
            if rec is None:
                # missing normal for this vertex
                out.append(0, 0, 1)
            else:
                out.extend(rec[1])
                pass
            pass
        return out
    pass
