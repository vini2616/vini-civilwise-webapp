const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://Vini:lLVPNz5ehvRJGYBK@cluster0.cjkrwz6.mongodb.net/?appName=Cluster0";

console.log("Testing MongoDB Connection...");
console.log("URI:", MONGO_URI.substring(0, 20) + "...");

mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 })
    .then(() => {
        console.log("✅ MongoDB Connected Successfully!");
        process.exit(0);
    })
    .catch((err) => {
        console.error("❌ MongoDB Connection Failed:");
        console.error(err.message);
        if (err.message.includes('bad auth') || err.message.includes('IP')) {
            console.log("\n⚠️  POSSIBLE CAUSE: IP Address not whitelisted in MongoDB Atlas.");
        }
        process.exit(1);
    });
