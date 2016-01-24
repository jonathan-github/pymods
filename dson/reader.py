import codecs
import gzip
import json
import os
import sys

from . import utils
from . import types

SearchPath = []

def searchPathAdd(env, path):
    if env not in os.environ:
        return
    fullPath = os.environ[env].translate({ord('\\'): '/'}) + path
    SearchPath.append(fullPath)
    pass

searchPathAdd('PUBLIC', '/Documents/My DAZ 3D Library')
searchPathAdd('USERPROFILE', '/Documents/DAZ 3D/Studio/My Library')

GZIP_MAGIC = b"\x1f\x8b\x08"

def isGzipped(path):
    with open(path, 'rb') as rb:
        magic = rb.read(3)
        if magic == GZIP_MAGIC:
            return True
        pass
    return False

class Cache:
    def __init__(self):
        self.cache = {}
        pass

    def loadURL(self, url):
        if not isinstance(url, utils.URL):
            url = utils.URL(url)
            pass
        key = url.path

        obj = None
        if key in self.cache:
            obj = self.cache[key]
            pass
        else:
            path = self.locateFile(key)
            if path is None:
                raise Exception(
                    "{}: can't locate url".format(url)
                )
            obj = types.DAZ.load(self.loadFile(path))
            obj.path = key
            self.cache[key] = obj
            obj.refsLoad()
            if utils.verbose:
                if utils.verbose > 2:
                    print(
                        "loaded file \"{}\" = {}".format(
                            path, utils.toJSON(obj.asset_info)
                        )
                    )
                else:
                    print("loaded file \"{}\"".format(path))
                    pass
                if utils.verbose > 1:
                    for asset in obj.assets:
                        print(" ", asset.treePath(sep=" > ", idFormat=" #{}"))
                        pass
                    pass
                pass
            pass
        if url.fragment:
            obj = obj.idGet(url.fragment)
            pass
        if url.propPath:
            obj = types.pathGet(obj, url.propPath)
            pass
        return obj

    def locateFile(self, path):
        if os.path.exists(path):
            return path
        for searchDir in SearchPath:
            newPath = searchDir + path
            if os.path.exists(newPath):
                return newPath
            pass
        return None

    def loadFile(self, path):
        if utils.verbose:
            print("loading file \"{}\"...".format(path))
            pass
        root, ext = os.path.splitext(path)
        if ext not in ('.duf', '.dsf'):
            raise Exception(
                "{}: unknown file type".format(path)
            )
        if isGzipped(path):
            with gzip.open(path, 'rb') as rb:
                return json.load(codecs.getreader('utf-8')(rb))
            pass
        else:
            with open(path, 'r') as r:
                return json.load(r)
            pass
        pass
    pass

cache = Cache()
