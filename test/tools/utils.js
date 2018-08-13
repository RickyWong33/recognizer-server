const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const {spawnSync} = require('child_process');
const tmp = require('tmp');
const request = require('request');

exports.query = function (json) {
	return new Promise(function (resolve, reject) {
		let data = JSON.stringify(json);
		zlib.gzip(data, function (error, result) {
			request({
				url: 'http://localhost:8003/recognize',
				method: 'POST',
				body: result,
				timeout: 0,
				headers: {
					'content-encoding': 'gzip',
					'content-type': 'application/json'
				}
			}, function (err, res) {
				if (err) return reject(err);
				resolve(JSON.parse(res.body));
			});
		});
	});
};

exports.pdfToJson = function (pdfFile) {
	let pages = 5;
	
	let tmpFile = tmp.fileSync();
	
	let platform;
	
	if (os.platform() === 'win32') {
		platform = 'win.exe';
	}
	else if (os.platform() === 'darwin') {
		platform = 'mac';
	}
	else if (os.platform() === 'linux') {
		if (os.arch() === 'x32') {
			platform = 'linux-i686';
		}
		else if (os.arch() === 'x64') {
			platform = 'linux-x86_64';
		}
	}
	
	let exec = spawnSync(path.resolve(__dirname, 'pdftools/pdftotext-' + platform), [
		'-json',
		'-l', pages,
		'-datadir', path.resolve(__dirname, 'pdftools/poppler-data'),
		pdfFile,
		tmpFile.name
	]);
	
	console.log(exec.stdout.toString());
	console.log(exec.stderr.toString());
	
	if (exec.status !== 0) {
		throw new Error('pdftotext error');
	}
	
	let json = fs.readFileSync(tmpFile.name, 'utf8');
	
	tmpFile.removeCallback();
	
	return JSON.parse(json);
};

exports.getNextId = function (dir) {
	let files = fs.readdirSync(dir);
	
	files.sort().reverse();
	
	let id = files[0].slice(0, 3);
	
	id = parseInt(id);
	id++;
	
	id = id.toString();
	
	if (id.length === 1) {
		id = '00' + id;
	}
	else if (id.length === 2) {
		id = '0' + id;
	}
	
	return id;
};

exports.jsonToText = function (json) {
	let text = '';
	if (!json.pages) return null;
	for (let p of json.pages) {
		for (let f of p[2]) {
			for (let b of f[0]) {
				for (let l of b[4]) {
					for (let w of l[0]) {
						text += w[13] + (w[5] ? ' ' : '');
					}
				}
				text += '\n';
			}
			text += '\n';
		}
		text += '\n';
	}
	return text;
};
