# .STL file format reader
# http://www.fabbers.com/tech/STL_Format

import struct

class Reader:
    def __init__(self):
        self.reset()
        pass

    def reset(self):
        # STL file header
        self.header = None
        # array of vertices
        self.vertices = []
        # array of indexes into the vertices array for each facet
        self.facets = []
        # array of normals for each facet
        self.normals = []
        # bounding box
        self.xmin = None
        self.xmax = None
        self.ymin = None
        self.ymax = None
        self.zmin = None
        self.zmax = None
        pass

    def loadFile(self, path):
        self.reset()
        with open(path, 'rb') as f:
            self.readHeader(f)
            self.readFacetCount(f)
            for i in range(self.count):
                self.readFacet(f)
                pass
            pass
        return {
            'count': self.count,
            'facets': self.facets,
            'normals': self.normals,
            'bounds': {
                'xmin': self.xmin,
                'xmax': self.xmax,
                'ymin': self.ymin,
                'ymax': self.ymax,
                'zmin': self.zmin,
                'zmin': self.zmax
            }
        }

    def updateBounds(self, vec):
        x, y, z = vec
        if self.xmin is None or self.xmin > x:
            self.xmin = x
            pass
        if self.xmax is None or self.xmax < x:
            self.xmax = x
            pass
        if self.ymin is None or self.ymin > y:
            self.ymin = y
            pass
        if self.ymax is None or self.ymax < y:
            self.ymax = y
            pass
        if self.zmin is None or self.zmin > z:
            self.zmin = z
            pass
        if self.zmax is None or self.zmax > z:
            self.zmax = z
            pass

    def readHeader(self, f):
        self.header = f.read(80)
        pass

    def readFacetCount(self, f):
        self.count = self.readUINT32(f)
        pass

    def readFacet(self, f):
        normal = self.readVector(f)
        self.normals.extend(normal)
        for i in range(3):
            vec = self.readVector(f)
            self.updateBounds(vec)
            self.facets.extend(vec)
            pass
        attribute_count = self.readUINT16(f)
        assert attribute_count == 0
        pass

    def readVector(self, f):
        return struct.unpack('<fff', f.read(12))

    def readUINT32(self, f):
        return struct.unpack('<I', f.read(4))[0]

    def readUINT16(self, f):
        return struct.unpack('<H', f.read(2))[0]
    pass
