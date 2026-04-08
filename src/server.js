import app from "./app.js";
import env from "./config/env.js";
import { connectDatabase } from "./database/mongo.js";
import { ensureSeedData } from "./database/seed.js";

const startServer = async () => {
  await connectDatabase();
  await ensureSeedData();

  app.listen(env.port, () => {
    console.log(`Sharbelle backend listening on port ${env.port}`);
  });
};

startServer().catch((error) => {
  console.error("Failed to start backend", error);
  process.exit(1);
});
