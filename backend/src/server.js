const dotenv = require("dotenv");
dotenv.config();

const { createApp } = require("./app");

const PORT = Number(process.env.PORT || 4000);

async function main() {
  const app = await createApp();
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`API listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start server:", err);
  process.exit(1);
});

