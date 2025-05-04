const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    phone: { type: String },
    email: { type: String },
    name: { type: String },
    avatar: {
      type: String,
      get: (avatar) => {
        if (avatar) {
          return `${process.env.BASE_URL}${avatar}`;
        }
        return avatar;
      },
    },
    activated: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
  }
);

userSchema.pre("validate", function (next) {
  if (!this.phone && !this.email) {
    // Invalidate both fields if neither is provided
    this.invalidate("phone", "Either phone or email is required.");
    this.invalidate("email", "Either phone or email is required.");
  }
  next();
});

module.exports = mongoose.model("User", userSchema, "users");
