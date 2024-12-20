const Jimp = require("jimp"); // Correct import for Jimp v0.16.1
const path = require("path");
const userService = require("../services/user-service");
const UserDto = require("../dtos/user-dto");

class ActivateController {
  async activate(req, res) {
    // Extract name and avatar from the request body
    const { name, avatar } = req.body;

    // Check if name and avatar are provided
    if (!name || !avatar) {
      return res.status(400).json({ message: "All fields are required!" });
    }

    // Validate avatar data
    if (!avatar.startsWith("data:image/")) {
      return res.status(400).json({ message: "Invalid image data!" });
    }

    // Extract image type from the data URL
    const matches = avatar.match(/^data:image\/(\w+);base64,/);
    const imageType = matches ? matches[1] : "png"; // Default to 'png' if type is not found

    // Create a buffer from the base64 data
    const base64Data = avatar.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // Generate a unique image filename
    const imagePath = `${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}.${imageType}`;

    try {
      // Read the image buffer using Jimp
      const jimResp = await Jimp.read(buffer);

      // Resize the image and save it to the storage directory
      await jimResp
        .resize(150, Jimp.AUTO)
        .writeAsync(path.resolve(__dirname, `../storage/${imagePath}`));
    } catch (err) {
      console.error("Error processing image:", err);
      return res.status(500).json({ message: "Could not process the image" });
    }

    // Get the user ID from the request (assuming authentication middleware populates req.user)
    const userId = req.user._id;

    // Update the user data
    try {
      const user = await userService.findUser({ _id: userId });
      if (!user) {
        return res.status(404).json({ message: "User not found!" });
      }
      user.activated = true;
      user.name = name;
      user.avatar = `/storage/${imagePath}`;
      await user.save();

      // Respond with the updated user data
      return res.json({ user: new UserDto(user), auth: true });
    } catch (err) {
      console.error("Error updating user:", err);
      return res.status(500).json({ message: "Something went wrong!" });
    }
  }
}

module.exports = new ActivateController();
