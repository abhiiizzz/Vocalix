const OtpService = require("../services/otp-service");
const userService = require("../services/user-service");
const hashService = require("../services/hash-service");
const otpService = require("../services/otp-service");
//const TokenService = require("../services/token-service");
const tokenService = require("../services/token-service");
const UserDto = require("../dtos/user-dto");

class AuthController {
  async sendOtp(req, res) {
    const { phone } = req.body;
    if (!phone) {
      res.status(400).json({ message: "Phone field is required" });
    }

    const otp = await OtpService.generateOtp();

    const ttl = 1000 * 60 * 2;
    const expires = Date.now() + ttl;
    const data = `${phone}.${otp}.${expires}`;
    const hash = hashService.hashOtp(data);

    try {
      // await OtpService.sendBySms(phone,otp);
      res.json({
        hash: `${hash}.${expires}`,
        phone,
        otp,
      });
    } catch (err) {
      console.log(err);
      res.status(500).json({ message: "Message sending failed.." });
    }
  }

  async verifyOtp(req, res) {
    const { otp, hash, phone } = req.body;

    // Validate request body
    if (!otp || !hash || !phone) {
      return res.status(400).json({ message: "All fields are required!" }); // Add 'return'
    }

    const [hashedOtp, expires] = hash.split(".");
    if (Date.now() > +expires) {
      return res.status(400).json({ message: "OTP expired!" }); // Add 'return'
    }

    // Verify OTP
    const data = `${phone}.${otp}.${expires}`;
    const isValid = otpService.verifyOtp(hashedOtp, data);
    if (!isValid) {
      return res.status(400).json({ message: "Invalid OTP" }); // Add 'return'
    }

    // Find or create user
    let user;
    try {
      user = await userService.findUser({ phone });
      if (!user) {
        user = await userService.createUser({ phone });
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Database error" }); // Add 'return'
    }

    // Generate tokens
    const { accessToken, refreshToken } = tokenService.generateTokens({
      _id: user._id,
      activated: false,
    });

    await tokenService.storeRefreshToken(refreshToken, user._id);

    // Set refresh token as cookie and send access token
    res.cookie("refreshToken", refreshToken, {
      maxAge: 1000 * 60 * 60 * 24 * 30,
      httpOnly: true,
    });

    res.cookie("accessToken", accessToken, {
      maxAge: 1000 * 60 * 60 * 24 * 30,
      httpOnly: true,
    });

    const userDto = new UserDto(user);

    return res.json({ aauth: true, user: userDto });
  }

  async refresh(req, res) {
    const { refreshToken: refreshTokenFromCookie } = req.cookies;

    let userData;
    try {
      userData = await tokenService.verifyRefreshToken(refreshTokenFromCookie);
    } catch (err) {
      return res.status(401).json({ message: "Invalid Token" });
    }

    try {
      const token = await tokenService.findRefreshToken(
        userData._id,
        refreshTokenFromCookie
      );
      if (!token) {
        return res.status(401).json({ message: "Invalid Token" });
      }
    } catch (err) {
      return res.status(500).json({ message: "Internal Error" });
    }
    const user = await userService.findUser({ _id: userData._id });
    if (!user) {
      return res.status(404).json({ message: "No user" });
    }
    // Generate new tokens
    const { refreshToken, accessToken } = tokenService.generateTokens({
      _id: userData._id,
    });

    // Update refresh token
    try {
      await tokenService.updateRefreshToken(userData._id, refreshToken);
    } catch (err) {
      return res.status(500).json({ message: "Internal error" });
    }
    // put in cookie
    res.cookie("refreshToken", refreshToken, {
      maxAge: 1000 * 60 * 60 * 24 * 30,
      httpOnly: true,
    });
    res.cookie("accessToken", accessToken, {
      maxAge: 1000 * 60 * 60 * 24 * 30,
      httpOnly: true,
    });
    // response
    const userDto = new UserDto(user);
    res.json({ user: userDto, auth: true });
  }

  async logout(req, res) 
  {
    const { refreshToken } = req.cookies;
    
    await tokenService.removeToken(refreshToken);
    
    res.clearCookie("refreshToken");
    res.clearCookie("accessToken");
    res.json({ user: null, auth: false });
  }
}

module.exports = new AuthController();
