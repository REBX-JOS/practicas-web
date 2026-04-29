const PAYPAL_CONFIG = {
  clientId: process.env.PAYPAL_CLIENT_ID,
  clientSecret: process.env.PAYPAL_CLIENT_SECRET,
  baseUrl: process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com',
};

function validatePaypalConfig() {
  if (!PAYPAL_CONFIG.clientId || !PAYPAL_CONFIG.clientSecret) {
    throw new Error('PayPal credentials missing in environment');
  }
}

module.exports = {
  PAYPAL_CONFIG,
  validatePaypalConfig,
};
