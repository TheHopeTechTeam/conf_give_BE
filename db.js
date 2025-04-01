const { Pool } = require("pg");

const { PGUSER, PASSWORD, HOST, PGPORT, DATABASE } = process.env;

const pool = new Pool({
  user: PGUSER,
  password: PASSWORD,
  host: HOST,
  port: PGPORT, // PostgreSQL 的預設埠
  database: DATABASE,
});

module.exports = pool;
