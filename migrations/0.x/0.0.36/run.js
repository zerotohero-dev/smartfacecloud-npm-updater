const fs = require('fs');
const path = require('path');

module.exports = function() {
	const WORKSPACE_DIR = '/home/ubuntu/workspace';
	const SOURCE_FILE = path.join(__dirname, 'defaults.xml');
	const TARGET_FILE = path.join(WORKSPACE_DIR, 'config', 'defaults.xml');
	const content = fs.readFileSync(SOURCE_FILE, {encoding: 'utf8'});
	fs.writeFile(TARGET_FILE, content, {encoding: 'utf8'});
};