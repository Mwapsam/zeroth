const mongoose = require('mongoose');

mongoose.set('strictQuery', true);
mongoose.set('bufferCommands', false);

let isConnected = false;

const connectDB = async (retries = 5) => {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('❌ MONGODB_URI is not defined in .env');

    const safeUri = uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
    console.log(`🔌 Connecting to MongoDB: ${safeUri}`);

    const options = {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
        maxPoolSize: 10,
        minPoolSize: 2,
        autoIndex: process.env.NODE_ENV !== 'production',
        family: 4
    };

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const conn = await mongoose.connect(uri, options);
            isConnected = true;
            console.log(`✅ MongoDB connected → ${conn.connection.host}/${conn.connection.name}`);
            return conn;
        } catch (err) {
            console.error(`❌ MongoDB connection attempt ${attempt}/${retries} failed: ${err.message}`);
            if (attempt === retries) throw err;
            const delay = Math.min(2000 * attempt, 10000);
            console.log(`⏳ Retrying in ${delay / 1000}s...`);
            await new Promise((r) => setTimeout(r, delay));
        }
    }
};

mongoose.connection.on('connected', () => {
    isConnected = true;
    console.log('🟢 Mongoose: connected');
});
mongoose.connection.on('error', (err) => {
    console.error('🔴 Mongoose error:', err.message);
});
mongoose.connection.on('disconnected', () => {
    isConnected = false;
    console.warn('🟡 Mongoose: disconnected');
});
mongoose.connection.on('reconnected', () => {
    isConnected = true;
    console.log('🟢 Mongoose: reconnected');
});

const closeDB = async () => {
    if (!isConnected) return;
    try {
        await mongoose.connection.close(false);
        console.log('🔒 MongoDB connection closed');
    } catch (err) {
        console.error('Error closing MongoDB:', err.message);
    }
};

const dbState = () => {
    const map = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    return map[mongoose.connection.readyState] || 'unknown';
};

module.exports = connectDB;
module.exports.closeDB = closeDB;
module.exports.dbState = dbState;
module.exports.isConnected = () => isConnected;