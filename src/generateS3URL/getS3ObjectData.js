const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
require("dotenv").config();

// Configure AWS S3
const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const bucketName = 'upmyranksvideos';
const basePrefix = 'labs/code';

const outputJSONDir = './json/labs/code';
const outputExcelDir = './excels/labs/code';
const cdnBaseURL = 'https://static.upmyranks.com/';

// Ensure output directories exist
fs.mkdirSync(outputJSONDir, { recursive: true });
fs.mkdirSync(outputExcelDir, { recursive: true });

// List all "chapter folders" under the base prefix
const listChapterFolders = async () => {
  const params = {
    Bucket: bucketName,
    Prefix: basePrefix.endsWith('/') ? basePrefix : basePrefix + '/',
    Delimiter: '/',
  };

  const data = await s3.listObjectsV2(params).promise();
  return (data.CommonPrefixes || []).map(cp => cp.Prefix);
};

// List all files under a specific prefix (can be chapter or base)
const listFilesInPrefix = async (prefix) => {
  const files = [];
  let continuationToken = null;
  let isTruncated = true;

  while (isTruncated) {
    const params = {
      Bucket: bucketName,
      Prefix: prefix,
      ContinuationToken: continuationToken || undefined,
    };

    const data = await s3.listObjectsV2(params).promise();

    (data.Contents || []).forEach(item => {
      if (!item.Key.endsWith('/')) {
        const encodedKey = item.Key.split('/').map(encodeURIComponent).join('/');
        const fileURL = `${cdnBaseURL}${encodedKey}`;
        files.push(fileURL);
      }
    });

    isTruncated = data.IsTruncated;
    continuationToken = data.NextContinuationToken;
  }

  return files;
};

// Write Excel file
const writeExcelFile = (data, outputPath) => {
  const worksheetData = data.map(url => ({ FileURL: url }));
  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Files');
  XLSX.writeFile(workbook, outputPath);
};

// Main function
const main = async () => {
  try {
    const chapterFolders = await listChapterFolders();

    if (chapterFolders.length === 0) {
      console.warn('⚠️ No subfolders (chapters) found. Listing all files under base prefix...');

      const files = await listFilesInPrefix(basePrefix);

      if (files.length === 0) {
        console.log(`⛔ No files found under base prefix.`);
        return;
      }

      const baseName = basePrefix.split('/').filter(Boolean).pop();

      const jsonOutputPath = path.join(outputJSONDir, `${baseName}.json`);
      fs.writeFileSync(jsonOutputPath, JSON.stringify(files, null, 2), 'utf-8');
      console.log(`✅ JSON Saved: ${jsonOutputPath}`);

      const excelOutputPath = path.join(outputExcelDir, `${baseName}.xlsx`);
      writeExcelFile(files, excelOutputPath);
      console.log(`✅ Excel Saved: ${excelOutputPath}`);

    } else {
      for (const folderPrefix of chapterFolders) {
        const chapterName = folderPrefix.split('/').filter(Boolean).pop();
        console.log(`📁 Processing: ${chapterName}`);

        const files = await listFilesInPrefix(folderPrefix);

        if (files.length === 0) {
          console.log(`⛔ No files found in ${chapterName}`);
          continue;
        }

        const jsonOutputPath = path.join(outputJSONDir, `${chapterName}.json`);
        fs.writeFileSync(jsonOutputPath, JSON.stringify(files, null, 2), 'utf-8');
        console.log(`✅ JSON Saved: ${jsonOutputPath}`);

        const excelOutputPath = path.join(outputExcelDir, `${chapterName}.xlsx`);
        writeExcelFile(files, excelOutputPath);
        console.log(`✅ Excel Saved: ${excelOutputPath}`);
      }
    }

    console.log('\n🎉 All files (JSON + Excel) generated!');
  } catch (err) {
    console.error('❌ Error:', err);
  }
};

main();
