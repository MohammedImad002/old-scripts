const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Configure AWS S3
const s3 = new AWS.S3({
  region: 'ap-south-1',
  accessKeyId: '', // Set your access key
  secretAccessKey: '', // Set your secret key
});

const bucketName = 'upmyranksvideos';
const basePrefix = 'skills/upsc';

const outputJSONDir = './json/skills/upsc';
const outputExcelDir = './excels/skills/upsc';
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

// List all files under a specific chapter prefix
const listFilesInChapter = async (chapterPrefix) => {
  const files = [];
  let continuationToken = null;
  let isTruncated = true;

  while (isTruncated) {
    const params = {
      Bucket: bucketName,
      Prefix: chapterPrefix,
      ContinuationToken: continuationToken || undefined,
    };

    const data = await s3.listObjectsV2(params).promise();

    (data.Contents || []).forEach(item => {
      if (!item.Key.endsWith('/')) {
        const fileURL = `${cdnBaseURL}${item.Key}`;
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
      console.warn('⚠️ No subfolders found under base prefix.');
      return;
    }

    for (const folderPrefix of chapterFolders) {
      const chapterName = folderPrefix.split('/').filter(Boolean).pop(); // e.g., "history"
      console.log(`📁 Processing: ${chapterName}`);

      const files = await listFilesInChapter(folderPrefix);

      if (files.length === 0) {
        console.log(`⛔ No files found in ${chapterName}`);
        continue;
      }

      // Write JSON
      const jsonOutputPath = path.join(outputJSONDir, `${chapterName}.json`);
      fs.writeFileSync(jsonOutputPath, JSON.stringify(files, null, 2), 'utf-8');
      console.log(`✅ JSON Saved: ${jsonOutputPath}`);

      // Write Excel
      const excelOutputPath = path.join(outputExcelDir, `${chapterName}.xlsx`);
      writeExcelFile(files, excelOutputPath);
      console.log(`✅ Excel Saved: ${excelOutputPath}`);
    }

    console.log('\n🎉 All chapter files (JSON + Excel) generated!');
  } catch (err) {
    console.error('❌ Error:', err);
  }
};

main();
