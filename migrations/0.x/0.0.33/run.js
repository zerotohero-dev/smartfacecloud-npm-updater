const fs = require('fs');
const path = require('path');

module.exports = function() {
	const WORKSPACE_DIR = '/home/ubuntu/workspace';
	const SOURCE_FILE = path.join(__dirname, 'defaults.xml');
	const TARGET_FILE = path.join(WORKSPACE_DIR, 'config', 'defaults.xml');

	try{
		fs.unlinkSync(TARGET_FILE);
	} catch(e) {
		//skip
	}

	fs.renameSync(SOURCE_FILE, TARGET_FILE);
};