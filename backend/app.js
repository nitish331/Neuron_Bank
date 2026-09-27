require("dotenv").config({ quiet: true });

const express = require("express");
const cors = require("cors");
const connectDatabase = require("./database/db");
const routes = require("./routes/route");
const errorHandler = require("./middleware/error.middleware");

const app = express();

const clientOrigins = (
  process.env.CLIENT_ORIGINS || "http://localhost:3001,http://localhost:3002"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: clientOrigins,
    credentials: true,
  }),
);

app.use(express.json());

app.use(routes);
app.use(errorHandler);

const port = process.env.PORT || 3000;

async function startServer() {
  try {
    await connectDatabase();
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.error("Unable to start server:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
