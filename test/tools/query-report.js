const fs = require('fs');
const utils = require('./utils');

async function main() {
	if (process.argv.length !== 3) {
		console.log('Usage:\nnode query-report.js /path/to/report.json');
		return;
	}
	
	let reportPath = process.argv[2];
	
	let reportJson = fs.readFileSync(reportPath, 'utf8');
	reportJson = JSON.parse(reportJson);
	let json = reportJson.json;
	
	let res = await utils.query(json);
	console.log(res);
}

main();
