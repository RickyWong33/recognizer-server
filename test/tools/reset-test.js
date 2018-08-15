const path = require('path');
const fs = require('fs');
const jsonDiff = require('json-diff');
const utils = require('./utils');

async function resetTest(id) {
	let outputFile = path.resolve(__dirname, '../pdftest-data/' + id);
	
	let content = fs.readFileSync(outputFile + '-in.json', 'utf8');
	content = JSON.parse(content);
	
	let res = await utils.query(content);
	delete res.timeMs;
	
	let outJson = fs.readFileSync(outputFile + '-out.json', 'utf8');
	outJson = JSON.parse(outJson);
	
	if (jsonDiff.diff(outJson, res)) {
		console.log(jsonDiff.diffString(outJson, res));
		
		let inPath = outputFile + '-in.json';
		let outPath = outputFile + '-out.json';
		let txtPath = outputFile + '.txt';
		
		let inJson = JSON.stringify(content, null, 2);
		outJson = JSON.stringify(res, null, 2);
		let txt = utils.jsonToText(content);
		
		fs.writeFileSync(inPath, inJson);
		fs.writeFileSync(outPath, outJson);
		fs.writeFileSync(txtPath, txt);
	}
}

async function main() {
	if (process.argv.length < 3) {
		console.log(
			'Usage:\n' +
			'node reset-test.js 007\n' +
			'node reset-test.js 007 014 028\n' +
			'node reset-test.js all'
		);
		return;
	}
	
	let ids = process.argv.slice(2);
	
	if (ids[0] === 'all') {
		ids = utils.getAllIds('../pdftest-data');
	}
	
	for (let id of ids) {
		console.log(id);
		await resetTest(id);
	}
}

main();
