/*
 ***** BEGIN LICENSE BLOCK *****
 
 This file is part of the Zotero Data Server.
 
 Copyright © 2018 Center for History and New Media
 George Mason University, Fairfax, Virginia, USA
 http://zotero.org
 
 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.
 
 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.
 
 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <http://www.gnu.org/licenses/>.
 
 ***** END LICENSE BLOCK *****
 */

const util = require('util');
const execFile = util.promisify(require('child_process').execFile);
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const AWS = require('aws-sdk');
const fs = require('fs');

const PdfProcessor = function (options) {
	this.s3Client = new AWS.S3(options.s3);
};

module.exports = PdfProcessor;

/**
 * Download and extract PDF data with 'pdftotext'
 *
 * @param uploadId
 * @return {Promise<Object>}
 */
PdfProcessor.prototype.extract = async function (uploadId) {
	let data = await this.s3Client.getObject({Key: uploadId}).promise();
	
	let pdfPath = path.join(
		os.tmpdir(),
		'recognizer_pdftotext_' + crypto.randomBytes(16).toString('hex')
	);
	
	fs.writeFileSync(pdfPath, data.Body);
	
	let bin = path.join('pdftools', 'pdftotext-');
	
	let platform = os.platform();
	let arch = os.arch();
	
	if (platform === 'linux') {
		if (arch === 'x86') {
			bin += 'linux-i686';
		}
		else if (arch === 'x64') {
			bin += 'linux-x86_64';
		}
		else {
			throw new Error('Invalid architecture');
		}
	}
	else if (platform === 'darwin') {
		bin += 'mac';
	}
	else if (platform === 'win32') {
		bin += 'win.exe';
	}
	else {
		throw new Error('Invalid architecture');
	}
	
	let outputPath = path.join(
		os.tmpdir(),
		'recognizer_pdftotext_' + crypto.randomBytes(16).toString('hex')
	);
	
	let datadir = path.resolve('pdftools/poppler-data');
	
	let a = await execFile(
		bin,
		['-json', '-datadir', datadir, pdfPath, outputPath],
		{encoding: "utf8"}
	);
	
	let json = fs.readFileSync(outputPath);
	
	fs.unlinkSync(pdfPath);
	fs.unlinkSync(outputPath);
	
	json = JSON.parse(json.toString());
	
	return json;
};
