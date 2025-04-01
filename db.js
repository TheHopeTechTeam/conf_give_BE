const { Client } = require("pg");

const { USER, PASSWORD, HOST, PGPORT, DATABASE } = process.env;

console.log("process.env: ", USER, PASSWORD, HOST, PGPORT, DATABASE);

const client = new Client({
  user: USER,
  password: PASSWORD,
  host: HOST,
  port: PGPORT, // PostgreSQL 的預設埠
  database: DATABASE,
});

module.exports = client;
