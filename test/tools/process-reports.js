const path = require('path');
const fs = require('fs');
const utils = require('./utils');

async function main() {
	if (process.argv.length !== 4) {
		console.log(
			'Usage:\n' +
			'node process-reports.js reports/dir/ output/dir/'
		);
		return;
	}
	
	let reportsDir = process.argv[2];
	let outputDir = process.argv[3];
	
	let files = fs.readdirSync(reportsDir);
	files.sort().reverse();
	
	let file;
	while (file = files.pop()) {
		console.log('Processing ' + file);
		if (file.slice(-4) !== 'json') continue;
		let jsonPath = path.resolve(reportsDir, file);
		let txtPath = path.resolve(outputDir, file.slice(0, 24) + '.txt');
		
		let contents = fs.readFileSync(jsonPath);
		
		contents = JSON.parse(contents);
		
		let res = await utils.query(contents.json);
		
		let txt = '';
		
		txt += 'DESCRIPTION:\n' + (contents.description || '');
		txt += '\n\n\n';
		txt += 'USER SENT:\n' + JSON.stringify(contents.metadata, null, 2);
		txt += '\n\n\n';
		txt += 'CURRENT RECOGNIZER RETURNED:\n' + JSON.stringify(res, null, 2);
		txt += '\n\n\n';
		txt += 'INTERNAL PDF METADATA:\n' + JSON.stringify(contents.json.metadata, null, 2);
		txt += '\n\n\n';
		txt += utils.jsonToText(contents.json);
		
		fs.writeFileSync(txtPath, txt);
	}
}

main();
