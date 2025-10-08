const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static('public')); // serve index.html and static files

// M-PESA credentials - replace with your production keys
const MPESA_ENV = 'production'; // or 'sandbox'
const CONSUMER_KEY = 'YOUR_CONSUMER_KEY';
const CONSUMER_SECRET = 'YOUR_CONSUMER_SECRET';
const SHORTCODE = 'YOUR_SHORTCODE';
const PASSKEY = 'YOUR_PASSKEY';

// Get OAuth token from Safaricom
async function getAccessToken() {
  const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
  const url =
    MPESA_ENV === 'sandbox'
      ? 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
      : 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Basic ${auth}`
      }
    });
    return response.data.access_token;
  } catch (error) {
    console.error('Error fetching access token:', error.response.data);
    throw error;
  }
}

// Endpoint to initiate Lipa Na M-PESA STK Push
app.post('/buy-bundle', async (req, res) => {
  const { phone, amount, bundleName } = req.body;

  try {
    const token = await getAccessToken();
    const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    const password = Buffer.from(`${SHORTCODE}${PASSKEY}${timestamp}`).toString('base64');

    const stkUrl =
      MPESA_ENV === 'sandbox'
        ? 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
        : 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest';

    const stkData = {
      BusinessShortCode: SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: amount,
      PartyA: phone,
      PartyB: SHORTCODE,
      PhoneNumber: phone,
      CallBackURL: 'https://yourdomain.com/callback',
      AccountReference: bundleName,
      TransactionDesc: `Purchase of ${bundleName}`
    };

    const response = await axios.post(stkUrl, stkData, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('STK Push Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Payment initiation failed' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
