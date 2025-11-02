// @desc    Get API help info
// @route   GET /api/help
// @access  Public
exports.getHelp = (req, res) => {
  res.json({
    success: true,
    message: "Welcome to the VooDooHome API! Available endpoints:",
    endpoints: [
      { method: "POST", path: "/api/auth/register", description: "Register a new user" },
      { method: "POST", path: "/api/auth/login", description: "Login as a user" },
      { method: "GET", path: "/api/products", description: "Get all products" },
      { method: "GET", path: "/api/products/:id", description: "Get a single product" },
      { method: "POST", path: "/api/products", description: "Create a new product (auth required)" },
      { method: "GET", path: "/api/rooms", description: "Get all rooms (auth required)" },
      { method: "POST", path: "/api/rooms", description: "Create a new room (auth required)" },
      { method: "GET", path: "/api/help", description: "Get API help info" }
    ]
  });
};