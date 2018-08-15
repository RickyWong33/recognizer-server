const path = require('path');
const fs = require('fs');
const jsonDiff = require('json-diff');
const utils = require('./utils');

async function main() {
	if (process.argv.length !== 3) {
		console.log('Usage:\nnode query-test.js 007');
		return;
	}
	
	let id = process.argv[2];
	
	console.log(id);
	let dataPath = path.resolve(__dirname, '../pdftest-data/' + id);
	
	let inPath = dataPath + '-in.json';
	let outPath = dataPath + '-out.json';
	
	let inJson = fs.readFileSync(inPath, 'utf8');
	inJson = JSON.parse(inJson);
	let res = await utils.query(inJson);
	
	delete res.timeMs;
	
	let outJson = fs.readFileSync(outPath, 'utf8');
	outJson = JSON.parse(outJson);
	
	if (jsonDiff.diff(outJson, res)) {
		console.log(jsonDiff.diffString(outJson, res));
	}
	else {
		console.log(res);
	}
}

main();
