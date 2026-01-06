const path = require("path");
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const morgan = require("morgan");
const globalError = require("./middlewares/errorMiddleware");
const { initSocket } = require("./utils/socket");

dotenv.config({ path: "config.env" });

const app = express();

// Database connection
const dbConnection = require("./config/database");
const mountRoutes = require("./routes");
dbConnection();

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "uploads")));

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
  console.log(`mode: ${process.env.NODE_ENV}`);
}

// Mount Routes
mountRoutes(app);

// Global error handling middleware for express
app.use(globalError);

const PORT = process.env.PORT || 8080;
const server = app.listen(PORT, () => {
  console.log(`app running on port ${PORT}`);
});
initSocket(server);

process.on("unhandledRejection", (err) => {
  console.error(`unhandledRejection Errors:${err.name} | ${err.message}`);
  server.close(() => {
    console.error(`Shutting down....`);
    process.exit(1);
  });
});
