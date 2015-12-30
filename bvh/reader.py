#!/usr/bin/env python

import collections
import json
import sys

class Object(collections.OrderedDict):
    def __init__(self, type=None, parent=None):
        self.parent = parent
        if type is not None:
            self['type'] = type
            pass
        self.opened = False
        pass

    def append(self, child, to='children'):
        children = self.get(to)
        if children is None:
            children = []
            self[to] = children
            pass
        children.append(child)
        pass

    def path(self):
        names = []
        obj = self
        while obj is not None:
            if 'name' in obj:
                names.append(obj['name'])
            elif 'type' in obj:
                names.append(obj['type'])
                pass
            if obj.parent:
                obj = obj.parent
            else:
                break
            pass
        return '/'.join(reversed(names))
    pass

class Reader:
    def __init__(self):
        self.reset()
        pass

    def reset(self):
        self.hierarchy = None
        self.motion = None
        self.data = None
        self.objects = []
        self.channels = 0
        self.objStack = []
        pass

    def loadFile(self, path):
        self.reset()
        self.filePath = path
        self.fileLine = 1
        self.fileChar = 0
        self.state = 'start'
        with open(path, 'r') as f:
            for line in f:
                self.line = line
                if self.state == 'line':
                    self.parseLine(line)
                    self.fileLine += 1
                    continue
                if line.strip() == 'MOTION':
                    self.startChar = 1
                    if len(self.objStack) != 1:
                        self.error("incomplete HIERARCHY object")
                        pass
                    self.state = 'line'
                    self.motion = Object()
                    self.hierarchy['motion'] = self.motion
                    self.fileLine += 1
                    self.fileChar = 1
                    continue
                for c in self.line:
                    self.fileChar += 1
                    self.parseChar(c)
                    pass
                self.fileLine += 1
                self.fileChar = 0
                pass
            pass
        return self.hierarchy

    def error(self, msg):
        raise Exception(
            "{}:{}:{}: {}:\n\t{}".format(
                self.filePath,
                self.fileLine,
                self.startChar,
                msg,
                self.line
            )
        )
    
    def parseChar(self, c):
        if self.state == 'start':
            if c.isspace():
                # ignore leading whitespace
                return
            elif c in ('{', '}'):
                # syntax character
                self.startChar = self.fileChar
                self.parseSyntax(c)
                pass
            else:
                # token
                self.startChar = self.fileChar
                self.token = c
                self.state = 'token'
                pass
            pass
        elif self.state == 'token':
            if c.isspace():
                # end of the token
                self.parseToken(self.token)
                self.state = 'start'
                pass
            else:
                self.token += c
                pass
            pass
        else:
            self.error("unknown state {}".format(self.state))
            pass
        pass

    def toNumber(self, token):
        try:
            return float(token)
        except ValueError:
            self.error("expected a float but got ({})".format(token))
            pass
        pass

    def toInteger(self, token):
        try:
            return int(token)
        except ValueError:
            self.error("expected an integer but got ({})".format(token))
            pass
        pass

    def stackPush(self, obj):
        if obj['type'] in ('ROOT', 'JOINT'):
            self.objects.append(obj)
            pass
        if self.objStack:
            obj.parent = self.objStack[-1]
            pass
        self.objStack.append(obj)
        pass

    def stackPop(self):
        obj = self.objStack[-1]
        if obj['type'] in ('ROOT', 'JOINT'):
            if 'CHANNELS' in obj:
                self.channels += len(obj['CHANNELS'])
                pass
            pass
        self.objStack.pop()
        if self.objStack:
            parent = self.objStack[-1]
            if obj['type'] in obj:
                # unwrap object and add directly to parent
                parent[obj['type']] = obj[obj['type']]
            else:
                # append the object to the parent's children list
                parent.append(obj)
                pass
            pass
        pass

    def parseToken(self, token):
        if token == 'HIERARCHY':
            if len(self.objStack) > 0:
                self.error("multiple HIERARCHY objects are not allowed")
                pass
            self.hierarchy = Object(token)
            self.stackPush(self.hierarchy)
            return
        elif token == 'ROOT':
            if len(self.objStack) > 1:
                self.error("nested ROOT objects are not allowed")
                pass
            self.stackPush(Object(token))
            return
        elif token in ('JOINT', 'End'):
            if len(self.objStack) < 2:
                self.error("missing parent object")
                pass
            self.stackPush(Object(token))
            return
        elif token in ('OFFSET', 'CHANNELS'):
            if len(self.objStack) < 2:
                self.error("missing parent object")
                pass
            self.stackPush(Object(token))
            return

        if len(self.objStack) < 1:
            self.error("unexpected input")
            pass

        obj = self.objStack[-1]
        if obj['type'] in ('ROOT', 'JOINT', 'End'):
            if 'name' not in obj:
                obj['name'] = token
                return
            pass
        if obj['type'] == 'OFFSET':
            if 'OFFSET' not in obj:
                obj['OFFSET'] = []
                pass
            obj['OFFSET'].append(self.toNumber(token))
            if len(obj['OFFSET']) == 3:
                self.stackPop()
                pass
            return
        if obj['type'] == 'CHANNELS':
            if 'count' not in obj:
                obj['count'] = self.toInteger(token)
                if obj['count'] < 1:
                    self.error("CHANNELS count must be positive")
                    pass
                return
            if 'CHANNELS' not in obj:
                obj['CHANNELS'] = []
                pass
            obj['CHANNELS'].append(token)
            if len(obj['CHANNELS']) == obj['count']:
                self.stackPop()
                pass
            return
        self.error("unexpected input")
        pass

    def parseSyntax(self, s):
        if len(self.objStack) < 1:
            self.error("unexpected input")
            pass
        obj = self.objStack[-1]
        if s == '{':
            if obj.opened:
                self.error("unexpected open curly bracket")
                pass
            obj.opened = True
            return
        elif s == '}':
            if not obj.opened:
                self.error("unexpected close curly bracket")
                pass
            obj.opened = False
            self.stackPop()
            return
        self.error("unexpected input")
        pass

    def parseLine(self, line):
        if line.startswith('Frame Time:'):
            self.motion['frameTime'] = self.toNumber(line[12:])
            return
        if line.startswith('Frames:'):
            self.motion['frames'] = self.toNumber(line[7:])
            return
        channels = []
        for val in line.split():
            channels.append(self.toNumber(val))
            pass
        if self.channels != len(channels):
            self.error(
                "expected {} channel values, but got {}".format(self.channels, len(channels))
            )
            pass
        self.motion.append(channels, to='data')
        pass
    pass
