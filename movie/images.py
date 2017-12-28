# Create a movie from a series of images.
# http://hamelot.io/visualization/using-ffmpeg-to-convert-a-set-of-images-into-a-video/
# https://stackoverflow.com/questions/11552565/vertically-stack-several-videos-using-ffmpeg/33764934#33764934
# https://trac.ffmpeg.org/wiki/Encode/H.264

import argparse
import os
import re
import subprocess
import sys

# default ffmpeg executable path
FFMPEG_EXE = 'M:/apps/ffmpeg-3.4.1-win64-static/bin/ffmpeg.exe'

# image file name pattern: BASE[EYE][INDEX]
IMAGE_RE = re.compile(r'([LR]?)(\d+)$')

# allowed image types
IMAGE_TYPES = {
    '.jpg': 'JPEG',
    '.jpeg': 'JPEG',
    '.png': 'PNG'
}

# command line options
parser = argparse.ArgumentParser(
    description='Create a movie from a series of images.'
)
parser.add_argument(
    'images',
    metavar='IMAGE',
    type=str,
    nargs='+',
    help='an image file or directory'
)
parser.add_argument(
    '--ffmpeg',
    metavar='FFMPEG',
    type=str,
    default=FFMPEG_EXE,
    help='the path to the ffmpeg executable'
)
parser.add_argument(
    '-r',
    dest='fps',
    metavar='FPS',
    type=int,
    default=30,
    help='the frame rate in frames per second'
)
parser.add_argument(
    '-o',
    dest='output',
    metavar='OUTPUT',
    type=str,
    default="output{eye}.mp4",
    help='output file name pattern'
)
parser.add_argument(
    '-f',
    dest='replace',
    action='store_true',
    default=False,
    help='replace existing output files'
)
parser.add_argument(
    '-v',
    dest='verbose',
    action='store_true',
    default=False,
    help='print out the ffmpeg commands'
)

args = parser.parse_args()

if not os.path.exists(args.ffmpeg):
    sys.exit("{}: ffmpeg executable does not exist".format(args.ffmpeg))
    pass

EyeMap = {}
FrameMap = {}

def imageFileParse(imgFile, imgDir=None):
    (root, ext) = os.path.splitext(imgFile)
    fileType = IMAGE_TYPES.get(ext.lower())
    if fileType is None:
        raise Exception(
            "{}: can't determine the image type".format(imgFile)
        )
    # match file name to BASE[EYE]INDEX
    m = IMAGE_RE.search(root)
    if not m:
        raise Exception(
            "{}: can't decode image file name".format(imgFile)
        )

    base = root[:m.start(1)]
    eye = EyeMap.get(m.group(1))
    if eye is None:
        eye = EyeMap[eye] = m.group(1)
        pass
    index = m.group(2)
    indexWidth = len(index)
    index = int(index)

    if imgDir:
        imgFile = os.path.join(imgDir, imgFile)
        base = os.path.join(imgDir, base)
        pass
    else:
        if not os.path.exists(imgFile):
            raise Exception(
                "{}: image file does not exist".format(imgFile)
            )
        pass

    key = (base, index)
    frame = FrameMap.get(key)
    if not frame:
        frame = FrameMap[key] = {
            'key': key,
            'indexWidth': indexWidth,
            'ext': ext,
            'eyes': {}
        }
        pass
    if frame['indexWidth'] != indexWidth:
        raise Exception(
            "{}: image file index width mismatch (expected {})".format(
                imgFile,
                frame['indexWidth']
            )
        )
    if frame['ext'] != ext:
        raise Exception(
            "{}: image file extension mismatch (expected {})".format(
                imgFile,
                frame['ext']
            )
        )
    frame['eyes'][eye] = imgFile
    pass

for i in args.images:
    if os.path.isdir(i):
        for f in os.listdir(i):
            imageFileParse(f, imgDir=i)
            pass
        pass
    else:
        imageFileParse(i)
        pass
    pass

isStereo = 'L' in EyeMap or 'R' in EyeMap
if isStereo and args.output.find('{eye}') < 0:
    # output file pattern must include an {eye} substitution
    (root, ext) = os.path.splitext(args.output)
    args.output = root + '{eye}' + ext
    pass

inputs = []
currentInput = None

for key in sorted(FrameMap.keys()):
    frame = FrameMap[key]
    base, index = key
    indexWidth = frame['indexWidth']
    ext = frame['ext']
    if isStereo:
        # stereo movie
        eyes = frame['eyes']
        hasPair = True
        for eye in ('L', 'R'):
            if eye not in eyes:
                # missing stereo pair
                hasPair = False
                print(
                    "WARNING: missing index={} eye={} image for {}".format(
                        index, eye, base
                    )
                )
                break
            pass
        if not hasPair:
            continue
        pass
    if (currentInput is None or
        currentInput['base'] != base or
        currentInput['indexWidth'] != indexWidth or
        currentInput['ext'] != ext or
        currentInput['end'] != index - 1):
        currentInput = {
            'base': base,
            'indexWidth': frame['indexWidth'],
            'ext': ext,
            'start': index,
            'end': index,
            'frames': [frame]
        }
        inputs.append(currentInput)
        pass
    else:
        currentInput['end'] = index
        pass
    pass

def cmdBase():
    cmd = [args.ffmpeg]
    if not args.verbose:
        cmd.extend([
            '-hide_banner',
            '-loglevel', 'warning'
        ])
        pass
    return cmd

def cmdRun(cmd, output):
    if args.verbose:
        print(cmd)
        pass
    if args.replace or not os.path.exists(output):
        subprocess.check_call(cmd)
        pass
    pass

def cmdJoin(eye, inputs, filterCmd=None):
    cmd = cmdBase()
    if not args.verbose:
        cmd.append('-hide_banner')
        pass
    for i in inputs:
        cmd.extend([
            '-f', 'image2',
            '-framerate', str(args.fps),
            '-pattern_type', 'sequence',
            '-start_number', str(i['start']),
            #'-start_number_range', str(i['end'] - i['start'] + 1),
            '-i',
            "{}{}%0{}d{}".format(
                i['base'],
                eye,
                i['indexWidth'],
                i['ext']
            )
        ])
        pass
    output = args.output.format(eye=eye)
    cmd.extend([
        '-c:v', 'libx264',
        '-crf', '17',
        '-preset', 'slow',
        #'-pix_fmt', 'yuvj420p',
        output
    ])
    cmdRun(cmd, output)
    if filterCmd is not None:
        filterCmd.extend([
            '-i', output
        ])
        pass
    pass

def cmdHStack(inputs):
    filterCmd = cmdBase()
    for eye in ('L', 'R'):
        cmdJoin(eye, inputs, filterCmd=filterCmd)
        pass
    output = args.output.format(eye='LR')
    filterCmd.extend([
        '-filter_complex', 'hstack=shortest=1',
        '-c:v', 'libx264',
        '-crf', '17',
        '-preset', 'slow',
        #'-pix_fmt', 'yuvj420p',
        output
    ])
    cmdRun(filterCmd, output)
    pass

if isStereo:
    cmdHStack(inputs)
else:
    cmdJoin('', inputs)
    pass
