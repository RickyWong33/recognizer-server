const XRegExp = require('xregexp');
const utils = require('./utils');

const Abstract = function () {

};

module.exports = Abstract;

Abstract.prototype.extract = function (doc) {
	let res;
	let i = 0;
	for (; i < doc.pages.length; i++) {
		let page = doc.pages[i];
		res = this.extractStructured(page);
		if (res) break;
		res = this.extractSimple(page);
		if (res) break;
		res = this.extractBeforeKeywords(page);
		if (res) break;
	}
	
	if (res) {
		return {
			pageIndex: i,
			pageY: res.yMin,
			text: res.text
		};
	}
	
	return null;
};

/**
 * Extract abstract paragraph which is above keywords.
 * Sometimes abstract doesn't have any title before it (i.e. "Abstract" or "Summary"),
 * and is just a single paragraph. But if there are keywords below it, almost certainly
 * the paragraph is an abstract.
 * @param page
 * @return {*}
 */
Abstract.prototype.extractBeforeKeywords = function (page) {
	
	function haveIdenticalFontWords(line1, line2) {
		for (let word1 of line1.words) {
			if (word1.text.length < 2) continue;
			for (let word2 of line2.words) {
				if (word2.text.length < 2) continue;
				if (word1.font === word2.font && word1.fontSize === word2.fontSize) {
					return true
				}
			}
		}
		return false;
	}
	
	// Group lines to line blocks. Similarly to lbs.js
	// but much simpler, optimized for keywords.
	// Lines must be grouped because keywords can be in multiple lines
	let lbs = [];
	
	for (let line of page.lines) {
		
		// Line must have words
		if (!line.words.length) continue;
		
		let lastLb = null;
		let prevWord = null;
		
		// Try to get the line (and the last word) from the previous line block
		if (lbs.length) {
			lastLb = lbs.slice(-1)[0];
			let prevLine = lastLb.lines.slice(-1)[0];
			prevWord = prevLine.words.slice(-1)[0];
		}
		
		// To group this line with the previous line there should be
		// the same font and size words. And also the line
		// shouldn't be a keywords line
		if (
			prevWord &&
			!/(keywords|key words|indexing terms)([: a-z]*),([ a-z]*)/i.test(line.text) &&
			haveIdenticalFontWords(lastLb.lines.slice(-1)[0], line) &&
			line.yMin - prevWord.yMax < prevWord.fontSize
		) {
			lastLb.lines.push(line);
		}
		// Or just create a new line block
		else {
			lbs.push({
				lines: [line]
			});
		}
	}
	
	// Loop through all the line blocks until a keywords line is detected
	for (let i = 1; i < lbs.length; i++) {
		let lb = lbs[i];
		
		// Test if the first line of the block has keywords and starts from an upper case letter
		if (
			/(keywords|key words|indexing terms)([: a-z]*),([ a-z]*)/i.test(lb.lines[0].text) &&
			utils.isUpper(lb.lines[0].text[0])
		) {
			// Keywords line block is found therefore the previous line block should be
			// an abstract
			let lbPrev = lbs[i - 1];
			let abstract = '';
			// Combine all abstract lines
			for (let line of lbPrev.lines) {
				abstract += line.text;
				// If there is a hyphen at the end of line, remove it
				if (abstract.length && /[-\u2010]$/.test(abstract)) {
					abstract = abstract.slice(0, -1);
				}
				// Add a space of there isn't any kind of dash at the end of line
				else if (!XRegExp('\\p{Dash_Punctuation}$').test(abstract)) {
					abstract += ' ';
				}
			}
			abstract = abstract.trim();
			
			// Return the abstract if it has a proper length, starts with an
			// upper case letter and finishes with a dot
			if (
				abstract.length > 200 && abstract.length < 3000 &&
				utils.isUpper(abstract[0]) &&
				abstract.slice(-1) === '.'
			) {
				return {yMin: lbPrev.lines[0].yMin, text: abstract};
			}
		}
	}
	return null;
};

/**
 * Extract abstract when there is a title "Abstract" or "Summary" before it.
 * Currently only single paragraph abstracts are supported
 * @param page
 * @return {*}
 */
Abstract.prototype.extractSimple = function (page) {
	
	function getAbstractLines(lines, line_i) {
		let abstractLines = [];
		let start_i = line_i;
		for (; line_i < lines.length; line_i++) {
			let line = lines[line_i];
			
			// Stop because keywords are always behind the abstract
			if (/^(Keyword|KEYWORD|Key Word|Indexing Terms)/.test(line.text)) break;
			
			if (utils.isBreakSection(line.text)) break;
			
			// Collect lines
			abstractLines.push(lines[line_i]);
			
			// Try to detect if the current line is the last line.
			// Firstly try to measure if the current line is shorter than all other previous lines.
			// It happens with justify alignment which is quite common and produces symmetrical columns
			if (line_i >= 2) {
				// Right side difference between two previous lines
				let prevDiff = Math.abs(lines[line_i - 2].xMax - lines[line_i - 1].xMax);
				// Right side difference between the current and the previous line
				let curDiff = lines[line_i - 1].xMax - lines[line_i].xMax;
				
				// Compare line differences. If two previous lines are in the same line,
				// then the paragraph has a justify alignment and if the current line
				// is shorter then it's the last line
				if (/[\)\.]/.test(lines[line_i].text.slice(-1)) &&
					line_i - start_i >= 2 &&
					prevDiff < 1.0 &&
					curDiff > 2.0
				) {
					break;
				}
			}
			
			// If the current line isn't the last line, then compare line spacings
			// between the two previous lines and the current line. If it's too high
			// then the current line doesn't belong to the abstract paragraph
			if (line_i >= 1 && line_i + 1 < lines.length && line_i - start_i >= 1) {
				let prevGap = lines[line_i].yMin - lines[line_i - 1].yMax;
				let nextGap = lines[line_i + 1].yMin - lines[line_i].yMax;
				if (nextGap - prevGap > 5.0) {
					break;
				}
			}
		}
		return abstractLines;
	}
	
	function joinAbstractLines(lines) {
		let text = '';
		for (let i = 0; i < lines.length; i++) {
			let line = lines[i];
			if (i > 0) {
				if (/[-\u2010]/.test(text.slice(-1))) {
					text = text.slice(0, -1);
				}
				else if (!XRegExp('\\p{Dash_Punctuation}$').test(text)) {
					text += ' ';
				}
			}
			text += line.text;
		}
		return text;
	}
	
	function indexOfFirstAlphaNum(text) {
		for (let i = 0; i < text.length; i++) {
			let c = text[i];
			if (XRegExp('[\\p{Letter}0-9]').test(c)) {
				return i;
			}
		}
		return -1;
	}
	
	function getTitle(line) {
		let titles = ['abstract', 'summary'];
		let text = line.text.toLowerCase();
		for (let i = 0; i < titles.length; i++) {
			if (text.indexOf(titles[i]) === 0) {
				return text.slice(0, titles[i].length);
			}
		}
		return null;
	}
	
	let lines = page.lines;
	
	for (let line_i = 1; line_i < lines.length; line_i++) {
		let line = lines[line_i];
		
		if (line_i === lines.length - 1) break;
		
		// let word_x_max = line.words[0].xMax;
		// let next_line_x_max = lines[line_i + 1].xMax;
		// let next_line_x_min = lines[line_i + 1].xMin;
		//if (Math.abs(line.words[0].yMin-lines[line_i + 1].yMin)>2.0 &&( word_x_max > next_line_x_max || word_x_max < next_line_x_min)) continue;
		
		// Find the beginning of an abstract (by title). The abstract begins from line_i
		let title = getTitle(line);
		if (title) {
			// Get all abstract lines (including title) from line_i until the end
			let abstractLines = getAbstractLines(lines, line_i);
			
			// Join abstract lines into a text
			let text = joinAbstractLines(abstractLines);
			
			// Cut the title from the beginning
			text = text.slice(title.length);
			
			// Cut until the first alphanumeric character, to skip various
			// spaces and dashes between the abstract title and the actual paragraph
			let j = indexOfFirstAlphaNum(text);
			text = text.slice(j);
			
			// Abstract len
			if (text.length < 100 && text.length > 10000) break;
			
			// Should start with an uppercase letter
			if (!utils.isUpper(text[0])) break;
			
			// Should end with a dot
			if (text.slice(-1) !== '.') break;
			return {yMin: line.yMin, text};
		}
	}
	return null;
};

/**
 * Extract an abstract consisting of multiple sections
 * @param page
 * @return {*}
 */
Abstract.prototype.extractStructured = function (page) {
	
	// Try to get title at the beginning of line
	function getTitle(text) {
		// Section must start with one of the titles below
		let names = {
			'background': 1,
			'methodology': 2,
			'methods': 2,
			'method': 2,
			'conclusions': 3,
			'conclusion': 3,
			'objectives': 4,
			'objective': 4,
			'results': 5,
			'result': 5,
			'purpose': 6,
			'measurements': 7,
			'comparison': 8,
			'introduction': 9
		};
		
		let text2 = text.toLowerCase();
		
		for (let name in names) {
			// Title must be at the beginning of the line and have an upper case letter
			if (text2.indexOf(name) === 0 && utils.isUpper(text[0])) {
				return names[name];
			}
		}
		return 0;
	}
	
	function getSections(lines, line_i) {
		let sectionLines = [];
		
		// Anchor word should be the first section title.
		// All other section titles must be aligned in the same line as the anchor word,
		// and have the same font and font size
		let anchorWord = lines[line_i].words[0];
		
		let foundTypes = [];
		
		for (; line_i < lines.length; line_i++) {
			let line = lines[line_i];
			
			// Compare with anchor word. Must be aligned and have the same font and font size
			if (
				Math.abs(anchorWord.xMin - line.words[0].xMin) > 2.0 ||
				Math.abs(anchorWord.fontSize - line.words[0].fontSize) > 1.0 ||
				anchorWord.font !== line.words[0].font
			) continue;
			
			// Skip sections like "Table of contents"
			if (utils.isBreakSection(line.text)) break;
			
			let type = getTitle(line.text);
			if (!type) continue;
			
			// One section can only be found once
			if (foundTypes.includes(type)) continue;
			
			foundTypes.push(type);
			sectionLines.push(line_i);
			
			// Conclusion section is always the last one
			if (type === 3) break;
		}
		
		// Should find at least 3 different sections and finish with a conclusion
		if (foundTypes.length < 3 || foundTypes.slice(-1)[0] !== 3) return null;
		return sectionLines;
	}
	
	function getLastSectionBreak(lines, line_i) {
		let start_i = line_i;
		line_i++;
		for (; line_i < lines.length; line_i++) {
			let line = lines[line_i];
			
			if (lines[line_i].xMin - lines[line_i - 1].xMax > lines[line_i - 1].words[0].fontSize * 2) break;
			
			if (/^(Keyword|KEYWORD|Key Word|Key word|Indexing Terms)/.test(lines[line_i].text)) break;
			
			if (line_i - start_i >= 2) {
				let prevGap = lines[line_i - 1].yMin - lines[line_i - 2].yMax;
				let curGap = lines[line_i].yMin - lines[line_i - 1].yMax;
				if (curGap - prevGap > 5.0) {
					break;
				}
				
				let prevDiff = Math.abs(lines[line_i - 3].xMax - lines[line_i - 2].xMax);
				let curDiff = lines[line_i - 2].xMax - lines[line_i - 1].xMax;
				
				if (/[\)\.]/.test(lines[line_i - 1].text.slice(-1)) &&
					prevDiff < 1.0 &&
					curDiff > 2.0
				) {
					break;
				}
			}
		}
		return line_i - 1;
	}
	
	function sectionsToText(sections) {
		let text = '';
		
		for (let i = 0; i < sections.length; i++) {
			let section = sections[i];
			
			if (i > 0) text += '\n';
			
			for (let j = 0; j < section.lines.length; j++) {
				let line = section.lines[j];
				if (j > 0) {
					if (/[-\u2010]/.test(text.slice(-1))) {
						text = text.slice(0, -1);
					}
					else if (!XRegExp('\\p{Dash_Punctuation}$').test(text)) {
						text += ' ';
					}
				}
				text += line.text;
			}
		}
		return text;
	}
	
	let lines = page.lines;
	
	for (let line_i = 0; line_i < lines.length; line_i++) {
		let line = lines[line_i];
		let lns = getSections(lines, line_i);
		if (lns && lns.length) {
			let sections = [];
			for (let i = 0; i < lns.length; i++) {
				
				if (i + 1 < lns.length) {
					sections.push({
						lines: lines.slice(lns[i], lns[i + 1])
					});
				}
				else {
					let j = getLastSectionBreak(lines, lns[i]);
					sections.push({
						lines: lines.slice(lns[i], j + 1)
					});
				}
			}
			return {yMin: line.yMin, text: sectionsToText(sections)};
		}
	}
	
	return null;
};
