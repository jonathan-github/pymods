# DSON parser

import codecs
import collections
import gzip
import json
import os
import sys
import urllib
import urllib.parse

class URL:
    def __init__(self, url):
        self.url = url
        u = urllib.parse.urlparse(url)
        self.scheme = u.scheme
        self.path = urllib.parse.unquote(u.path)
        self.fragment = u.fragment
        self.propPath = None
        if self.scheme:
            # note: urlparse lowercases the scheme
            # so we need to re-extract it from the url
            self.scheme = url[:url.find(':')]
            pass
        if self.path:
            self.path = urllib.parse.unquote(self.path)
            pass
        if self.fragment:
            idx = u.fragment.find('?')
            if idx >= 0:
                self.fragment = u.fragment[:idx]
                self.propPath = u.fragment[idx+1:].split('/')
                pass
            self.fragment = urllib.parse.unquote(self.fragment)
            pass
        pass
    def __repr__(self):
        return "scheme={} path={} fragment={} prop={}".format(
            self.scheme,
            self.path,
            self.fragment,
            self.propPath
        )
    pass

class Object(collections.UserDict):
    def __init__(self, data):
        self.data = data
        self.parent = None
        self.children = []
        pass

    def propFind(self, propPath):
        obj = self.data
        for prop in propPath:
            if isinstance(obj, (dict, Object)):
                child = obj.get(prop)
                if child is None:
                    return None
                obj = child
                pass
            elif isinstance(obj, list):
                found = None
                for child in obj:
                    if child.get('id') == prop:
                        found = child
                        break
                    pass
                if found is None:
                    return None
                obj = found
                pass
            else:
                # unknown object type
                return None
            pass
        return obj

    def propGet(self, propPath):
        node = self.propFind(propPath)
        if node is None:
            raise Exception(
                "{}: can't find property in {}".format(
                    "/".join(propPath),
                    toJSON(obj)
                )
            )
        return node

    def add(self, child):
        child.parent = self
        self.children.append(child)
        pass

    def __repr__(self):
        if 'name' in self:
            s = self['name']
            if 'id' in self:
                s += " ({})".format(self['id'])
                pass
            pass
        elif 'id' in self:
            s = self['id']
            pass
        return s

    def dump(self, depth=0):
        print("{:>{}}{}".format('', depth, self))
        depth += 1
        for child in self.children:
            child.dump(depth)
            pass
        pass
    pass

def toJSON(obj, **kwargs):
    if isinstance(obj, Object):
        obj = obj.data
        pass
    if 'indent' not in kwargs:
        kwargs['indent'] = 2
        pass
    if 'sort_keys' not in kwargs:
        kwargs['sort_keys'] = True
        pass
    return json.dumps(obj, **kwargs)

class Node(Object):
    def propsGet(self, name, props):
        rec = {}
        for prop in props:
            rec[prop] = self.propGet([name, prop])
            pass
        return rec

    def pointGet(self, name):
        props = ['x', 'y', 'z']
        return [self.propGet([name, prop])['value'] for prop in props]

    def xxx__repr__(self):
        s = Object.__repr__(self)
        s += " center_point={} end_point={} orientation={} translation={} rotation={} scale={}".format(
            self.pointGet('center_point'),
            self.pointGet('end_point'),
            self.pointGet('orientation'),
            self.pointGet('translation'),
            self.pointGet('rotation'),
            self.pointGet('scale')
        )
        return s

    def skelExport(self):
        coords = []
        self.boneExport(coords)
        return coords

    def boneExport(self, coords):
        coords.extend(self.pointGet('center_point'))
        coords.extend(self.pointGet('end_point'))
        for child in self.children:
            child.boneExport(coords)
            pass
        pass
    pass

class Geometry(Object):
    def shapeGet(self, reader):
        if 'default_uv_set' in self:
            uv_set = reader.loadURL(self['default_uv_set'])
            print(
                "polygon_vertex_indices.len = {}".format(
                    len(uv_set['polygon_vertex_indices'])
                )
            )
            print(
                "vertex_count = {}".format(
                    uv_set['vertex_count']
                )
            )
            print(
                "uvs.len = {}".format(
                    len(uv_set['uvs']['values'])
                )
            )
            print(toJSON(uv_set))
            #return
        vList = self.propGet(['vertices', 'values'])
        print(
            "vertices.len = {}".format(
                len(vList)
            )
        )
        if True:
            return
        pgList = self.propGet(['polygon_groups', 'values'])
        pList = self.propGet(['polylist', 'values'])
        pgMap = {}
        for pt in pList:
            assert len(pt) >= 5 and len(pt) <= 6
            assert pt[0] == pt[1]
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
    pass

class File:
    ID_TYPES = ('figure', 'bone')

    def __init__(self, url, obj):
        self.url = url
        self.obj = obj
        self.id = None
        self.type = None
        self.urlRefs = {}
        self.assetMap = {}
        self.assetIndex()
        self.boneIndex()
        self.objIndex(self.obj)
        pass

    def find(self, url):
        if not isinstance(url, URL):
            url = URL(url)
            pass
        obj = None
        if url.scheme:
            obj = self.assetGet(url.scheme)
            pass
        if url.fragment:
            obj = self.assetGet(url.fragment)
            pass
        if obj and url.propPath:
            obj = obj.propGet(url.propPath)
            pass
        return obj

    def assetFind(self, id):
        # lookup by id
        asset = self.assetMap.get(id)
        if asset:
            return asset
        # lookup by name
        name = id.casefold()
        for a in self.assetMap.values():
            if 'name' in a and a['name'].casefold() == name:
                return a
            pass
        return None

    def assetGet(self, id):
        asset = self.assetFind(id)
        if asset is None:
            raise Exception(
                "{}: can't find asset".format(id)
            )
        return asset

    def assetIndex(self):
        asset_info = self.obj['asset_info']
        if asset_info:
            self.id = asset_info['id']
            self.type = asset_info['type']
            pass
        for key in self.obj.keys():
            if key.endswith('_library'):
                if key == 'node_library':
                    cls = Node
                elif key == 'geometry_library':
                    cls = Geometry
                else:
                    cls = Object
                    pass
                for asset in self.obj[key]:
                    id = asset['id']
                    assert id not in self.assetMap
                    type = asset.get('type')
                    self.assetMap[id] = cls(asset)
                    pass
                pass
            pass
        pass

    def boneIndex(self):
        for asset in self.assetMap.values():
            if asset.get('type') == 'bone':
                pid = asset.get('parent')
                if pid:
                    parent = self.find(pid)
                    parent.add(asset)
                    pass
                pass
            pass
        pass

    def objIndex(self, obj):
        if isinstance(obj, dict):
            if 'url' in obj:
                url = obj['url']
                self.urlRefs[url] = True
                pass
            for name, val in obj.items():
                if isinstance(val, (dict, list)):
                    self.objIndex(val)
                    pass
                pass
            pass
        elif isinstance(obj, list):
            for val in obj:
                if isinstance(val, (dict, list)):
                    self.objIndex(val)
                    pass
                pass
            pass
        pass

    def urlCheck(self):
        for url in self.urlRefs.keys():
            u = URL(url)
            if u.scheme:
                # check local URL
                try:
                    obj = self.find(u)
                except Exception as ex:
                    #print(ex)
                    print("WARNING: can't find URL {}".format(url))
                    pass
                pass
            else:
                print("TBD: check external URL {}".format(url))
                pass
            pass
        pass

    def urlDump(self):
        for url in self.urlRefs.keys():
            print("url={}".format(url))
            pass
        pass

    def pathDump(self, obj, nodePath):
        if isinstance(obj, dict):
            id = obj.get('id')
            type = obj.get('type')
            if id:
                nodePath += "#" + id
                pass
            if nodePath:
                print("path={} type={}".format(nodePath, type))
                pass
            for name, val in obj.items():
                if isinstance(val, (dict, list)):
                    if nodePath == "":
                        valPath = name
                    else:
                        valPath = nodePath + "/" + name
                        pass
                    self.pathDump(val, valPath)
                    pass
                pass
            pass
        elif isinstance(obj, list):
            idx = 0
            for val in obj:
                if isinstance(val, (dict, list)):
                    valPath = "{}[{}]".format(nodePath, idx)
                    self.pathDump(val, valPath)
                    pass
                idx += 1
                pass
            pass
        pass
    pass

class Reader:
    SearchPath = [
        os.environ['PUBLIC'] + '/Documents/My DAZ 3D Library',
        os.environ['USERPROFILE'] + '/Documents/DAZ 3D/Studio/My Library'
    ]

    def __init__(self):
        self.cache = {}
        pass

    def locateFile(self, path):
        if os.path.exists(path):
            return path
        for dirName in self.SearchPath:
            newPath = dirName + path
            if os.path.exists(newPath):
                return newPath
            pass
        return None

    def loadURL(self, url):
        u = URL(url)
        key = u.path

        dfile = None
        if key in self.cache:
            dfile= self.cache[key]
            pass
        else:
            path = self.locateFile(key)
            if path is None:
                raise Exception(
                    "{}: can't locate url".format(url)
                )
            #print("{}: found url at {}".format(url, path))
            obj = self.loadFile(path)
            dfile = File(key, obj)
            self.cache[key] = dfile
            pass
        if u.fragment:
            frag = dfile.assetGet(u.fragment)
            if frag is None:
                assert u.fragment not in dfile.assetMap
                print(
                    "{} ({}) = {}".format(
                        url, u.fragment, toJSON(obj, sort_keys=True)
                    )
                )
                raise Exception(
                    "{}: can't find fragment {} in url".format(
                        url, u.fragment)
                )
            return frag
        return dfile

    def loadFile(self, path):
        root, ext = os.path.splitext(path)
        if ext not in ('.duf', '.dsf'):
            raise Exception(
                "{}: unknown file type".format(path)
            )
        with gzip.open(path, 'rb') as b:
            return json.load(codecs.getreader('utf-8')(b))
        pass
    pass
