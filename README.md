# recognizer-server

[![Build Status](https://travis-ci.org/zotero/recognizer-server.svg?branch=master)](https://travis-ci.org/zotero/recognizer-server)

Extracts metadata from PDFs.

```
git clone https://github.com/zotero/recognizer-server
cd recognizer-server
# Add database folder
npm install
npm start
```

## Test
Add tests to `tests/pdftest-data` directory and run:
```
npm run pdftest
```

## Tools

`test/tools/` contains various tools to make testing more convenient.
Before starting to use them, PDF tools must be fetched:
```
./fetch-pdftools
```


All tools need a running recognizer-server.
Tools that produce PDF tests, automatically save them to `test/pdftest-data` directory.


Query a PDF and get a response from recognizer-server:
```
node query-pdf.js /path/to/file.pdf
```


Query a report and get a response from recognizer-server:
```
node query-report.js /path/to/report.json
```


Query an already existing test and get a response from recognizer-server:
```
node query-test.js 007
```


Add a test on a given PDF:
```
node add-test-pdf.js /path/to/file.pdf
```


Add a test on a given report:
```
node add-test-report.js /path/to/report.json
```


Reset specified tests. Useful when i.e. a new field is added and need to update multiple tests.
Supports multiple multiple tests:
```
node reset-test.js 007
node reset-test.js 007 014 028
node reset-test.js all
```


Process reports directory to a human readable, easy-to-analyze format:
```
process-reports.js reports/dir/ output/dir/
```
