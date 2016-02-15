const execFile = require('child_process').execFile;
const fs = require('fs');
const path = require('path');
const semver = require('semver');
const PACKAGE_VERSION = '0.0.14';

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
				if (!(packagesThatCanBeInstalled instanceof Array)) {
					return console.log('packagesThatCanBeInstalled is not an Array');
				} else if (packagesThatCanBeInstalled.length === 0) {
					return console.log('packagesThatCanBeInstalled has length zero');
				}
				//In the future the below logic can be more complex
				//There will be ways to update workspace via migrations
				//And there will be options for upgrading minor or major versions
				const snapshotKey = packagesThatCanBeInstalled.pop();
				installSnapshot(snapshotKey, globallyInstalledPackages.dependencies);
			});
		}
	});	
}

function buildListOfPackagesWithTagsToInstall(packagesToInstall) {
	return packagesToInstall.map(function(item){
		return item.name + '@' + item.version;
	});
}

function callbackAllInstalled(packagesToInstall, err, data) {
	execNpmGlobalDependenciesList(function(err, globallyInstalledPackages) {
		if (err) {
			return console.log('err', err);
		}
		packagesToInstall.forEach(function(elem){
			elem.installed = false;
			if (globallyInstalledPackages.dependencies && 
					globallyInstalledPackages.dependencies[elem.name] &&
					globallyInstalledPackages.dependencies[elem.name].version &&
					globallyInstalledPackages.dependencies[elem.name].version === elem.version) {
				elem.installed = true;
			}
		});
		process.stdout.write('smartface-cloud-updater has finished processing packagesInstalled');
		process.stdout.write(JSON.stringify({
			packagesInstalled: packagesToInstall
		}));
		process.stdout.write('smartface-cloud-updater json was sent');
	});
}

function execNpmGlobalDependenciesList(callback) {
	var cliArgs = ['list', '-g', '--json', '--depth', '0'];
	execNpmWrapper(cliArgs, callback, function(stdout) {
		var pos = stdout.indexOf('npm ERR!');
		if (pos !== -1) {
			stdout = stdout.substr(0, pos).trim();
		}
		return stdout;
	});
}

function execNpmWrapper(cliArgs, callback, parser) {
	execFile('npm', cliArgs, function(err, stdout, stderr) {
		if (err) {
			if (stderr.indexOf('npm ERR! max depth reached') === -1) {
				return callback(err);
			}
		} else if (stderr) {
			if (stderr.indexOf('npm ERR! max depth reached') === -1) {
				return callback(stderr);
			}
		}
		stdout = stdout.trim();
		if (stdout === '') {
			return callback(null, "");
		}
		if (parser) {
			stdout = parser(stdout);
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
		if (!semver.gte(key, PACKAGE_VERSION)) {
			return false;
		}
		return true;
	});
	return patchLevelGreaterVersionKeys.sort(semver.compare);
}

function installPackages(packagesToInstall) {
	const packages = buildListOfPackagesWithTagsToInstall(packagesToInstall);
	if (packages.length === 0) {
		callbackAllInstalled(packagesToInstall);
	}
	execNpmWrapper(['install', '-g', '--json'].concat(packages), callbackAllInstalled.bind(null, packagesToInstall));
}

function installSnapshot(snapshotKey, globallyInstalledPackages) {
	const dataFilePath = path.join(__dirname, 'snapshots', CURRENT_VERSION.major + '.x', snapshotKey + '.json');
	fs.readFile(dataFilePath, function(err, data) {
		if (err) {
			return console.error(err);
		}
		var json;
		try {
			json = JSON.parse(data.toString());
		} catch (e) {
			console.log('installSnapshot no json file', e);
			return;
		}
		const packagesToInstall = filterUninstalledSnapshotPackages(globallyInstalledPackages, json);
		installPackages(packagesToInstall);
	});
}

function filterUninstalledSnapshotPackages(globallyInstalledPackages, snapshotPackages) {
	return Object.keys(snapshotPackages).filter(function(key){
		if (!globallyInstalledPackages[key]) {
			return true;
		}
		if (semver.lt(globallyInstalledPackages[key].version, snapshotPackages[key])) {
			return true;
		}
		return false;
	}).map(function(key){
		return {
			name: key,
			version: snapshotPackages[key]
		};
	});
}

function loadDataFile(callback) {
	const dataFilePath = path.join(__dirname, 'data.json');
	fs.readFile(dataFilePath, function(err, data) {
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
