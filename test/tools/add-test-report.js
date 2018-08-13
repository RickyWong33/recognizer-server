const path = require('path');
const fs = require('fs');
const utils = require('./utils');

async function main() {
	if (process.argv.length !== 3) {
		console.log('Usage:\nnode add-test-report.js /path/to/report.json');
		return;
	}
	
	let reportPath = process.argv[2];
	
	let content = fs.readFileSync(reportPath, 'utf8');
	content = JSON.parse(content);
	content = content.json;
	
	let res = await utils.query(content);
	res.timeMs = undefined;
	console.log(res);
	
	let id = utils.getNextId(path.resolve(__dirname, '../pdftest-data'));
	
	let outputFile = path.resolve(__dirname, '../pdftest-data/' + id);
	
	let inPath = outputFile + '-in.json';
	let outPath = outputFile + '-out.json';
	let txtPath = outputFile + '.txt';
	
	let inJson = JSON.stringify(content, null, 2);
	let outJson = JSON.stringify(res, null, 2);
	let txt = utils.jsonToText(content);
	
	fs.writeFileSync(inPath, inJson);
	fs.writeFileSync(outPath, outJson);
	fs.writeFileSync(txtPath, txt);
	
	console.log('Added test ' + id);
}

main();
