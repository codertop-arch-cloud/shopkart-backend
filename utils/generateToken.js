const jwt = require("jsonwebtoken");

const generateToken = (customerId) => {
  return jwt.sign(
    {
      customerId: customerId,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "1d",
    }
  );
};

module.exports = generateToken;