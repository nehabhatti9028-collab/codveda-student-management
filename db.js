const { MongoClient } = require("mongodb");
require("dotenv").config();

const client = new MongoClient(process.env.MONGO_URI);

async function connectDB() {
    try {
        await client.connect();
        console.log("MongoDB connected successfully!");

        return client.db("CodvedaDB");
    } catch (error) {
        console.log("MongoDB connection failed:", error);
        throw error;
    }
}

module.exports = connectDB;