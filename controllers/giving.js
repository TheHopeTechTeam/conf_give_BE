const axios = require("axios");
const givingModel = require("../models/giving");
const givingController = {
  giving: async (req, res, next) => {
    const { prime, amount, cardholder } = req.body;
    const phoneNumber = cardholder.phoneCode + cardholder.phone_number;

    try {
      const response = await axios.post(
        "https://sandbox.tappaysdk.com/tpc/payment/pay-by-prime",
        {
          prime: prime,
          partner_key: process.env.partner_key,
          merchant_id: process.env.merchant_id,
          amount: amount,
          cardholder: cardholder,
          currency: "TWD",
          details: `${phoneNumber},${cardholder.email},${cardholder.receipt},${cardholder.paymentType},${cardholder.upload},${cardholder.receiptName},${cardholder.nationalid},${cardholder.company},${cardholder.taxid},${cardholder.note}`,
          remember: false,
        },
        {
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.partner_key,
          },
        }
      );

      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0"); // 月份是從0開始的，所以要加1
      const day = String(date.getDate()).padStart(2, "0");
      const datetime = `${year}-${month}-${day}`;
      const externalResponse = response.data;

      givingModel.add(
        cardholder.name,
        amount,
        "TWD",
        datetime,
        phoneNumber,
        cardholder.email,
        cardholder.receipt,
        cardholder.paymentType,
        cardholder.upload,
        cardholder.receiptName,
        cardholder.nationalid,
        cardholder.company,
        cardholder.taxid,
        cardholder.note,
        (err) => {
          if (err) return console.log(err);
        }
      );
      res.status(200).json(externalResponse);
    } catch (error) {
      console.error("Error sending data to external API:", error);
      res.status(500).json({ error: "Failed to send data to external API" });
    }
  },
};

module.exports = givingController;
