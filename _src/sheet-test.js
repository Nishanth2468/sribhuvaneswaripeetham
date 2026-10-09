// Run: node _src/sheet-test.js  — checks the Google Sheet CSV parsing in site.js
const assert = require('assert'), src = require('fs').readFileSync(__dirname + '/site.js', 'utf8');
const { parseCSV, isoDate, sheetRows } = new Function(src.split('// <sheet>')[1].split('// </sheet>')[0] + 'return { parseCSV, isoDate, sheetRows };')();

assert.deepStrictEqual(parseCSV('a,b\r\n"x, ""y""","line1\nline2"\n'), [['a', 'b'], ['x, "y"', 'line1\nline2']]);
assert.strictEqual(isoDate('2026-10-11'), '2026-10-11');
assert.strictEqual(isoDate('11/10/2026'), '2026-10-11'); // Indian day-first
assert.strictEqual(isoDate('1.2.2027'), '2027-02-01');
assert.strictEqual(isoDate('Oct 11'), '');
const rows = sheetRows('తేదీ,ముగింపు,శీర్షిక,వివరాలు,లింక్\n11/10/2026,19/10/2026,నవరాత్రి,"పూజలు, యాగం",pooja-bookings.html\n,,no date row,,\nbad,,x,,\n');
assert.deepStrictEqual(rows, [{ date: '2026-10-11', end: '2026-10-19', title: 'నవరాత్రి', text: 'పూజలు, యాగం', link: 'pooja-bookings.html' }]);
console.log('sheet parsing ok');
