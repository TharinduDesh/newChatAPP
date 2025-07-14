// Purpose: Middleware to protect routes by verifying JWT.
const jwtAuthMiddleware = require("jsonwebtoken"); // Renamed
const UserModelAuthMiddleware = require("../models/User"); // Path to User model
const JWT_SECRET_AUTH_MIDDLEWARE = process.env.JWT_SECRET;

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Get token from header (e.g., "Bearer <token>")
      token = req.headers.authorization.split(" ")[1];

      // Verify token
      const decoded = jwtAuthMiddleware.verify(
        token,
        JWT_SECRET_AUTH_MIDDLEWARE
      );

      // Get user from the token payload (excluding password)
      // The payload of our token includes userId
      req.user = await UserModelAuthMiddleware.findById(decoded.userId).select(
        "-password"
      );

      if (!req.user) {
        // This case might happen if the user was deleted after token issuance
        return res
          .status(401)
          .json({ message: "Not authorized, user not found for this token" });
      }
      next(); // Proceed to the next middleware or route handler
    } catch (error) {
      console.error("Token verification error:", error.message);
      if (error.name === "JsonWebTokenError") {
        return res
          .status(401)
          .json({ message: "Not authorized, invalid token" });
      }
      if (error.name === "TokenExpiredError") {
        return res
          .status(401)
          .json({ message: "Not authorized, token expired" });
      }
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  }

  if (!token) {
    return res
      .status(401)
      .json({ message: "Not authorized, no token provided" });
  }
};

module.exports = { protect };
