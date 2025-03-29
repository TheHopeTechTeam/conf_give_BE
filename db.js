const { Client } = require('pg');
const client = new Client({
    user: process.env.user,
    password: process.env.password,
    host: process.env.host,
    port: process.env.port, // PostgreSQL 的預設埠
    database: process.env.database
});

module.exports = client;