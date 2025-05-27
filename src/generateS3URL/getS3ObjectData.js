const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// Configure AWS S3
const s3 = new AWS.S3({
  region: 'ap-south-1',
  accessKeyId: '', // Set your access key
  secretAccessKey: '', // Set your secret key
});

const bucketName = 'upmyranksvideos';
const basePrefix = 'foundation/grade-10/science/';
const outputDir = './json/grade-10/science';

// Ensure output directory exists
fs.mkdirSync(outputDir, { recursive: true });

// List all "chapter folders" under the base prefix
const listChapterFolders = async () => {
  const params = {
    Bucket: bucketName,
    Prefix: basePrefix,
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
        const fileName = path.basename(item.Key);
        const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
        const url = `https://static.upmyranks.com/${item.Key}`;

        files.push({ name: nameWithoutExt, url });
      }
    });

    isTruncated = data.IsTruncated;
    continuationToken = data.NextContinuationToken;
  }

  return files;
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
      const chapterName = folderPrefix.split('/').filter(Boolean).pop(); // "1.rational-numbers"
      console.log(`📁 Processing: ${chapterName}`);

      const files = await listFilesInChapter(folderPrefix);

      if (files.length === 0) {
        console.log(`⛔ No files found in ${chapterName}`);
        continue;
      }

      const outputPath = path.join(outputDir, `${chapterName}.json`);
      fs.writeFileSync(outputPath, JSON.stringify(files, null, 2), 'utf-8');

      console.log(`✅ Saved: ${outputPath}`);
    }

    console.log('\n🎉 All chapter JSONs generated!');
  } catch (err) {
    console.error('❌ Error:', err);
  }
};

main();
