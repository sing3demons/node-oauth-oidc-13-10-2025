import { DatabaseService } from "./services/database.service.js";
import { UserModel, ClientModel } from "./models/index.js";
import bcrypt from "bcrypt";

const databaseService = DatabaseService.getInstance();

async function seedDatabase() {
    try {
        await databaseService.connect();
        console.log("Connected to database");

        // Clear existing data
        await UserModel.deleteMany({});
        await ClientModel.deleteMany({});

        // Create demo user
        const hashedPassword = await bcrypt.hash("password", 10);
        await UserModel.create({
            username: "alice",
            password: hashedPassword,
            name: "Alice Demo",
            email: "alice@example.com"
        });

        // Create demo client
        await ClientModel.create({
            clientId: "spa-client",
            name: "SPA Client Demo",
            redirectUris: ["http://localhost:3000/callback"],
            grantTypes: ["authorization_code", "refresh_token"],
            responseTypes: ["code"],
            scopes: ["openid", "profile", "email"],
            type: "public",
            active: true
        });

        console.log("✅ Database seeded successfully!");
        console.log("Demo user: alice / password");
        console.log("Demo client: spa-client");
        
        process.exit(0);
    } catch (error) {
        console.error("Error seeding database:", error);
        process.exit(1);
    }
}

seedDatabase();