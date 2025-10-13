import express, { Application } from "express";
import cors from "cors";
import { DatabaseService } from "./services/database.service.js";
import { CryptoService } from "./services/crypto.service.js";
import { logMiddleware, traceIdMiddleware } from "./middleware.js";
 import { routes } from "./routes/index.js";
import { config } from "./config/index.js";

export class OAuthServer {
  private app: Application;
  private databaseService: DatabaseService;
  private cryptoService: CryptoService;

  constructor() {
    this.app = express();
    this.databaseService = DatabaseService.getInstance();
    this.cryptoService = CryptoService.getInstance();
  }

  public async initialize(): Promise<void> {
    console.log(`🚀 Initializing ${config.service.name} v${config.service.version}`);
    
    // Initialize services
    await this.initializeServices();
    
    // Setup middleware
    this.setupMiddleware();
    
    // Setup routes
    this.setupRoutes();
    
    console.log("✅ OAuth Server initialized successfully");
  }

  private async initializeServices(): Promise<void> {
    // Initialize database connection
    await this.databaseService.connect();
    
    // Initialize crypto service (load keys)
    await this.cryptoService.initialize();
  }

  private setupMiddleware(): void {
    // CORS
    this.app.use(cors(config.cors));
    
    // Body parsing
    this.app.use(express.urlencoded({ extended: false }));
    this.app.use(express.json());

    // Logging & Tracing
    this.app.use(traceIdMiddleware);
    this.app.use(logMiddleware);
  }

  private setupRoutes(): void {
    // Mount all routes
    this.app.use(routes);
    
    // 404 handler
    this.app.use("*", (req, res) => {
      res.status(404).json({
        error: "not_found",
        message: "Endpoint not found",
        path: req.originalUrl
      });
    });
  }

  public async start(): Promise<void> {
    const { port } = config.server;
    return new Promise((resolve) => {
      this.app.listen(port, () => {
        console.log(`✅ OAuth Server running on port ${port}`);
        console.log(`📋 OpenID Configuration: /.well-known/openid-configuration`);
        resolve();
      });
    });
  }

  public async stop(): Promise<void> {
    console.log("🛑 Shutting down OAuth Server...");
    
    // Disconnect from database
    await this.databaseService.disconnect();
    
    console.log("✅ OAuth Server stopped gracefully");
  }

  public getApp(): Application {
    return this.app;
  }
}