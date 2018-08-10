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

const utils = require('./utils');

const Metadata = function (options) {
	this.db = options.db;
	this.authors = options.authors;
};

module.exports = Metadata;

/**
 * Extract metadata from the actual PDF file metadata
 * @param doc
 * @return {Promise<void>}
 */
Metadata.prototype.extract = async function (doc) {
	let result = {};
	
	let dois = [];
	let isbns = [];
	
	let normText = utils.normalize(doc.text);
	
	// If PDF metadata has a title, validate its authors against two first pages.
	// We try to avoid references because they contain many author names
	let normTextAuthors = doc.pages[0].text;
	if (doc.pages.length >= 2) {
		normTextAuthors += doc.pages[1].text;
	}
	normTextAuthors = utils.normalize(normTextAuthors);
	
	for (let key in doc.metadata) {
		if (key.toLowerCase() === 'title') {
			let normTitle = utils.normalize(doc.metadata[key]);
			if (normTitle.length < 15) continue;
			
			if (normText.indexOf(normTitle) >= 0) {
				result.title = doc.metadata[key].trim();
			}
			
			// Even if metadata has a valid article title, it not always belongs to the current PDF,
			// therefore we have to validate authors
			let detection = await this.db.getDoiByNormTitle(normTitle, normTextAuthors, true);
			if (detection && detection.status === 'single' && detection.authorsDetected) {
				result.title = doc.metadata[key].trim();
				result.doi = detection.doi;
			}
		}
		
		// Extract DOIs from every field in PDF metadata. It's not that rare for them
		// to appear in unexpected places like:
		// "Keywords": "doi:10.1103/PhysRev.4.345 url:http://dx.doi.org/10.1103/PhysRev.4.345",
		dois = dois.concat(utils.extractDois(doc.metadata[key]));
		
		// If DOI is found in one of the expected fields, just use it
		if (['doi', 'wps-articledoi'].includes(key.toLowerCase())) {
			let doi = doc.metadata[key];
			if (/10.\d{4,9}\/[^\s]*[^\s\.,]/.test(doi)) {
				result.doi = doi;
			}
		}
		
		// Extract ISBNs from every field in PDF metadata. It's not that rare for them
		// to appear in unexpected places like:
		// "Keywords": "ISBN-13:    9781862391246"
		isbns = isbns.concat(utils.extractIsbns(doc.metadata[key]));
		
		// If ISBN is found in one of the expected fields, just use it
		if (['isbn'].includes(key.toLowerCase())) {
			let isbn = doc.metadata[key];
			isbn = isbn.replace(/[^0-9X]/gi, '');
			if (isbn.length === 10 || isbn.length === 13) {
				result.isbn = isbn;
			}
		}
		
		if (key.toLowerCase().indexOf('author') === 0) { // author / authors
			let authors = doc.metadata[key];
			// Extract authors when names are in typical order: John P. Smith
			let res = await this.authors.extractFromStringType1(authors);
			if (res) {
				result.authors = res;
			}
			else {
				// Extract authors when the last name goes first: Smith, John
				res = await this.authors.extractFromStringType2(authors);
				if (res) {
					result.authors = res;
				}
			}
		}
	}
	
	// Use the unexpected DOI only if it's the only DOI in metadata
	if (!result.doi && dois.length === 1) {
		result.doi = dois[0];
	}
	
	
	// Use the unexpected ISBN only if it's the only ISBN in metadata
	if (!result.isbn && isbns.length === 1) {
		result.isbn = isbns[0];
	}
	
	return result;
};
