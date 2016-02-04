#!/usr/bin/env node

var thisPackage = require('../index.js');
var args = require('minimist')(process.argv.slice(2));
args.workspacePath = args.workspacePath || '/home/ubuntu/workspace';
thisPackage(args);