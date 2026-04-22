const jwt = require("jsonwebtoken");
const logger = require("./logger");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

// Verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  
  if (!token) {
    logger.warn("No token provided");
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    logger.warn("Invalid token:", err.message);
    res.status(401).json({ error: "Invalid token" });
  }
};

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: "7d" });
};

module.exports = {
  verifyToken,
  generateToken,
  JWT_SECRET
};
