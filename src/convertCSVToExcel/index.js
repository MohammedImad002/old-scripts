const fs = require('fs-extra');
const path = require('path');
const xlsx = require('xlsx');

// === CONFIG ===
const inputRoot = path.resolve(__dirname, 'missing_qrcodes');
const outputRoot = path.resolve(__dirname, 'converted_excels');

/**
 * Recursively gets all CSV file paths inside input directory
 */
function getAllCsvFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllCsvFiles(fullPath, arrayOfFiles);
    } else if (path.extname(fullPath).toLowerCase() === '.csv') {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

/**
 * Converts a CSV file to Excel and writes it to the output folder
 */
function convertCsvToExcel(csvFilePath) {
  const relativePath = path.relative(inputRoot, csvFilePath);
  const fileNameWithoutExt = path.basename(relativePath, '.csv');
  const relativeDir = path.dirname(relativePath);
  const outputDir = path.join(outputRoot, relativeDir);
  const outputFilePath = path.join(outputDir, `${fileNameWithoutExt}.xlsx`);

  fs.ensureDirSync(outputDir);

  const csvData = fs.readFileSync(csvFilePath, 'utf8');
  const workbook = xlsx.utils.book_new();
  const worksheet = xlsx.utils.sheet_to_json(xlsx.read(csvData, { type: 'string' }).Sheets.Sheet1, {
    header: 1,
    blankrows: false,
  });

  const newSheet = xlsx.utils.aoa_to_sheet(worksheet);
  xlsx.utils.book_append_sheet(workbook, newSheet, 'Sheet1');

  xlsx.writeFile(workbook, outputFilePath);
  console.log(`✅ Converted: ${csvFilePath} → ${outputFilePath}`);
}

// === MAIN EXECUTION ===

if (!fs.existsSync(inputRoot)) {
  console.error(`❌ Input folder not found: ${inputRoot}`);
  process.exit(1);
}

const csvFiles = getAllCsvFiles(inputRoot);

if (csvFiles.length === 0) {
  console.log('No CSV files found.');
} else {
  csvFiles.forEach(convertCsvToExcel);
  console.log(`🎉 Converted ${csvFiles.length} CSV file(s) to Excel in "${outputRoot}".`);
}
