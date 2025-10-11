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
        const demoUser = new UserModel({
            username: "alice",
            password: hashedPassword,
            name: "Alice Demo",
            email: "alice@example.com"
        });
        await demoUser.save();

        // Create demo client
        const demoClient = new ClientModel({
            client_id: "spa-client",
            redirect_uris: ["http://localhost:3000/callback"],
            type: "public"
        });
        await demoClient.save();

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