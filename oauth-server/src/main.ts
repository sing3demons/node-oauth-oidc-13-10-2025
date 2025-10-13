import { OAuthServer } from "./app.js";
import { DetailLogger } from "./logger/DetailLogger.js";
import { SummaryLogger } from "./logger/SummaryLogger.js";

async function main() {
  const server = new OAuthServer();

  try {
    // Initialize and start server
    await server.initialize();
    await server.start();

    // Graceful shutdown
    process.on("SIGTERM", async () => {
      console.log("Received SIGTERM signal");
      DetailLogger.getInstance().shutdown();
      SummaryLogger.getInstance().shutdown();
      await server.stop();
      process.exit(0);
    });

    process.on("SIGINT", async () => {
      console.log("Received SIGINT signal");
      await server.stop();
      process.exit(0);
    });

  } catch (error) {
    console.error("Failed to start OAuth Server:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});