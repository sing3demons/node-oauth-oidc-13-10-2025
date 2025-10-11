import { MongoClient, Db } from "mongodb";
import { config } from "../config/index.js";
import { MongoCollections } from "../models/collections.js";

export class DatabaseService {
  private static instance: DatabaseService;
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private collections: MongoCollections | null = null;

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public async connect(): Promise<void> {
    try {
      this.client = new MongoClient(config.database.mongodb, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      await this.client.connect();
      
      // Extract database name from connection string
      const url = new URL(config.database.mongodb);
      const dbName = url.pathname.slice(1) || 'oauth_demo';
      
      this.db = this.client.db(dbName);
      this.collections = new MongoCollections(this.db);
      
      // Create indexes
      await this.collections.createIndexes();
      
      console.log(`✅ Connected to MongoDB: ${config.database.mongodb}`);
    } catch (error) {
      console.error("❌ MongoDB connection failed:", error);
      process.exit(1);
    }
  }

  public async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.close();
        console.log("✅ Disconnected from MongoDB");
      }
    } catch (error) {
      console.error("❌ MongoDB disconnection failed:", error);
    }
  }

  public getDb(): Db {
    if (!this.db) {
      throw new Error("Database not connected. Call connect() first.");
    }
    return this.db;
  }

  public getCollections(): MongoCollections {
    if (!this.collections) {
      throw new Error("Database not connected. Call connect() first.");
    }
    return this.collections;
  }

  public getClient(): MongoClient {
    if (!this.client) {
      throw new Error("Database not connected. Call connect() first.");
    }
    return this.client;
  }
}