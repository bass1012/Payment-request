const { generateAndSendOtp, verifyAndConsumeOtp } = require('../services/otp.service');

async function sendOtpHandler(req, res) {
  const result = await generateAndSendOtp(req.user);
  return res.json({ success: true, message: 'Un code OTP a été envoyé à votre adresse e-mail.' });
}

async function verifyOtpHandler(req, res) {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Code OTP requis' });
  }

  const isValid = await verifyAndConsumeOtp(req.user.id, code);
  if (!isValid) {
    return res.status(400).json({ error: 'Code OTP invalide ou expiré' });
  }
  return res.json({ success: true });
}

module.exports = {
  sendOtpHandler,
  verifyOtpHandler,
};
