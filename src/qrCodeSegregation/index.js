const xlsx = require("xlsx");
const fs = require("fs");
const path = require("path");
const mkdirp = require("mkdirp");

const INPUT_FILE = "remaining-qrcode-till6th-aug.xlsx";
const OUTPUT_ROOT = "qrCodes1";
const LOG_FILE = "error_log1.txt";

// Reset error log
fs.writeFileSync(LOG_FILE, "");

let data;
try {
    const workbook = xlsx.readFile(INPUT_FILE);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    data = xlsx.utils.sheet_to_json(worksheet);
} catch (err) {
    console.error("❌ Failed to load Excel:", err.message);
    process.exit(1);
}

const grouped = {};

data.forEach((row, index) => {
    try {
        const id = row.id;
        const url = (row.video_url || "").trim();

        if (!url.includes(".com/")) throw new Error("Invalid URL format");

        const relativePath = url.split(".com/")[1];
        const parts = relativePath.split("/");

        let basePath = "";
        let excelName = "misc";

        if (parts.length >= 2) {
            const folderParts = parts.slice(0, -1); // everything except file
            excelName = folderParts.pop() || "misc";
            basePath = folderParts.join("/");
        }

        const key = `${basePath}|${excelName}`;
        if (!grouped[key]) grouped[key] = [];

        grouped[key].push({
            type: "video",
            qrCodeId: id,
            filePath: url,
        });
    } catch (err) {
        const logMsg = `File: ${INPUT_FILE}, Row ${index + 2} (id=${row.id || "unknown"}): ${err.message}\n`;
        fs.appendFileSync(LOG_FILE, logMsg);
        console.warn("⚠️  Skipped:", logMsg.trim());
    }
});

// Helper to clean invalid path characters
const sanitize = (str) =>
    str.replace(/[<>:"/\\|?*]/g, "").replace(/\s+/g, "-").trim();

Object.entries(grouped).forEach(([key, rows]) => {
    try {
        let [basePath, fileName] = key.split("|");

        // Sanitize both folder and filename parts
        const safeBasePath = basePath
            .split("/")
            .map((p) => sanitize(p))
            .join("/");
        const safeFileName = sanitize(fileName);

        const fullDir = path.join(__dirname, OUTPUT_ROOT, safeBasePath);
        const excelPath = path.join(fullDir, `${safeFileName}.xlsx`);

        mkdirp.sync(fullDir);

        const sheet = xlsx.utils.json_to_sheet(rows);
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, sheet, "Videos");
        xlsx.writeFile(workbook, excelPath);

        console.log(`✅ Saved: ${excelPath}`);
    } catch (err) {
        const logMsg = `Write error for ${key}: ${err.message}\n`;
        fs.appendFileSync(LOG_FILE, logMsg);
        console.warn("⚠️  Write Skipped:", logMsg.trim());
    }
});

