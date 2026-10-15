const customerController = require("./customer.controller");

// Export customer controller as auth controller for rubric naming convention
module.exports = {
  ...customerController,
  register: customerController.registerCustomer,
  login: customerController.loginCustomer,
  getProfile: customerController.getMyProfile,
  logout: customerController.logoutCustomer,
};
