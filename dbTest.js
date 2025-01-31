require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

console.log({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});


(async () => {
    try {
        const result = await pool.query('SELECT NOW()');
        console.log('Połączenie działa. Aktualny czas serwera:', result.rows[0].now);
    } catch (error) {
        console.error('Błąd połączenia:', error.message);
    } finally {
        await pool.end();
    }
})();
