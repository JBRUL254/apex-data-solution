const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static HTML
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());

// === Replace these with your real Daraja (M-PESA) credentials ===
const MPESA_ENV = "sandbox"; // or "production"
const CONSUMER_KEY = "YOUR_CONSUMER_KEY";
const CONSUMER_SECRET = "YOUR_CONSUMER_SECRET";
const SHORTCODE = "YOUR_SHORTCODE";
const PASSKEY = "YOUR_PASSKEY";
const CALLBACK_URL = "https://yourdomain.com/callback"; // optional

// Function to generate access token
async function getAccessToken() {
  const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
  const url =
    MPESA_ENV === "production"
      ? "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
      : "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";

  const response = await axios.get(url, {
    headers: { Authorization: `Basic ${auth}` }
  });
  return response.data.access_token;
}

// Function to initiate Lipa Na M-PESA STK Push
async function lipaNaMpesa(phone, amount, accountRef, description) {
  const token = await getAccessToken();
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const password = Buffer.from(`${SHORTCODE}${PASSKEY}${timestamp}`).toString('base64');

  const url =
    MPESA_ENV === "production"
      ? "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
      : "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest";

  const payload = {
    BusinessShortCode: SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: amount,
    PartyA: phone,
    PartyB: SHORTCODE,
    PhoneNumber: phone,
    CallBackURL: CALLBACK_URL,
    AccountReference: accountRef,
    TransactionDesc: description
  };

  const response = await axios.post(url, payload, {
    headers: { Authorization: `Bearer ${token}` }
  });

  return response.data;
}

// === Endpoint to handle bundle purchase ===
app.post('/buy', async (req, res) => {
  const { phone, bundleName, amount } = req.body;
  try {
    const result = await lipaNaMpesa(phone, amount, bundleName, `Purchase ${bundleName}`);
    res.json(result);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: 'Payment failed' });
  }
});

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
