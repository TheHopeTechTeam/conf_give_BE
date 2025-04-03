const axios = require("axios");
const givingModel = require("../models/giving");

const { PARTNER_KEY, MERCHANT_ID, TAPPAY_API, CURRENCY } = process.env;
if (!PARTNER_KEY || !MERCHANT_ID || !TAPPAY_API || !CURRENCY) {
  throw new Error(
    "Missing required environment variables for TapPay integration"
  );
}

function generateDetails(phoneNumber, cardholder) {
  const id = cardholder.nationalid ?? cardholder.taxid ?? "";
  const note = cardholder.note || "";

  return `${phoneNumber},${id},${note}`;
}

async function tapPayPayment(phoneNumber, prime, amount, cardholder) {
  try {
    const response = await axios.post(
      TAPPAY_API,
      {
        prime,
        partner_key: PARTNER_KEY,
        merchant_id: MERCHANT_ID,
        amount: amount,
        cardholder,
        currency: CURRENCY,
        details: generateDetails(phoneNumber, cardholder),
        remember: false,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": PARTNER_KEY,
        },
      }
    );

    return response.data;
  } catch (err) {
    console.error(
      "Error calling TapPay API:",
      err.response?.data || err.message
    );
    throw new Error("TapPay payment request failed");
  }
}

function getCurrentDate() {
  const date = new Date();
  return date.toISOString().split("T")[0]; // YYYY-MM-DD
}

const givingController = {
  giving: async (req, res, next) => {
    const { prime, amount, cardholder } = req.body;
    const { phoneCode, phone_number } = cardholder;

    if (!prime || !amount || !cardholder) {
      return res.status(400).json({
        error: "Missing required fields: prime, amount, or cardholder",
      });
    }

    if (!phoneCode || !phone_number) {
      return res.status(400).json({
        error: "Missing required fields: phoneCode, or phone_number",
      });
    }

    const phoneNumber = phoneCode + phone_number;

    try {
      const externalResponse = await tapPayPayment(
        phoneNumber,
        prime,
        amount,
        cardholder
      );

      await givingModel.add(
        cardholder.name,
        amount,
        "TWD",
        getCurrentDate(),
        phoneNumber,
        cardholder.email || "",
        cardholder.receipt || false,
        cardholder.paymentType || "",
        cardholder.upload || false,
        cardholder.receiptName || "",
        cardholder.nationalid || "",
        cardholder.company || "",
        cardholder.taxid || "",
        cardholder.note || ""
      );

      res.status(200).json(externalResponse);
    } catch (error) {
      console.error(
        "Error sending data to TapPay API or storing giving details in DB:",
        error
      );
      res.status(500).json({
        error:
          "Failed to send data to TapPay API or storing giving details in DB",
      });
    }
  },
};

module.exports = givingController;
