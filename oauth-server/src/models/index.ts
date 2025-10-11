import mongoose, { Schema, model } from "mongoose";
import type { User, Client, AuthCode, RefreshToken } from "../types/index.js";

// Schemas
const userSchema = new Schema<User>({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true }
});

const clientSchema = new Schema<Client>({
    client_id: { type: String, unique: true, required: true },
    redirect_uris: [{ type: String, required: true }],
    type: { type: String, required: true }
});

const authCodeSchema = new Schema<AuthCode>({
    code: { type: String, required: true },
    client_id: { type: String, required: true },
    user_id: { type: String, required: true },
    redirect_uri: { type: String, required: true },
    scope: { type: String, required: true },
    code_challenge: { type: String, required: true },
    expires_at: { type: Date, required: true }
});

const refreshTokenSchema = new Schema<RefreshToken>({
    token: { type: String, required: true },
    user_id: { type: String, required: true },
    client_id: { type: String, required: true },
    expires_at: { type: Date, required: true },
    revoked: { type: Boolean, default: false }
});

export const UserModel = model<User>("User", userSchema);
export const ClientModel = model<Client>("Client", clientSchema);
export const AuthCodeModel = model<AuthCode>("AuthCode", authCodeSchema);
export const RefreshTokenModel = model<RefreshToken>("RefreshToken", refreshTokenSchema);