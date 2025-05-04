const crypto = require("crypto");
const hashService = require("./hash-service");
const nodemailer = require("nodemailer");
const smsSid = process.env.SMS_SID;

const smsAuthToken = process.env.SMS_AUTH_TOKEN;
const twilio = require("twilio")(smsSid, smsAuthToken, {
  lazyloading: true,
});
class OtpService {
  async generateOtp() {
    const otp = crypto.randomInt(1000, 9999);
    return otp;
  }

  async sendBySms(phone, otp) {
    return await twilio.messages.create({
      to: phone,
      from: process.env.SMS_FROM_NUMBER,
      body: `Your Vocalix OTP is ${otp}`,
    });
  }

  async sendByEmail(email, otp) {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: 587,

      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Your Vocalix OTP",
      text: `Your Vocalix OTP is ${otp}`,
    };

    await transporter.sendMail(mailOptions);
  }

  verifyOtp(hashedOtp, data) {
    let computedHash = hashService.hashOtp(data);
    if (computedHash === hashedOtp) {
      return true;
    }
    return false;
  }
}

module.exports = new OtpService();
