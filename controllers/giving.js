const axios = require("axios");
const givingModel = require("../models/giving");

const { PARTNER_KEY, MERCHANT_ID, TAPPAY_API, CURRENCY, REDIS_URL, WORKERS } =
  process.env;
if (
  !PARTNER_KEY ||
  !MERCHANT_ID ||
  !TAPPAY_API ||
  !CURRENCY ||
  !REDIS_URL ||
  !WORKERS
) {
  throw new Error(
    "Missing required environment variables (PARTNER_KEY, MERCHANT_ID, TAPPAY_API, CURRENCY, REDIS_URL, WORKERS)"
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

// Worker processing function (shared by all workers)
const paymentWorkerProcessor = async (job) => {
  const { givingData } = job.data; // Destructure jobId
  try {
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

    return { success: true }; // Return the response
  } catch (error) {
    console.error("Payment processing failed in worker:", error);
    throw error;
  }
};

// Create multiple workers
const numberOfWorkers = 5;
for (let i = 0; i < numberOfWorkers; i++) {
  const worker = new Worker("tappay-payments", paymentWorkerProcessor, {
    // Store the worker instance
    connection: REDIS_URL,
    concurrency: 1,
  });

  worker.on("completed", (job, result) => {
    console.log(`Job ${job.id} completed.`);
    //  The result is already stored in redis, so nothing to do here.
  });

  worker.on("failed", (job, err) => {
    console.error(`Job ${job.id} failed with error:`, err);
    // The error is already stored in redis, so nothing to do here.
  });

  worker.on("progress", (job, progress) => {
    console.log(`Job ${job.id} progress: ${progress}`);
  });
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
      const externalResponse = await tapPayPayment(
        phoneNumber,
        prime,
        amount,
        cardholder
      );

      // Tappay success then respond 200
      res.status(200).json(externalResponse);

      // Add a job to the queue to store into DB
      const job = await paymentQueue.add(
        "process-payment",
        {
          givingData,
        },
        {
          jobId: uuidv4(), //Assign a unique ID to the job
        }
      );

      console.log(`Job ${job.id} added to queue for processing.`);
    } catch (error) {
      console.error("Error adding job to payment queue:", error);
      res
        .status(500)
        .json({ error: "Failed to add payment to processing queue." });
    }
  },
};

module.exports = givingController;
