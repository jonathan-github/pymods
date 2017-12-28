import logging
import urllib.parse
import os

import dson.reader
import dson.types
import dson.utils

# export format
"""mesh = {
    "type": "subdivision_surface",
    "vertices": [[x, y, z], ...],
    "polygons": [[v1, v2, v3, ...], ...],
    "polygon_groups": [
        {"id": "group_id",
         "polylist": [polylist_index, ...],
         "uv_set": uv_set_index,
         "uvs": [uvs_index, ...]},
        ...
    ],
    "polygon_material_groups": [
        {"id": "material_id",
         "polylist": [polylist_index, ...]
         "material": "material_id",
         "uvs": [uv_index, ...]},
        ...
    ],
    "figure": {
        "id": "bone_id",
        "name": "bone_name",
        "label": "bone_label",
        "center_point": [x, y, z],
        "end_point": [x, y, z],
        "translation": [x, y, z],
        "orientation": [x, y, z],
        "rotation_order": "XYZ",
        "rotation": [x, y, z],
        "inherits_scale": bool,
        "scale": [x, y, z],
        "general_scale": float,
        "weights": [[vertex_index, weight], ...]
        "children": [bone, ...],
    }
}
library = {
    "uv_sets": [
        {"id": "uv_set_id",
         "uvs": [[u, v], ...]},
        ...
    ],
    "materials": [
        {"id": "material_id",
         "uv_set": "uv_set_id",
         "diffuse": {"value": [r, g, b]},
         # iray
         "diffuse_color": {"value": [r, g, b], "image_file": "image.jpg"},
         "cutout_opacity": {"image_file": "image.jpg"},
         "translucency_color": {"value": [r, g, b], "image_file": "image.jpg"},
         "glossy_layered_weight": {"value": f, "image_file": "image.jpg"},
         "refraction_weight": {"value": f, "image_file": "image.jpg"},
         "bump_strength": {"value": f, "image_file": "image.jpg"},
         "normal_map": {"value": f, "image_file": "image.jpg"},
         "top_coat_color": {"value": [r, g, b], "image_file": "image.jpg"},
         "top_coat_weight": {"value": f, "image_file": "image.jpg"},
         ...},
        ...
    ]
}"""

logger = logging.getLogger(__name__)

def dumpNodeHier(node, indent=0):
    print("{:>{}}{}".format('', indent, node))
    indent1 = indent + 1
    for child in node.children:
        dumpNodeHier(child, indent1)
        pass
    pass

PointUnpackOrder = ('x', 'y', 'z')

def pointUnpack(obj, order=PointUnpackOrder):
    if isinstance(obj, dict):
        rec = []
        for prop in order:
            rec.append(obj.get(prop, 0))
            pass
        return rec
    return obj

class ExportDef:
    Unpackers = {
        'channel': dson.types.Channel.unpack,
        'point': pointUnpack
    }

    def __init__(self, prop, name=None, defValue=None, unpackers=None):
        self.prop = prop
        self.name = name
        self.defValue = defValue
        self.unpackers = unpackers
        pass

    def load(self, obj, rec):
        if self.defValue is not None:
            pval = obj.propFind(self.prop, exclude='preview')
        else:
            pval = obj.propGet(self.prop, exclude='preview')
            pass
        if pval is None:
            return self.defValue
        if self.unpackers:
            for unpacker in self.unpackers:
                if unpacker in self.Unpackers:
                    unpacker = self.Unpackers[unpacker]
                    pass
                pval = unpacker(pval)
                pass
            pass
        rec[self.name or self.prop] = pval
        return pval
    pass

BoneExportDefs = [
    ExportDef('name', name='id'),
    ExportDef('center_point', unpackers=('channel', 'point')),
    ExportDef('end_point', unpackers=('channel', 'point')),
    ExportDef('rotation_order', defValue="XYZ"),
    ExportDef('inherits_scale', defValue=True),
    ExportDef('orientation', unpackers=('channel', 'point')),
    ExportDef('translation', unpackers=('channel', 'point')),
    ExportDef('rotation', unpackers=('channel', 'point')),
    ExportDef('scale', unpackers=('channel', 'point')),
    ExportDef('general_scale', unpackers=('channel', 'point'))
]

def boneExport(bone, nodeWeights=None):
    if not bone.isA((dson.types.Figure, dson.types.Bone)):
        return None

    if bone.propGet('id') != bone.propGet('name'):
        logger.warn("bone id ({}) does not match name ({}): {}".format(
            bone.propGet('id'),
            bone.propGet('name'),
            bone.data
        ))
        pass
    #assert bone.propGet('id') == bone.propGet('name')
    rec = {}
    for expDef in BoneExportDefs:
        expDef.load(bone, rec)
        pass
    id = bone.propGet('url', 'id')
    if rec['id'] != id:
        rec['alias'] = id
        pass
    if nodeWeights:
        values = nodeWeights.get(bone.propGet('name'))
        if values:
            rec['node_weights'] = values
            pass
        pass
    children = []
    for child in bone.children:
        child = boneExport(child, nodeWeights)
        if child:
            children.append(child)
            pass
        pass
    if children:
        rec['children'] = children
        pass
    return rec

class ObjectSet:
    def __init__(self):
        self.reset()
        pass

    def reset(self):
        self.objects = []
        self.idMap = {}
        pass

    def add(self, obj, id=None):
        if id is None:
            id = obj.propGet('id')
            pass
        rec = self.idMap.get(id)
        if rec is None:
            index = len(self.objects)
            rec = {
                'index': index,
                'obj': obj,
                'json': None
            }
            self.idMap[id] = rec
            self.objects.append(rec)
            pass
        return rec

    def toJSON(self):
        return [rec['json'] for rec in self.objects]
    pass

class LibraryExporter:
    def __init__(self, baseName):
        self.baseName = baseName
        self.materials = ObjectSet()
        self.materialGroups = {}
        self.uvSets = ObjectSet()
        self.images = ObjectSet()
        self.imageMap = {}
        self.imageLabels = {}
        pass

    def reset(self):
        self.materials.reset()
        self.materialGroups = {}
        self.uvSets.reset()
        self.images.reset()
        self.imageMap = {}
        self.imageLabels = {}
        pass

    def export(self):
        return {
            'materials': self.materials.toJSON(),
            'uv_sets': self.uvSets.toJSON(),
            'images': self.images.toJSON()
        }

    def loadFigureAssets(self, daz, figure):
        logger.info("loading figure {}".format(figure))
        skinBinding = None
        joints = None
        geometries = []
        materials = []
        for asset in daz.assets:
            if asset.isA(dson.types.Modifier):
                skin = asset.propFind('skin')
                if skin:
                    node = skin.propGet('node')
                    if node.isEq(figure):
                        skinBinding = skin
                        joints = skin.propFind('joints')
                        pass
                    pass
                pass
            elif asset.isA(dson.types.Geometry):
                geometries.append(asset)
                pass
            elif asset.isA(dson.types.Material):
                materials.append(asset)
                pass
            elif asset.isA(dson.types.Image):
                self.imageAdd(asset)
                pass
            pass
        geometry = None
        if skinBinding:
            geometry = skinBinding.propGet('geometry')
            pass
        if geometry is None and len(geometries) > 0:
            geometry = geometries[0]
            pass
        assert geometry
        default_uv_set = geometry.propFind('default_uv_set')
        if default_uv_set:
            self.uvSetAdd(default_uv_set)
            pass
        materialGroups = {}
        for material in materials:
            if geometry.isEq(material.propFind('geometry')):
                self.materialAdd(material, materialGroups)
                pass
            pass
        nodeWeights = None
        if joints is not None:
            nodeWeights = {}
            for joint in joints:
                values = joint.propFind('node_weights', 'values')
                if values:
                    # TBD: why map by name?
                    nodeWeights[joint.propGet('node', 'name')] = values
                    pass
                pass
            pass
        return geometry, materialGroups, nodeWeights

    def uvSetAdd(self, uv_set):
        if uv_set is None:
            return None
        rec = self.uvSets.add(uv_set)
        if rec['json'] is None:
            rec['json'] = {
                'id': uv_set.propGet('id'),
                'uvs': uv_set.propGet('uvs', 'values')
            }
            pass
        return rec

    def uvSetMap(self, uv_set, geometry):
        # polylist = [ [pg, pmg, vertices_index, ...], ...]
        #	3 vertices == tri
        #	4 vertices == quad
        polylist = geometry.propGet('polylist', 'values')

        uvMap = []
        i = 0
        for poly in polylist:
            uvMap.append(poly[2:])
            i += 1
            pass

        # pvi = [ [polylist_index, vertex_index, uvs_index], ...]
        polygon_vertex_indices = uv_set.propGet('polygon_vertex_indices')

        for pvi in polygon_vertex_indices:
            pi, vi, uvi = pvi
            assert pi < len(polylist)
            poly = polylist[pi]
            assert vi in poly

            uvs = uvMap[pi]
            n = len(poly) - 2
            for i in range(n):
                if vi == poly[i + 2]:
                    uvs[i] = uvi
                    break
                pass
            pass
        return uvMap

    def materialAdd(self, material, materialGroups):
        if material is None:
            return None
        rec = self.materials.add(material)
        if rec['json'] is None:
            logger.info("material {}".format(material))
            rec['json'] = {
                'id': material.propGet('id')
            }
            uvSet = self.uvSetAdd(material.propFind('uv_set'))
            if uvSet:
                logger.info(" uv_set = {}".format(uvSet['obj']))
                rec['uvSet'] = uvSet
                rec['json']['uv_set'] = uvSet['index']
                pass

            diffuse = material.propFind('diffuse')
            if diffuse:
                diffuseRec = {}
                value = (diffuse.propFind('current_value') or
                         diffuse.propFind('value'))
                if value:
                    diffuseRec['color'] = value
                    pass
                image_file = diffuse.propFind('image_file')
                if image_file:
                    image = self.imageGet(image_file)
                    diffuseRec['image'] = image['index']
                    pass
                if diffuseRec:
                    logger.info(" diffuse = {}".format(diffuseRec))
                    rec['json']['diffuse'] = diffuseRec
                    pass
                pass

            cutout = material.propFind('extra',
                                       'studio_material_channels',
                                       'Cutout Opacity')
            if cutout:
                cutoutRec = {}
                image_file = cutout.get('image_file')
                if image_file:
                    image = self.imageGet(image_file)
                    cutoutRec['image'] = image['index']
                    pass
                if cutoutRec:
                    logger.info(" cutout = {}".format(cutoutRec))
                    rec['json']['cutout'] = cutoutRec
                    pass
                pass

            normalMap = material.propFind('extra',
                                          'studio_material_channels',
                                          'Normal Map')
            if normalMap:
                normalMapRec = {}
                image_file = normalMap.get('image_file')
                if image_file:
                    image = self.imageGet(image_file)
                    normalMapRec['image'] = image['index']
                    pass
                if normalMapRec:
                    logger.info(" normalMap = {}".format(normalMapRec))
                    rec['json']['normalMap'] = normalMapRec
                    pass
                pass

            specularMap = material.propFind('extra',
                                            'studio_material_channels',
                                            'Glossy Layered Weight')
            if specularMap:
                specularMapRec = {}
                image_file = specularMap.get('image_file')
                if image_file:
                    image = self.imageGet(image_file)
                    specularMapRec['image'] = image['index']
                    pass
                if specularMapRec:
                    logger.info(" specularMap = {}".format(specularMapRec))
                    rec['json']['specularMap'] = specularMapRec
                    pass
                pass

            bumpMap = material.propFind('extra',
                                        'studio_material_channels',
                                        'Bump Strength')
            if bumpMap:
                bumpMapRec = {
                    'value': bumpMap.get('current_value')
                }
                image_file = bumpMap.get('image_file')
                if image_file:
                    image = self.imageGet(image_file)
                    bumpMapRec['image'] = image['index']
                    pass
                if bumpMapRec:
                    logger.info(" bumpMap = {}".format(bumpMapRec))
                    rec['json']['bumpMap'] = bumpMapRec
                    pass
                pass

            groups = material.propFind('groups')
            if groups:
                rec['json']['groups'] = groups
                for group in groups:
                    logger.info(" group = {}".format(group))
                    assert group not in self.materialGroups
                    self.materialGroups[group] = rec
                    pass
                pass
            pass
        groups = material.propFind('groups')
        if groups:
            for group in groups:
                assert group not in materialGroups
                materialGroups[group] = rec
                pass
            pass
        return rec

    def propsAdd(self, obj, rec, props):
        for prop in props:
            pval = obj.propFind(prop)
            if pval is not None:
                rec[prop] = pval
                pass
            pass
        pass

    IMAGE_MAP_PROPS = ('operation', 'transparency', 'invert',
                       'xmirror', 'xoffset', 'xscale',
                       'ymirror', 'yoffset', 'yscale',
                       'rotation')

    def imageAdd(self, image):
        logger.debug("add = {}".format(dson.utils.pp(image)))
        imageMap = image.propGet('map')
        layers = []
        for layer in imageMap:
            url = layer.propGet('url')
            path = dson.reader.cache.locateFile(url)
            if path is None:
                url = urllib.parse.unquote(url)
                path = dson.reader.cache.locateFile(url)
                pass
            if path is None:
                logger.warn("can't find url={}".format(url))
                pass
            assert path is not None

            label = layer.propGet('label')
            rec = self.images.idMap.get(url)
            if rec is None:
                rec = self.images.add(layer, id=url)
                rec['path'] = path
                rec['json'] = {
                    'url': "{}/textures/{}".format(self.baseName, os.path.basename(url))
                }
                self.imageMap[url] = rec
                logger.debug("image[{}] = {}".format(rec['index'], dson.utils.pp(rec['json'])))
                pass
            layerRec = {
                'image': rec['index']
            }
            self.propsAdd(layer, layerRec, self.IMAGE_MAP_PROPS)
            layers.append(layerRec)
            pass
        mapRec = self.images.add(image)
        mapData = {
            'map': layers
        }
        self.propsAdd(image, mapData, ('id', 'map_gamma'))
        mapRec['json'] = mapData
        logger.debug("image[{}] = {}".format(mapRec['index'], dson.utils.pp(mapRec['json'])))
        return mapRec

    def imageGet(self, url):
        rec = self.imageMap.get(url)
        if rec is None:
            url = urllib.parse.unquote(url)
            rec = self.imageMap[url]
            pass
        return rec

    pass

class FigureExporter:
    def __init__(self, library):
        self.library = library
        pass

    def load(self, daz, figure):
        geometry, materialGroups, nodeWeights = self.library.loadFigureAssets(daz, figure)

        # polygon_groups = ["name", ...]
        polygonGroups = []
        for group in geometry.propGet('polygon_groups', 'values'):
            polygonGroups.append({
                'id': group,
                'polygons': []
            })
            pass

        # polygon_material_groups = ["name", ...]
        polygonMaterialGroups = []
        for group in geometry.propGet('polygon_material_groups', 'values'):
            rec = {
                'id': group,
                'polygons': []
            }
            polygonMaterialGroups.append(rec)
            pass

        # polylist = [ [pg, pmg, vertices_index, ...], ...]
        #	3 vertices == tri
        #	4 vertices == quad
        polygons = []
        poly_index = 0
        for poly in geometry.propGet('polylist', 'values'):
            indices = poly[2:]
            polygons.append(indices)
            polygonGroups[poly[0]]['polygons'].append(poly_index)
            polygonMaterialGroups[poly[1]]['polygons'].append(poly_index)
            poly_index += 1
            pass

        # lookup material assets in the library
        uvMaps = {}
        for group in polygonMaterialGroups:
            mat = materialGroups[group['id']]
            group['material'] = mat['index']
            uvSet = mat.get('uvSet')
            if uvSet:
                uvMap = uvMaps.get(uvSet['index'])
                if uvMap is None:
                    uvMap = self.library.uvSetMap(uvSet['obj'], geometry)
                    uvMaps[uvSet['index']] = uvMap
                    pass
                uvs = []
                for pi in group['polygons']:
                    uvs.append(uvMap[pi])
                    pass
                group['uvs'] = uvs
                pass
            pass
        data = {
            'name': self.library.baseName,
            'type': geometry.propGet('type'),
            'vertices': geometry.propGet('vertices', 'values'),
            'polygons': polygons,
            'polygon_groups': polygonGroups,
            'material_groups': polygonMaterialGroups,
            'figure': boneExport(figure, nodeWeights)
        }
        data.update(self.library.export())
        return data
    pass
