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

const XRegExp = require('xregexp');
const cld = require('cld');

/**
 * Decomposes all accents and ligatures,
 * filters out symbols that aren't alphabetic,
 * and lowercases alphabetic symbols.
 * @param text
 * @return {string | *}
 */
exports.normalize = function (text) {
	let rx = XRegExp('[^\\pL]', 'g');
	text = XRegExp.replace(text, rx, '');
	text = text.normalize('NFKD');
	text = XRegExp.replace(text, rx, '');
	text = text.toLowerCase();
	return text;
};

/**
 * Run Compact Language Detector
 * @param text
 * @return {Promise<any>}
 */
exports.detectLanguage = function (text) {
	return new Promise(function (resolve, reject) {
		cld.detect(text, function (err, result) {
			resolve(result);
		});
	});
};

// https://stackoverflow.com/a/5515960
exports.byteLength = function (str) {
	// Matches only the 10.. bytes that are non-initial characters in a multi-byte sequence.
	let m = encodeURIComponent(str).match(/%[89ABab]/g);
	return str.length + (m ? m.length : 0);
};

// https://stackoverflow.com/a/23161438
exports.isValidIsbn = function (str) {
	let sum, weight, digit, check, i;
	
	str = str.replace(/[^0-9X]/gi, '');
	
	if (str.length != 10 && str.length != 13) {
		return false;
	}
	
	if (str.length == 13) {
		sum = 0;
		for (i = 0; i < 12; i++) {
			digit = parseInt(str[i]);
			if (i % 2 == 1) {
				sum += 3 * digit;
			}
			else {
				sum += digit;
			}
		}
		check = (10 - (sum % 10)) % 10;
		return (check == str.slice(-1));
	}
	
	if (str.length == 10) {
		weight = 10;
		sum = 0;
		for (i = 0; i < 9; i++) {
			digit = parseInt(str[i]);
			sum += weight * digit;
			weight--;
		}
		check = 11 - (sum % 11);
		if (check == 10) {
			check = 'X';
		}
		return (check == str.slice(-1).toUpperCase());
	}
};

// From http://www.dispersiondesign.com/articles/isbn/converting_isbn10_to_isbn13
exports.convertISBN10 = function (isbn10) {
	let chars = isbn10.split("");
	chars.unshift("9", "7", "8");
	chars.pop();
	
	let i = 0;
	let sum = 0;
	for (i = 0; i < 12; i += 1) {
		sum += chars[i] * ((i % 2) ? 3 : 1);
	}
	let check_digit = (10 - (sum % 10)) % 10;
	chars.push(check_digit);
	
	let isbn13 = chars.join("");
	return isbn13;
};

exports.isUpper = function (c) {
	if (!c) return false;
	return c === c.toString().toUpperCase() && XRegExp('\\p{Letter}').test(c)
};

exports.isBreakSection = function (lineText) {
	let breakSections = [
		'introduction',
		'contents',
		'tableofcontent',
		'tableofcontents'
	];
	return lineText && lineText[0] === lineText[0].toUpperCase() &&
		breakSections.includes(lineText.replace(/[^A-Za-z]/g, '').toLowerCase());
};

exports.getTopValue = function (items) {
	let obj = {};
	for (let item of items) {
		obj[item.key] = item.value + (obj[item.key] || 0);
	}
	
	let top = 0;
	let topCount = 0;
	for (let key in obj) {
		let value = obj[key];
		key = parseFloat(key);
		if (value > topCount) {
			top = key;
			topCount = value;
		}
	}
	return top;
};

exports.extractIsbns = function (text) {
	let isbns = [];
	let rx = /(SBN|sbn)[ \u2014\u2013\u2012-]?(10|13)?[: ]*([0-9X][0-9X \u2014\u2013\u2012-]+)/g;
	let m;
	while (m = rx.exec(text)) {
		let isbn = m[3].replace(/[^0-9X]/gi, '');
		
		// If ISBN-10 or ISBN-13 is found
		if (isbn.length === 10 || isbn.length === 13) {
			isbns.push(isbn);
			continue;
		}
		
		// Sometimes ISBNs aren't separated with a space
		// If two ISBN-10 or two ISBN-13 detected
		if (isbn.length === 20 || isbn.length === 26) {
			// Just slice the first one
			isbns.push(isbn.slice(0, isbn.length / 2));
			continue;
		}
		
		// If a mixed ISBN-10 and ISBN-13 pair found, we don't know what is the length of the first one
		if (isbn.length === 23) {
			// Slice both ISBNs, validate, and one of them should be correct
			let isbn13 = isbn.slice(0, 13);
			let isbn10 = isbn.slice(0, 10);
			if (utils.isValidIsbn(isbn13)) isbns.push(isbn13);
			if (utils.isValidIsbn(isbn10)) isbns.push(isbn10);
		}
	}
	
	let isbns2 = new Set();
	for (let isbn of isbns) {
		if (isbn.length === 10) {
			isbn = exports.convertISBN10(isbn);
		}
		isbns2.add(isbn);
	}
	return Array.from(isbns2);
};

/**
 * Sometimes DOI extraction results in an incorrect DOI because
 * it was in round or square brackets. But DOI can have brackets too.
 * This function analyses opening and closing brackets and detects
 * where is the actual end of the DOI
 * i.e "(10.1016/s1474-5151(03)00108-7)" is extracted as "10.1016/s1474-5151(03)00108-7)"
 * and this functions fixes it to "10.1016/s1474-5151(03)00108-7"
 * @param text
 * @return {string}
 */
exports.cleanInvalidParentheses = function (text) {
	let text2 = '';
	let depth = 0;
	for (let c of text) {
		if ([']', ')'].includes(c)) {
			depth--;
			if (depth < 0) break;
		}
		if (['[', '('].includes(c)) {
			depth++;
		}
		text2 += c;
	}
	return text2;
};

exports.extractDois = function (text) {
	let dois = new Set();
	
	let m = text.match(/10.\d{4,9}\/[^\s]*[^\s\.,]/g);
	if (!m) return [];
	
	for (let doi of m) {
		// Clean "10.1016/s1474-5151(03)00108-7)"
		doi = exports.cleanInvalidParentheses(doi);
		
		// ASCII letters in DOI are case insensitive
		doi = doi.split('').map(c => (c >= 'A' && c <= 'Z') ? c.toLowerCase() : c).join('');
		
		// Deduplicate DOIs
		dois.add(doi);
	}
	
	return Array.from(dois);
};
