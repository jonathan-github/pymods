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
    '-p',
    dest='prettyPrint',
    action='store_true',
    default=False,
    help='pretty print the output'
)
parser.add_argument(
    '-t',
    dest='typeFilter',
    metavar='TYPE',
    type=str,
    help='asset_info type'
)
parser.add_argument(
    dest='keywords',
    metavar='KEY',
    type=str,
    nargs='*',
    default=None,
    help='keywords'
)
parser.add_argument(
    '--in',
    dest='indexFile',
    metavar='FILE',
    type=str,
    default="index.json",
    help='index file to search'
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

def matches(fileInfo):
    if matchFileInfo(fileInfo):
        return fileInfo
    dups = fileInfo.get('duplicates')
    if dups:
        for dup in dups:
            if matchFileInfo(dup):
                return dup
            pass
        pass
    return None

def matchFileInfo(fileInfo):
    if args.typeFilter:
        if fileInfo['asset_info']['type'] != args.typeFilter:
            return False
        pass
    if args.keywords:
        return matchesObj(fileInfo)
    return True

def matchesObj(obj):
    for key, value in obj.items():
        if key == 'duplicates':
            continue
        if isinstance(value, str):
            for kw in args.keywords:
                if kw in value:
                    return True
                pass
            pass
        elif isinstance(value, dict):
            if matchesObj(value):
                return True
            pass
        pass
    return False

def dump(fileInfo):
    if args.prettyPrint:
        print(json.dumps(fileInfo, indent=2))
    else:
        print(json.dumps(fileInfo))
        pass

indexFile = None
with open(args.indexFile, 'r') as f:
    indexFile = json.load(f)
    pass

count = 0
for assetId, fileInfo in indexFile.items():
    logger.debug("search {}".format(assetId))
    m = matches(fileInfo)
    if m:
        dump(m)
        count += 1
        pass
    pass
logger.info("matched {} files".format(count))
