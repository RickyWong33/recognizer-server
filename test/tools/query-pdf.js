const utils = require('./utils');

async function main() {
	if (process.argv.length !== 3) {
		console.log('Usage:\nnode query-pdf.js /path/to/file.pdf');
		return;
	}
	
	let pdfFile = process.argv[2];
	
	let json = utils.pdfToJson(pdfFile);
	let res = await utils.query(json);
	console.log(res);
}

main();
