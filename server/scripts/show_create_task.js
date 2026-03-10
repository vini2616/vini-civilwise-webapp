
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

        const [rows] = await connection.execute('SHOW CREATE TABLE project_tasks');
        console.log(rows[0]['Create Table']);

        await connection.end();
    } catch (e) {
        console.error('Error:', e);
    }
}

check();
