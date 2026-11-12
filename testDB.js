const connectDB = require("./db");

async function test() {
    const db = await connectDB();
    console.log("Database name:", db.databaseName);
    process.exit(0);
}

test();