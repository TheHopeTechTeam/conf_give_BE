const pool = require("../db");

const givingModel = {
  add: async (
    name,
    amount,
    currency,
    date,
    phone_number,
    email,
    receipt,
    paymentType,
    upload,
    receiptName,
    nationalid,
    company,
    taxid,
    note,
    cb
  ) => {
    try {
      await pool.query(
        `INSERT INTO confgive (name, amount, currency, date, phone_number, email, receipt, paymentType, upload, receiptName, nationalid, company, taxid, note) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          name,
          amount,
          currency,
          date,
          phone_number,
          email,
          receipt,
          paymentType,
          upload,
          receiptName,
          nationalid,
          company,
          taxid,
          note,
        ]
      );
      cb(null);
      console.log("Data insert success");
    } catch (err) {
      console.error("Error executing query:", err);
      cb(err);
    }
  },
};

module.exports = givingModel;
