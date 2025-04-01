const { Client } = require("pg");

const { USER, PWD, HOST, PGPORT, DATABATE } = process.env;

const client = new Client({
  user: USER,
  password: PWD,
  host: HOST,
  port: PGPORT, // PostgreSQL 的預設埠
  database: DATABATE,
});

module.exports = client;
