import mongoose from "mongoose";
import { config } from "../config/index.js";

export class DatabaseService {
  private static instance: DatabaseService;

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public async connect(): Promise<void> {
    try {
      await mongoose.connect(config.database.mongodb);
      console.log(`✅ Connected to MongoDB: ${config.database.mongodb}`);
    } catch (error) {
      console.error("❌ MongoDB connection failed:", error);
      process.exit(1);
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await mongoose.disconnect();
      console.log("✅ Disconnected from MongoDB");
    } catch (error) {
      console.error("❌ MongoDB disconnection failed:", error);
    }
  }

  public getConnection() {
    return mongoose.connection;
  }
}