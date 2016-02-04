const execFile = require('child_process').execFile;
const fs = require('fs');
const semver = require('semver');
const PACKAGE_VERSION = '0.0.1';

const CURRENT_VERSION = {
	major: semver.major(PACKAGE_VERSION),
	minor: semver.minor(PACKAGE_VERSION),
	patch: semver.patch(PACKAGE_VERSION)
};

module.exports = facade;

function facade(args) {
	loadDataFile(function(err, packageSnapshots) {
		if(err) {
			return console.log('err', err);
		} else {
			execNpmGlobalDependenciesList(function(err, globallyInstalledPackages) {
				if (err) {
					return console.log('err', err);
				}
				if (globallyInstalledPackages === '') {
					return console.log('no globallyInstalledPackages', globallyInstalledPackages);
				}
				const packagesThatCanBeInstalled = filterPackageSnapshotsThatCanBeUpdated(packageSnapshots);
				//In the future the below logic can be more complex
				//There will be ways to update workspace via migrations
				//And there will be options for upgrading minor or major versions
				const snapshotKey = packagesThatCanBeInstalled.pop();
				installSnapshot(snapshotKey, callbackAllInstalled);
			});
		}
	});	
}

function callbackAllInstalled(err, data) {
	console.log(err, data);
	execNpmGlobalDependenciesList(function(err, data) {
		console.log(err, data);
	});
}

function execNpmGlobalDependenciesList(callback) {
	var cliArgs = ['list', '-g', '--json', '--depth', '0'];
	execNpmWrapper(cliArgs, callback);
}

function execNpmWrapper(cliArgs, callback) {
	execFile('npm', cliArgs, function(err, stdout, stderr) {
		if (err) {
			return callback(err);
		} else if (stderr) {
			return callback(stderr);
		}
		stdout = stdout.trim();
		if (stdout === '') {
			return callback(null, "");
		}
		var json;
		try {
			json = JSON.parse(stdout);
		} catch(e) {
			callback("JSON parsing error");
		}
		callback(null, json);
	});
}

function filterPackageSnapshotsThatCanBeUpdated(packageSnapshots) {
	const patchLevel = packageSnapshots[CURRENT_VERSION.major + '.x'][CURRENT_VERSION.major + '.' + CURRENT_VERSION.minor + '.x'];
	const patchLevelAllVersionKeys = Object.keys(patchLevel);
	const patchLevelGreaterVersionKeys = patchLevelAllVersionKeys.filter(function(key) {
		if (key === 'meta') {
			return false;
		}
		if (!semver.gt(key, PACKAGE_VERSION)) {
			return false;
		}
		return true;
	});
	return patchLevelGreaterVersionKeys.sort(semver.compare);
}

function installPackages(packageSnapshots, callbackAllInstalled) {
	const packages = Object.keys(packageSnapshots).map(function(key) {
		return key + '@' + packageSnapshots[key];
	});
	const cmd = ['install', '-g', '--json'].concat(packages).join(' ');
	execNpmWrapper(['install', '-g', '--json'].concat(packages), callbackAllInstalled);
}

function installSnapshot(snapshotKey, callbackAllInstalled) {
	fs.readFile('snapshots/' + CURRENT_VERSION.major + '.x/' + snapshotKey + '.json', function(err, data) {
		var json;
		try {
			json = JSON.parse(data.toString());
		} catch (e) {
			console.log('installSnapshot no json file');
			return;
		}
		installPackages(json, callbackAllInstalled);
	});
}

function loadDataFile(callback) {
	fs.readFile('data.json', function(err, data) {
	  if (err) {
	  	return callback(err);
	  }
	  var json;
	  try {
	  	json = JSON.parse(data.toString());
	  } catch(e) {
	  	return callback(e);
	  }
	  callback(null, json);
	});
}
