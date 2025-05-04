const router = require("express").Router();
const authController = require("./controllers/auth-controller");
const hashService = require("../backend/services/hash-service");
const activateController = require("./controllers/activate-controller");
const authMiddleware = require("./middlewares/auth-middleware");
const roomsController = require("./controllers/rooms-controller");

const otpService = require("./services/otp-service");

// Existing routes...
router.post("/api/send-otp", authController.sendOtp);
router.post("/api/verify-otp", authController.verifyOtp);
router.post("/api/verify-email-otp", authController.verifyEmailOtp);
router.post("/api/activate", authMiddleware, activateController.activate);
router.get("/api/refresh", authController.refresh);
router.post("/api/logout", authMiddleware, authController.logout);
router.get("/api/rooms", authMiddleware, roomsController.index);
router.post("/api/rooms", authMiddleware, roomsController.create);
router.get("/api/rooms/:roomId", authMiddleware, roomsController.show);
// New route for sending email OTP
router.post("/api/send-email-otp", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ message: "Email field is required" });
  }
  const otp = await otpService.generateOtp();

  const ttl = 1000 * 60 * 2;
  const expires = Date.now() + ttl;
  const data = `${email}.${otp}.${expires}`;
  const hash = hashService.hashOtp(data);

  try {
    await otpService.sendByEmail(email, otp);
    res.json({
      hash: `${hash}.${expires}`,
      email,
      otp,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Message sending failed.." });
  }
});

module.exports = router;
