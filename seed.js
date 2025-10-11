// seed.js
import mongoose from "mongoose";
import bcrypt from "bcrypt";

const MONGO = process.env.MONGO ?? "mongodb://localhost:27017/oauth_demo";


const userSchema = new mongoose.Schema({ username: String, password: String, name: String, email: String });
const clientSchema = new mongoose.Schema({ client_id: String, redirect_uris: [String], type: String });

const User = mongoose.model("User", userSchema);
const Client = mongoose.model("Client", clientSchema);


async function seed() {
    await mongoose.connect(MONGO);
    console.log("Connected to Mongo:", MONGO);

    await User.deleteMany({});
    await Client.deleteMany({});

    const plain = "password";
    const hashed = await bcrypt.hash(plain, 10);
    await User.create({ username: "alice", password: hashed, name: "Alice Example", email: "alice@example.com" });
    await Client.create({ client_id: "spa-client", redirect_uris: ["http://localhost:3000/callback"], type: "public" });

    console.log("Seed complete: user alice / password:", plain);
    await mongoose.disconnect();
    console.log("Disconnected from Mongo");
    process.exit(0);
}

seed().catch(console.error);