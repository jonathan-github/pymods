import json
import urllib
import urllib.parse

from . import types

verbose = 0

class URL:
    def __init__(self, url):
        self.url = url
        u = urllib.parse.urlparse(url)
        self.scheme = u.scheme
        self.path = urllib.parse.unquote(u.path)
        self.fragment = u.fragment
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
                self.propPath = u.fragment[idx+1:].split('/')
                pass
            self.fragment = urllib.parse.unquote(self.fragment)
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
                
        
