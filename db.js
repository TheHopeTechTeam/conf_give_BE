const { Client } = require("pg");

const { PGUSER, PASSWORD, HOST, PGPORT, DATABASE } = process.env;

console.log("process.env: ", PGUSER, PASSWORD, HOST, PGPORT, DATABASE);

const client = new Client({
  user: PGUSER,
  password: PASSWORD,
  host: HOST,
  port: PGPORT, // PostgreSQL 的預設埠
  database: DATABASE,
});

module.exports = client;
