require("dotenv").config({ quiet: true });

const express = require("express");
const connectDatabase = require("./database/db");
const routes = require("./routes/route");
const errorHandler = require("./middleware/error.middleware");

const app = express();

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
