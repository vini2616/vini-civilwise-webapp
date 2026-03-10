
const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('Connected to database as ID ' + connection.threadId);

        const [rows] = await connection.execute('DESCRIBE project_tasks');
        console.log('Table Structure:');
        rows.forEach(row => {
            console.log(`- ${row.Field} (${row.Type})`);
        });

        const [cnt] = await connection.execute('SELECT COUNT(*) as count FROM project_tasks');
        console.log('Row Count:', cnt[0].count);

        await connection.end();
    } catch (e) {
        console.error('Error:', e);
    }
}

check();
