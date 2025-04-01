const { Pool } = require("pg");

const { PGUSER, PASSWORD, HOST, PGPORT, DATABASE } = process.env;

const pool = new Pool({
  user: PGUSER,
  password: PASSWORD,
  host: HOST,
  port: PGPORT,
  database: DATABASE,
  max: 50,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
});

module.exports = pool;
