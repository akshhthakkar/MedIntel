const axios = require('axios');

const sendEmail = async (options) => {
  const brevoApiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'inframax07@gmail.com';
  const senderName = process.env.BREVO_SENDER_NAME || 'MediCare';

  if (!brevoApiKey) {
    console.warn('BREVO_API_KEY not set, skipping email send to:', options.email);
    console.log(`[EMAIL CONTENT]\nSubject: ${options.subject}\nBody:\n${options.message}`);
    return;
  }

  const payload = {
    sender: {
      name: senderName,
      email: senderEmail
    },
    to: [
      {
        email: options.email
      }
    ],
    subject: options.subject,
    htmlContent: options.html || `<p>${options.message.replace(/\n/g, '<br>')}</p>`,
    textContent: options.message
  };

  try {
    const res = await axios.post('https://api.brevo.com/v3/smtp/email', payload, {
      headers: {
        'api-key': brevoApiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    return res.data;
  } catch (error) {
    console.error('Brevo API Error:', error.response?.data || error.message);
    throw new Error('Email could not be sent via Brevo');
  }
};

module.exports = sendEmail;
