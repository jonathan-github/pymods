import json
import urllib
import urllib.parse

from . import types

verbose = 0

class URL:
    """[ scheme :/ ] node_path : file_path # asset_id ? property_path"""

    def __init__(self, url):
        self.url = url
        u = urllib.parse.urlparse(url)
        self.scheme = u.scheme
        self.netloc = u.netloc
        self.path = urllib.parse.unquote(u.path)
        self.fragment = u.fragment

        if not self.scheme and self.path:
            idx = self.path.find(':')
            if idx >= 0:
                self.scheme = self.path[:idx]
                self.path = self.path[idx+1:]
                pass
            pass

        # fixup name://@selection URLs
        if self.netloc == '@selection:':
            # if url is 'name://@selection:?scale/x/value'
            # then netloc is '@selection:'
            # so need to trim off the trailing ':'
            self.netloc = self.netloc[:-1]
            pass
        if self.netloc == '@selection':
            if self.path and self.path[-1] == ':':
                # if url is 'name://@selection/path:?translation/x/value'
                # then path is 'path:'
                # so need to trim off the trailing ':'
                self.path = self.path[:-1]
                pass
            pass

        self.propPath = None
        if self.scheme:
            # note: urlparse lowercases the scheme so re-extract it
            # from the url
            self.scheme = url[:url.find(':')]
            pass
        if self.path:
            self.path = urllib.parse.unquote(self.path)
            pass
        if self.fragment:
            idx = u.fragment.find('?')
            if idx >= 0:
                self.fragment = u.fragment[:idx]
                if self.netloc == '@selection' and self.fragment[-1] == ':':
                    # if url is 'name://@selection#fragment:?value/value'
                    # then fragment is 'fragment:?value/value'
                    # so need to trim off the trailing ':'
                    self.fragment = self.fragment[:-1]
                    pass
                self.propPath = u.fragment[idx+1:].split('/')
                pass
            self.fragment = urllib.parse.unquote(self.fragment)
            pass
        if self.propPath is None and u.query:
            self.propPath = u.query.split('/')
            pass
        pass
    def __repr__(self):
        return self.url
    pass

def toJSON(obj, **kwargs):
    if 'indent' not in kwargs:
        kwargs['indent'] = 2
        pass
    if 'sort_keys' not in kwargs:
        kwargs['sort_keys'] = True
        pass
    if isinstance(obj, types.Object):
        obj = obj.srcData
        pass
    return json.dumps(obj, **kwargs)

def outputJSON(fp, obj, **kwargs):
    if 'sort_keys' not in kwargs:
        kwargs['sort_keys'] = True
        pass
    if isinstance(obj, types.Object):
        obj = obj.srcData
        pass
    return json.dump(obj, fp, **kwargs)

def pp(obj, fp=None):
    if fp:
        return json.dump(obj, fp, default=ppDefault, indent=2)
    else:
        return json.dumps(obj, default=ppDefault, indent=2)

def ppDefault(obj):
    if isinstance(obj, types.Object):
        return obj.srcData
    return str(obj)

def copyv(vec):
    return [x for x in vec]

def addv(a, b):
    for i in range(len(a)):
        a[i] += b[i]
        pass
    return a

def scalev(vec, scale):
    for i in range(len(vec)):
        vec[i] *= scale
        pass
    return vec

def magnitudev(vec):
    ssum = 0
    for r in vec:
        ssum += r ^ 2
        pass
    return math.sqrt(ssum)
    
def normalizev(vec):
    return scalev(vec, 1 / magnitude(vec))
