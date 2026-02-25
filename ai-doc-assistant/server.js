import dotenv from "dotenv";
dotenv.config();

import express from "express";
import uploadRoutes from "./src/routes/upload.routes.js";
import cors from "cors";

const app = express();

app.use(
  cors({
    origin: "*",
  }),
);
app.use(express.json());

// Root route
app.get("/", (req, res) => {
  res.send("AI Document Assistant Backend Running 🚀");
});

// Upload routes
app.use("/upload", uploadRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error("Global Error:", err.message);

  res.status(400).json({
    error: err.message || "Something went wrong",
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
