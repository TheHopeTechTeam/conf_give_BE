const axios = require("axios");
const givingModel = require("../models/giving");

const { PARTNER_KEY, MERCHANT_ID, TAPPAY_API, CURRENCY, REDIS_URL } =
  process.env;
if (!PARTNER_KEY || !MERCHANT_ID || !TAPPAY_API || !CURRENCY || !REDIS_URL) {
  throw new Error(
    "Missing required environment variables (PARTNER_KEY, MERCHANT_ID, TAPPAY_API, CURRENCY, REDIS_URL)"
  );
}

const { Queue, Worker } = require("bullmq");
const { v4: uuidv4 } = require("uuid");

// Create a queue
const paymentQueue = new Queue("tappay-payments", {
  connection: REDIS_URL,
  defaultJobOptions: {
    attempts: 3, // Retry up to 3 times
    backoff: {
      type: "exponential",
      delay: 1000, // Start with 1 second delay
    },
    timeout: 10000, // 10 seconds timeout
  },
});

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

// Worker to process TapPay payment jobs
const paymentWorker = new Worker(
  "tappay-payments",
  async (job) => {
    const { phoneNumber, prime, amount, cardholder, givingData } = job.data; // Extract all data
    try {
      const externalResponse = await tapPayPayment(
        phoneNumber,
        prime,
        amount,
        cardholder
      );
      // Include the externalResponse in the givingData to be saved.
      await givingModel.add(
        givingData.name,
        givingData.amount,
        givingData.currency,
        givingData.date,
        givingData.phoneNumber,
        givingData.email,
        givingData.receipt,
        givingData.paymentType,
        givingData.upload,
        givingData.receiptName,
        givingData.nationalid,
        givingData.company,
        givingData.taxid,
        givingData.note
      );
      return { success: true, response: externalResponse }; // Return useful data
    } catch (error) {
      // IMPORTANT:  Re-throw the error.  This tells BullMQ the job failed.
      console.error("Payment processing failed in worker:", error);
      throw error;
    }
  },
  { connection: REDIS_URL }
);

paymentWorker.on("completed", (job, result) => {
  console.log(`Job ${job.id} completed.`);
});

paymentWorker.on("failed", (job, err) => {
  console.error(`Job ${job.id} failed with error:`, err);
});

paymentWorker.on("progress", (job, progress) => {
  console.log(`Job ${job.id} progress: ${progress}`);
});

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

    const givingData = {
      name: cardholder.name,
      amount: amount,
      currency: "TWD", //  It's better to get currency from environment variable.
      date: getCurrentDate(),
      phoneNumber: phoneNumber,
      email: cardholder.email || "",
      receipt: cardholder.receipt || false,
      paymentType: cardholder.paymentType || "",
      upload: cardholder.upload || false,
      receiptName: cardholder.receiptName || "",
      nationalid: cardholder.nationalid || "",
      company: cardholder.company || "",
      taxid: cardholder.taxid || "",
      note: cardholder.note || "",
    };

    try {
      // Add a job to the queue, *not* the payment itself.
      const job = await paymentQueue.add(
        "process-payment",
        {
          phoneNumber,
          prime,
          amount,
          cardholder,
          givingData,
        },
        {
          jobId: uuidv4(), //Assign a unique ID to the job
        }
      );

      console.log(`Job ${job.id} added to queue for processing.`);
      // Respond immediately, indicating the payment is being processed.
      res.status(202).json({
        message: "Payment processing initiated.  Check back later for status.",
      }); // 202 Accepted
    } catch (error) {
      console.error("Error adding job to payment queue:", error);
      res
        .status(500)
        .json({ error: "Failed to add payment to processing queue." });
    }
  },
};

module.exports = givingController;
