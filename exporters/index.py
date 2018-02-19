import argparse
import json
import logging
import os
import re
import sys
import urllib

# pymod modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import dson.reader

# command line options
parser = argparse.ArgumentParser(
    description='Index DAZ libraries.'
)
parser.add_argument(
    '-v',
    dest='verbose',
    action='store_true',
    default=False,
    help='set logging level to INFO'
)
parser.add_argument(
    '-d',
    dest='debug',
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
    '-t',
    dest='types',
    metavar='TYPES',
    type=str,
    nargs='*',
    help='asset_info types'
)
parser.add_argument(
    '-o',
    dest='outputFile',
    metavar='FILE',
    type=str,
    default=None,
    help='output file'
)
parser.add_argument(
    '-e',
    dest='errorFile',
    metavar='FILE',
    type=str,
    default=None,
    help='error file'
)
args = parser.parse_args()

# setup logging
loggingConfig = {
    'level': logging.WARNING
}
if args.debug:
    loggingConfig['level'] = logging.DEBUG
elif args.verbose:
    loggingConfig['level'] = logging.INFO
    pass
logging.basicConfig(**loggingConfig)
logger = logging.getLogger(__name__)

class IndexFiles:
    FILE_EXTS = ('.duf', '.dsf')

    def __init__(self):
        self.files = []
        self.idMap = {}
        self.typeMap = {}
        self.errors = []
        pass

    def processDir(self, path, libraryDir):
        logger.info("processing directory {}".format(path))
        for name in os.listdir(path):
            filePath = path + "/" + name
            root, ext = os.path.splitext(name)
            if ext in self.FILE_EXTS:
                if not self.indexFile(filePath, libraryDir):
                    return False
                pass
            elif os.path.isdir(filePath):
                if not self.processDir(filePath, libraryDir):
                    return False
                pass
            pass
        return True

    def indexFile(self, filePath, libraryDir):
        try:
            data = dson.reader.cache.loadFile(filePath)
        except:
            logger.exception("{}: error parsing file".format(filePath))
            self.errors.append({
                'type': 'load',
                'file': filePath,
                'error': str(sys.exc_info()[1])
            })
            return True

        asset_info = data.get('asset_info')
        if asset_info is None:
            # missing asset_info
            return True

        asset_id = self.idCleanup(asset_info.get('id'))
        asset_type = asset_info.get('type')
        if asset_id is None or asset_type is None:
            logger.warn("{}: missing id or type in {}".format(
                filePath,
                json.dumps(asset_info, indent=2)
            ))
            return True

        asset_type = asset_info['type']
        if args.types and asset_type not in args.types:
            # type filter
            return True

        fileBase = filePath[len(libraryDir):]
        fileInfo = {
            'library': libraryDir,
            'file': fileBase,
            'asset_info': asset_info,
            'file_version': data.get('file_version')
        }

        curFileInfo = self.idMap.get(asset_id)
        if curFileInfo is not None:
            logger.warn("duplicate id {}\nold = {}\nnew = {}".format(
                asset_id,
                json.dumps(self.idMap[asset_id], indent=2),
                json.dumps(curFileInfo, indent=2)
            ))
            self.errors.append({
                'type': 'duplicate',
                'file': filePath,
                'id': asset_id,
                'old': curFileInfo,
                'new': fileInfo
            })
            dups = curFileInfo.get('duplicates')
            if dups is None:
                dups = curFileInfo['duplicates'] = []
                pass
            dups.append(fileInfo)
            return True
        else:
            self.idMap[asset_id] = fileInfo
            pass
        self.files.append(fileInfo)

        self.typeMap[asset_type] = self.typeMap.get(asset_type, 0) + 1
        #return len(self.files) < 10
        return True

    def save(self, outputFile):
        if args.outputFile:
            with open(args.outputFile, 'w') as f:
                self.dumpIndex(f)
                pass
            pass
        else:
            self.dumpIndex(sys.stdout)
            pass
        if args.errorFile and self.errors:
            with open(args.errorFile, 'w') as f:
                json.dump(self.errors, f, indent=2)
                pass
            pass
        logger.info(json.dumps(self.typeMap, indent=2))
        pass
        
    def dumpIndex(self, f):
        json.dump(self.idMap, f, indent=2)
        pass

    def idCleanup(self, id):
        if not id:
            return None
        cleaned = urllib.parse.unquote(id)
        if len(cleaned) == 0:
            logger.warn("invalid id {}".format(id))
            return None
        if len(cleaned) > 0 and cleaned[0] == '/':
            # strip out repeat /s
            cleaned = re.sub(r'/+', '/', cleaned)
            pass
        if cleaned != id:
            logger.debug("cleaned id {} = {}".format(id, cleaned))
            pass
        return cleaned
    pass

app = IndexFiles()
dirs = args.includes or dson.reader.SearchPath
for path in dirs:
    if os.path.isdir(path):
        if not app.processDir(path, libraryDir=path):
            break
        pass
    pass
app.save(args.outputFile)
