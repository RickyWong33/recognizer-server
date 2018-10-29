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

const XXHash = require('xxhash');
const Int64LE = require("int64-buffer").Int64LE;
const mysql2Promise = require('mysql2/promise');
const config = require('config');
const utils = require('./utils');

var mysql;

const Db = function () {

};

module.exports = Db;

/**
 * Initializes SQLite databases
 * @return {Promise<void>}
 */
Db.prototype.init = async function () {
	if (!mysql) {
		mysql = await mysql2Promise.createConnection(config.get('mysql'));
	}
};

/**
 * Normalizes and calculates hash on journal name, and tries to find it in journals database.
 * This is useful when we need to distinguish journal article name from other strings
 * i.e. to make sure the string extracted from header or footer is actually a journal name
 * @param journal
 * @return {Promise<boolean>}
 */
Db.prototype.journalExists = async function (journal) {
	journal = utils.normalize(journal);
	let hash = XXHash.hash64(new Buffer(journal), 0, 'buffer');
	hash = Int64LE(hash).toString();
	let res = await mysql.query('SELECT * FROM journal WHERE hash = ? LIMIT 1', [hash]);
	return !!res[0].length;
};

/**
 * Normalizes and calculates a hash of a word, and tries to find it in a database.
 * The database has statistical information about most of the words
 * and returns three parameters about the word:
 * a - how common between titles
 * b - how common between first names
 * c - how common between last names
 * This allows to identify if the word is more likely to be a general word or an author name
 * @param word
 * @return {Promise<*>}
 */
Db.prototype.getWord = async function (word) {
	word = utils.normalize(word);
	let hash = XXHash.hash64(new Buffer(word), 0, 'buffer');
	hash = Int64LE(hash).toString();
	let res = await mysql.query('SELECT a, b, c FROM word WHERE hash = ? LIMIT 1', [hash]);
	return res[0][0];
};

/**
 * Resolves title to DOI and validates authors.
 * Database only keeps author last name hash and length.
 *
 * We want to do as little as possible doidata data queries,
 * because there is a limit of queries per second, which depends on
 * disk I/O
 * @param title
 * @param text
 * @return {Promise<*>}
 */
Db.prototype.getDoiByNormTitle = async function (title, text) {
	let title_hash = XXHash.hash64(new Buffer(title), 0, 'buffer');
	title_hash = Int64LE(title_hash).toString();
	
	let res = await mysql.query('SELECT * FROM doidata WHERE title_hash = ? LIMIT 2', [title_hash]);
	if (!res[0].length) return null;
	
	let row1 = res[0][0];
	let row2 = res[0][1];
	
	// If more than one row encountered we can't reliably distinguish which one is the right one,
	// therefore it's better to avoid resolving this title to DOI. But it's still important to inform
	// the caller that the title was found in database
	// Todo: But it's possible to utilize the detected title for title extraction
	if (row2) {
		return {status: 'multi', title};
	}
	
	let authorsCount = 0;
	let authorsDetected = 0;
	
	if (row1.author1_len >= 4) {
		authorsCount++;
		if (this.findAuthor(text, row1.author1_hash, row1.author1_len)) {
			authorsDetected++;
		}
	}
	
	if (row1.author2_len >= 4) {
		authorsCount++;
		if (this.findAuthor(text, row1.author2_hash, row1.author2_len)) {
			authorsDetected++;
		}
	}
	
	return {
		status: 'single',
		title,
		doi: row1.doi,
		authorsCount,
		authorsDetected
	};
};

/**
 * Check if author last name exists in the text.
 * Does lookup by author last name hash and length
 * @param text
 * @param authorHash
 * @param authorLen
 * @return {boolean}
 */
Db.prototype.findAuthor = function (text, authorHash, authorLen) {
	text = new Buffer(text);
	// Slice every single author name length part from text and calculate hash of it
	for (let i = 0; i < text.length - authorLen; i++) {
		if (authorHash === XXHash.hash(text.slice(i, i + authorLen), 0)) {
			return true;
		}
	}
	return false;
};
