const path = require('path');
const fs = require('fs');
const utils = require('./utils');

async function main() {
	if (process.argv.length !== 3) {
		console.log('Usage:\nnode add-test-pdf.js /path/to/file.pdf');
		return;
	}
	
	let pdfFile = process.argv[2];
	
	let json = utils.pdfToJson(pdfFile);
	
	let res = await utils.query(json);
	console.log(res);
	
	let id = utils.getNextId(path.resolve(__dirname, '../pdftest-data'));
	
	let outputFile = path.resolve(__dirname, '../pdftest-data/' + id);
	
	let pdfPath = outputFile + '.pdf';
	let inPath = outputFile + '-in.json';
	let outPath = outputFile + '-out.json';
	let txtPath = outputFile + '.txt';
	
	let inJson = JSON.stringify(json, null, 2);
	let outJson = JSON.stringify(res, null, 2);
	let txt = utils.jsonToText(json);
	
	fs.copyFileSync(pdfFile, pdfPath);
	fs.writeFileSync(inPath, inJson);
	fs.writeFileSync(outPath, outJson);
	fs.writeFileSync(txtPath, txt);
	
	console.log('Added test ' + id);
}

main();
