const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const { Parser } = require('json2csv');

const connectionConfig = {
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
};

async function fetchChildrenRecursive(connection, parentId) {
    const [rows] = await connection.execute(
        'SELECT id, course_name, created_at, parent_id, description FROM course WHERE parent_id = ?',
        [parentId]
    );

    let all = [...rows];

    for (const row of rows) {
        const children = await fetchChildrenRecursive(connection, row.id);
        all.push(...children);
    }

    return all;
}

async function generateCSV(course, children) {
    const records = [
        {
            id: course.id,
            course_name: course.course_name,
            created_at: course.created_at,
            parent_id: course.parent_id,
            description: course.description
        },
        ...children,
    ];

    const parser = new Parser({ fields: ['id', 'course_name', 'created_at', 'parent_id', 'description'] });
    const csv = parser.parse(records);

    const fileName = `${course.course_name.replace(/\s+/g, '_')}.csv`;
    const exportPath = path.join(__dirname, 'exports');
    if (!fs.existsSync(exportPath)) fs.mkdirSync(exportPath);

    fs.writeFileSync(path.join(exportPath, fileName), csv);
    console.log(`✅ CSV created for course: ${course.course_name}`);
}

(async () => {
    const connection = await mysql.createConnection(connectionConfig);

    try {
        // Get all top-level courses (parent_id IS NULL)
        const [courses] = await connection.execute(
            `SELECT id, course_name, created_at, parent_id, description FROM course WHERE parent_id IS NULL AND LOWER(course_name) LIKE '%grade%'`
        );

        for (const course of courses) {
            const children = await fetchChildrenRecursive(connection, course.id);
            await generateCSV(course, children);
        }

        console.log('🎉 All CSVs generated successfully.');
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await connection.end();
    }
})();
