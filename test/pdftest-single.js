const fs = require('fs');
const request = require('request');
const jsonDiff = require('json-diff');
const config = require('config');

// Run "node ./test/pdftest-single.js 012"
async function main() {
	function query(data) {
		return new Promise(function (resolve, reject) {
			request({
				url: 'http://localhost:' + config.get('port') + '/recognize',
				method: 'POST',
				json: data,
			}, function (err, res) {
				if (err || res.statusCode !== 200) return reject(err);
				resolve(res.body);
			});
		});
	}
	
	let dataPath = __dirname + '/pdftest-data/';
	
	let files = fs.readdirSync(dataPath);
	files.sort();
	
	let id = process.argv[2];
	console.log(id);
	
	let inPath = dataPath + id + '-in.json';
	let outPath = dataPath + id + '-out.json';
	
	let inJson = fs.readFileSync(inPath, 'utf8');
	inJson = JSON.parse(inJson);
	let res = await query(inJson);
	
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
