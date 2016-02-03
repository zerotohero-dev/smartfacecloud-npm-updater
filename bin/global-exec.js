#!/usr/bin/env node

var thisPackage = require('../index.js');
var args = require('minimist')(process.argv.slice(2));
thisPackage(args);