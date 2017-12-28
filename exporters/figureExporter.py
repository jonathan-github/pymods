import argparse
import logging
import os
import PIL.Image
import shutil
import sys

# Examples:
# python .\exporters\figureExporter.py "Victoria 7.duf"
# python .\exporters\figureExporter.py "Hongyu/Hongyu's MiniDress for V7/HY MiniDress for V7.duf"

# pymod modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import dson.reader
import exporters.figure

# sub-directories to search
INCLUDE_DIRS = [
    '/People/Genesis 3 Female/Characters',
    '/People/Genesis 3 Female/Hair',
    '/People/Genesis 3 Female/Clothing',
    '/People/Genesis 8 Female/Characters',
    '/People/Genesis 8 Female/Hair',
    '/People/Genesis 8 Female/Clothing'
]

# command line options
parser = argparse.ArgumentParser(
    description='Export a DAZ figure.'
)
parser.add_argument(
    'figures',
    metavar='FIGURE',
    type=str,
    nargs='+',
    help='a DAZ figure in DSON format (.duf)'
)
parser.add_argument(
    '-v',
    dest='verbose',
    action='store_true',
    default=False,
    help='set logging level to DEBUG'
)
parser.add_argument(
    '-I',
    dest='includes',
    metavar='INCLUDE_DIR',
    type=str,
    nargs='*',
    help='directories to search'
)
parser.add_argument(
    '-d',
    dest='outputDir',
    metavar='DIRECTORY',
    type=str,
    default="www/html/lib/models",
    help='output directory'
)
parser.add_argument(
    '-f',
    dest='overwrite',
    action='store_true',
    default=False,
    help='overwrite output files'
)
args = parser.parse_args()
if not os.path.isdir(args.outputDir):
    sys.exit("{}: output directory does not exist".format(args.outputDir))
    pass

# setup logging
loggingConfig = {
    'level': logging.INFO
}
if args.verbose:
    loggingConfig['level'] = logging.DEBUG
    pass
logging.basicConfig(**loggingConfig)
logger = logging.getLogger(__name__)

def findUrl(url, dirs=None):
    cache = dson.reader.cache
    if not dirs:
        if cache.locateFile(url):
            return url
        pass
    else:
        for d in dirs:
            p = d + "/" + url
            if cache.locateFile(p):
                return p
            pass
        pass
    return None

def createDir(path):
    d = os.path.dirname(path)
    if not os.path.exists(d):
        logger.debug("creating directory {}".format(d))
        os.makedirs(d)
        pass
    pass

def needsCopy(src, dst, checkSize=True):
    if args.overwrite or not os.path.exists(dst):
        return True
    sstat = os.stat(src)
    dstat = os.stat(dst)
    if ((checkSize and sstat.st_size != dstat.st_size) or
        sstat.st_mtime > dstat.st_mtime):
        logger.debug("updating {}".format(dst))
        return True
    return False

def searchUrl(url):
    found = (findUrl(url) or
             findUrl(url, args.includes) or
             findUrl(url, INCLUDE_DIRS))
    if not found:
        raise Exception("{}: can't find figure file".format(url))
    return found

for url in args.figures:
    (baseName, ext) = os.path.splitext(os.path.split(url)[1])
    library = exporters.figure.LibraryExporter(baseName)

    daz = dson.reader.cache.loadURL(searchUrl(url))
    figures = []
    for asset in daz.assets:
        if asset.isA(dson.types.Figure):
            figures.append(asset)
            pass
        pass
    if figures:
        if len(figures) > 1:
            logger.warn("found multiple figures: {}".format(
                [str(f) for f in figures]
            ))
            pass
        figure = figures[0]
        pass
    if not figure:
        logger.debug(dson.utils.toJSON(daz))
        sys.exit("can't find a figure node")
        pass

    exporter = exporters.figure.FigureExporter(library)
    result = exporter.load(daz, figure)
    baseDir = "{}/{}".format(
        args.outputDir,
        baseName
    )
    modelFile = "{}/model.json".format(
        baseDir
    )
    createDir(modelFile)
    logger.info("saving to {}".format(modelFile))
    with open(modelFile, 'w') as f:
        dson.utils.outputJSON(f, result)
        pass
    for image in library.images.objects:
        if 'path' in image:
            textureSrc = image['path']
            textureFile = "{}/{}".format(
                args.outputDir,
                image['json']['url']
            )
            createDir(textureFile)
            (textureFileBase, textureFileType) = os.path.splitext(textureFile)
            if textureFileType.lower() in ('.tiff', '.tif'):
                # convert the texture from .tiff to .png
                textureFilePng = "{}.png".format(textureFileBase)
                if needsCopy(textureSrc, textureFilePng, checkSize=False):
                    logger.info("converting {} to PNG".format(
                        image['json']['url']
                    ))
                    im = PIL.Image.open(textureSrc)
                    im.save(textureFilePng, 'PNG', optimize=True)
                    shutil.copystat(textureSrc, textureFilePng)
                    pass
                pass
            else:
                # copy the texture as is
                if needsCopy(textureSrc, textureFile):
                    shutil.copy2(textureSrc, textureFile)
                    pass
                pass
            pass
        pass
    pass
