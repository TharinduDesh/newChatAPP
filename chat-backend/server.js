const expressServer = require("express");
const mongooseServer = require("mongoose");
const corsServer = require("cors");
const dotenvServer = require("dotenv");
const pathServer = require("path"); // For serving static files and path joining
const http = require("http"); // Required for Socket.IO
const { Server } = require("socket.io"); // Import Server class from socket.io
const { initializeSocketIO, activeUsers } = require("./socket/socketHandlers"); // Import your socket handlers
const adminAuthRoutes = require("./routes/adminAuthRoutes");
const adminUserRoutes = require("./routes/adminUserRoutes");
const cron = require("node-cron");
const UserForCron = require("./models/User");
const activityLogRoutes = require("./routes/activityLogRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");

// Load environment variables from .env file
dotenvServer.config();

console.log("✅ JWT Secret Loaded:", process.env.JWT_SECRET);

const appServer = expressServer();
const httpServer = http.createServer(appServer); // Create HTTP server for Express app

// Initialize Socket.IO and pass the HTTP server
// Configure CORS for Socket.IO
const io = new Server(httpServer, {
  pingTimeout: 60000, // How long to wait for a ping response before closing connection
  cors: {
    origin: "*", // IMPORTANT: For production, restrict this to your Flutter app's actual origin(s).
    // Example: "http://localhost:YOUR_FLUTTER_PORT" or your deployed app's URL.
    // methods: ["GET", "POST"] // Optional: specify allowed methods for Socket.IO CORS
  },
});

// Global Express Middleware
appServer.use(corsServer()); // Enable Cross-Origin Resource Sharing for HTTP requests
appServer.use(expressServer.json()); // Parse JSON request bodies
appServer.set("socketio", io); // to make `io` available in your routes via req.app.get()
appServer.set("activeUsers", activeUsers);

// Initialize your custom Socket.IO event handlers
initializeSocketIO(io);

// --- MongoDB Connection ---
const MONGO_URI_SERVER =
  process.env.MONGO_URI || "mongodb://localhost:27017/chatapp";
mongooseServer
  .connect(MONGO_URI_SERVER)
  .then(() =>
    console.log("MongoDB Connected Successfully! URI:", MONGO_URI_SERVER)
  )
  .catch((err) => console.error("MongoDB Connection Error:", err.message));

// --- Serve Static Files (for uploaded profile pictures and group pictures) ---
// This makes files in the 'uploads' directory accessible via HTTP
// Example: 'http://localhost:5000/uploads/profile_pictures/avatar-123.jpg'
appServer.use(
  "/uploads",
  expressServer.static(pathServer.join(__dirname, "uploads"))
);
console.log(
  `Serving static files from: ${pathServer.join(__dirname, "uploads")}`
);

// ** NEW: Scheduled job to permanently delete old deactivated accounts **
// This schedule runs once every day at 1:05 AM.
cron.schedule("5 1 * * *", async () => {
  const sevenDaysAgo = new Date(new Date().setDate(new Date().getDate() - 7));
  console.log(
    `[CRON JOB] Running job to delete users deactivated before ${sevenDaysAgo.toISOString()}`
  );

  try {
    const result = await UserForCron.deleteMany({
      deletedAt: { $lte: sevenDaysAgo }, // Find users soft-deleted 7 or more days ago
    });

    if (result.deletedCount > 0) {
      console.log(
        `[CRON JOB] Successfully deleted ${result.deletedCount} user(s).`
      );
    } else {
      console.log(`[CRON JOB] No old deactivated users to delete.`);
    }
  } catch (error) {
    console.error("[CRON JOB] Error during permanent user deletion:", error);
  }
});

// --- Import API Routes ---
const authRoutesServer = require("./routes/authRoutes");
const userRoutesServer = require("./routes/userRoutes");
const conversationRoutesServer = require("./routes/conversationRoutes");
const messageRoutesServer = require("./routes/messageRoutes");
const adminConversationRoutes = require("./routes/adminConversationRoutes");
const adminMessageRoutes = require("./routes/adminMessageRoutes");

// --- Use API Routes ---
// All authentication-related routes will be prefixed with /api/auth
appServer.use("/api/auth", authRoutesServer);
// All user-related routes (profile, etc.) will be prefixed with /api/users
appServer.use("/api/users", userRoutesServer);
// All conversation-related routes will be prefixed with /api/conversations
appServer.use("/api/conversations", conversationRoutesServer);
// All message-related routes will be prefixed with /api/messages
appServer.use("/api/messages", messageRoutesServer);

appServer.use("/api/admin/auth", adminAuthRoutes);

appServer.use("/api/admin/users", adminUserRoutes);

appServer.use("/api/logs", activityLogRoutes);

appServer.use("/api/analytics", analyticsRoutes);

appServer.use("/api/admin/conversations", adminConversationRoutes);

appServer.use("/api/admin/messages", adminMessageRoutes);

// --- Simple Welcome Route (for testing if server is up) ---
appServer.get("/", (req, res) => {
  res.send("Welcome to the Modern Chat App Backend with Socket.IO!");
});

// --- Server Listening ---
// IMPORTANT: Use httpServer.listen() instead of appServer.listen() for Socket.IO to work
const PORT_SERVER = process.env.PORT || 5000; // Use 5000 as per your correction
httpServer.listen(PORT_SERVER, () => {
  console.log(
    `Server (with Socket.IO) running on http://localhost:${PORT_SERVER}`
  );
  console.log(
    `API Base URL for Flutter: http://YOUR_MACHINE_IP:${PORT_SERVER} or http://10.0.2.2:${PORT_SERVER} for Android Emulator`
  );
  console.log(
    `Profile pictures will be served from /uploads route on this server.`
  );
});
