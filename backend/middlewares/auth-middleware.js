const tokenService = require("../services/token-service");

module.exports = async function (req, res, next) {
  try {
    const { accessToken } = req.cookies;
    if (!accessToken) {
      return res.status(401).json({ message: "Access token missing" });
    }
    const userData = await tokenService.verifyAccessToken(accessToken);

    if (!userData) {
      return res.status(401).json({ message: "Invalid Token" });
    }

    req.user = userData;
    console.log(userData);
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid Token" });
  }
};
