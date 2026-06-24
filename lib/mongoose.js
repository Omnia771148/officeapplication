import mongoose from 'mongoose';

const MONGODB_URI = process.env.MongoURL;

if (!MONGODB_URI) {
    throw new Error('Please define the MongoURL environment variable inside .env');
}

let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

async function startBackgroundStatusUpdater() {
    if (global.statusUpdaterInterval) return;
    try {
        const { updateAllRestaurantStatuses } = await import("./restaurantStatusHelper");
        // Run once immediately
        updateAllRestaurantStatuses();
        // Run every 60 seconds to ensure status updates exactly at closing/opening time
        global.statusUpdaterInterval = setInterval(() => {
            updateAllRestaurantStatuses();
        }, 60000);
    } catch (error) {
        console.error("Failed to initialize background status updater:", error);
    }
}

async function dbConnect() {
    // Start background status updater
    startBackgroundStatusUpdater();

    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
        };

        cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
            return mongoose;
        });
    }
    cached.conn = await cached.promise;
    return cached.conn;
}

export default dbConnect;
