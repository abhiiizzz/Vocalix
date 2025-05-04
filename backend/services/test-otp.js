const otpService = require('./otp-service');

async function testEmailOtp() {
    const email = 'test@example.com'; // Replace with a valid email for testing
    const otp = await otpService.generateOtp();
    await otpService.sendByEmail(email, otp);
    console.log(`Sent OTP ${otp} to ${email}`);
}

testEmailOtp();
