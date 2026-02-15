/**
 * Extract text from "lotus park software sheet at glance.pdf".
 * Usage: node backend/scripts/extractPdfText.js [path-to.pdf] [--out=file.txt]
 */
const fs = require('fs');
const path = require('path');
const args = process.argv.slice(2);
const pdfPath = args.find((a) => !a.startsWith('--')) || path.join(__dirname, '..', '..', 'lotus park software sheet at glance.pdf');
const outArg = args.find((a) => a.startsWith('--out='));
const outPath = outArg ? outArg.replace('--out=', '').trim() : null;

if (!fs.existsSync(pdfPath)) {
  console.error('PDF not found:', pdfPath);
  process.exit(1);
}

async function run() {
  const pdf = require('pdf-parse');
  const dataBuffer = fs.readFileSync(pdfPath);
  const data = await pdf(dataBuffer);
  const text = data.text || '';
  console.log('Pages:', data.numpages);
  if (outPath) {
    fs.writeFileSync(outPath, text, 'utf8');
    console.log('Written:', outPath);
  } else {
    console.log(text.slice(0, 15000));
  }
}
run().catch((e) => { console.error(e); process.exit(1); });
