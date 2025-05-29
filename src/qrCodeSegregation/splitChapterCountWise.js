const xlsx = require("xlsx");
const fs = require("fs");
const path = require("path");

// Load the Excel file
const workbook = xlsx.readFile("./qrCodes/tlp/mathematicstlp-12.xlsx"); // Update the path if needed
const sheetName = workbook.SheetNames[0];
const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

// Create an object to hold chapter-wise entries
const chapterWise = {};

// Process each row
data.forEach((row) => {
  if (row.length < 3) return; // Skip incomplete rows

  const idString = row[2]; // e.g., https://.../BTLP12C10Q034.mp4
  const match = idString.match(/C(\d+)Q/);

  if (match) {
    const chapter = `Chapter-${match[1]}`;

    if (!chapterWise[chapter]) {
      chapterWise[chapter] = [];
    }

    chapterWise[chapter].push(row); // Keep original row structure
  }
});

// Write each chapter to a separate Excel file
Object.entries(chapterWise).forEach(([chapter, entries]) => {
  const newWorkbook = xlsx.utils.book_new();
  const worksheet = xlsx.utils.aoa_to_sheet(entries); // Convert array of arrays
  xlsx.utils.book_append_sheet(newWorkbook, worksheet, "Sheet1");

  const filePath = path.join(__dirname, `math_${chapter}.xlsx`);
  xlsx.writeFile(newWorkbook, filePath);
  console.log(`Saved ${filePath} with ${entries.length} entries.`);
});
