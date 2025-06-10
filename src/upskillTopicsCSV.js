const fs = require("fs");
const path = require("path");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

// Path to the main directory
const BASE_DIR = "F:/all_compressed_videos/upskill"; // change to your path
const OUTPUT_CSV = "all_videos.csv";

// CSV Writer setup
const csvWriter = createCsvWriter({
    path: OUTPUT_CSV,
    header: [
        { id: "subject", title: "subject" },
        { id: "topic", title: "topic" },
    ],
});

// Read all subfolders (subjects)
fs.readdir(BASE_DIR, { withFileTypes: true }, async (err, entries) => {
    if (err) {
        return console.error("Failed to read base directory:", err);
    }

    const allRecords = [];

    for (const entry of entries) {
        if (entry.isDirectory()) {
            const subject = entry.name;
            const subjectPath = path.join(BASE_DIR, subject);

            const files = fs.readdirSync(subjectPath);
            const mp4Files = files.filter((file) => file.toLowerCase().endsWith(".mp4"));

            for (const video of mp4Files) {
                allRecords.push({
                    subject,
                    topic: video,
                });
            }
        }
    }

    try {
        await csvWriter.writeRecords(allRecords);
        console.log("✅ CSV file created: all_videos.csv");
    } catch (writeErr) {
        console.error("❌ Failed to write CSV:", writeErr);
    }
});
