require("dotenv").config({ quiet: true });

const express = require("express");
const cors = require("cors");
const connectDatabase = require("./database/db");
const routes = require("./routes/route");
const cron = require("node-cron");
const errorHandler = require("./middleware/error.middleware");
const { settleFixedDeposits } = require("./utils/fixedDepositSettlement");
const { settleRecurringDeposits } = require("./utils/recurringDepositSettlement");
const { settleLoanEmis } = require("./utils/loanSettlement");

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

// On the hour, every hour, in the bank's own timezone rather than the server's.
const SETTLEMENT_SCHEDULE = process.env.DEPOSIT_SWEEP_CRON || "0 * * * *";
const SETTLEMENT_TIMEZONE = process.env.ANALYTICS_TIMEZONE || "Asia/Kolkata";

// Deposits mature on their own date, so the sweep runs to a schedule rather
// than waiting for the customer to open the page. Only the real server starts
// it, never a test that imports the app.
function startDepositSweep() {
  const run = async () => {
    try {
      const fixed = await settleFixedDeposits();
      const recurring = await settleRecurringDeposits();
      const loans = await settleLoanEmis();

      if (fixed.matured || fixed.reminded) {
        console.log(
          `Fixed deposits: ${fixed.matured} matured, ${fixed.reminded} reminders sent`,
        );
      }

      if (recurring.collected || recurring.missed || recurring.matured || recurring.reminded) {
        console.log(
          `Recurring deposits: ${recurring.collected} collected, ${recurring.missed} missed, ${recurring.matured} matured, ${recurring.reminded} reminders sent`,
        );
      }
      if (loans.collected || loans.missed || loans.repaid || loans.unblocked) {
        console.log(
          `Loan EMIs: ${loans.collected} collected, ${loans.missed} missed, ${loans.blocked} accounts blocked, ${loans.unblocked} unblocked, ${loans.repaid} repaid`,
        );
      }
    } catch (error) {
      console.error("Deposit sweep failed:", error.message);
    }
  };

  if (!cron.validate(SETTLEMENT_SCHEDULE)) {
    console.error(`Invalid DEPOSIT_SWEEP_CRON "${SETTLEMENT_SCHEDULE}", sweep not scheduled`);
    return;
  }

  // Cron never backfills, so anything that fell due while the server was down
  // is settled now instead of waiting for the next slot.
  run();

  cron.schedule(SETTLEMENT_SCHEDULE, run, { timezone: SETTLEMENT_TIMEZONE });
  console.log(`Deposit sweep scheduled "${SETTLEMENT_SCHEDULE}" (${SETTLEMENT_TIMEZONE})`);
}

async function startServer() {
  try {
    await connectDatabase();
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
      startDepositSweep();
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
