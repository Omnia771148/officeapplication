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

// Schema for dynamic item collections in the 'restuarents' database
const RestaurantItemSchema = new mongoose.Schema({
    itemName: {
        type: String,
        required: true
    },
    itemId: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    restaurantId: {
        type: String,
        required: true
    },
    rating: {
        type: Number,
        default: 0
    },
    photoUrl: {
        type: String,
        default: ""
    },
    itemStatus: {
        type: Boolean,
        default: true
    },
    itemtodisplayintherestuarentapp: {
        type: Boolean,
        default: true
    },
    vegOrNonVeg: {
        type: String,
        enum: ["Veg", "Non-Veg", "Both"],
        default: "Both"
    },
    offerpercentage: {
        type: Number,
        default: 0
    },
    category: {
        type: String,
        default: ""
    }
}, { 
    timestamps: true 
});

export async function getRestaurantItemModel(restaurantId) {
    if (!restaurantId) {
        throw new Error('Restaurant ID is required to get dynamic collection model.');
    }
    
    // Ensure the main connection is established
    await dbConnect();

    // Resolve restaurantId to the restaurant's registered name
    let resolvedName = restaurantId;
    try {
        const restUser = await mongoose.connection.db.collection('restuarentusers').findOne({
            $or: [
                { restId: restaurantId },
                { name: restaurantId },
                { phone: restaurantId }
            ]
        });
        if (restUser && restUser.name) {
            resolvedName = restUser.name;
        }
    } catch (dbErr) {
        console.error("Failed to resolve restaurantId to name, using raw id:", dbErr);
    }

    // Sanitize the name for a safe MongoDB collection name
    const collectionName = resolvedName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');

    // Switch connection to the 'restuarents' database, sharing the connection pool
    const restDb = mongoose.connection.useDb('restuarents', { useCache: true });

    // Check if the model is already compiled on this connection to prevent OverwriteModelError
    if (restDb.models[collectionName]) {
        // If the compiled model lacks the newly added offerpercentage field, clear it from cache to force recompilation
        if (!restDb.models[collectionName].schema.paths.offerpercentage) {
            delete restDb.models[collectionName];
        } else {
            return restDb.models[collectionName];
        }
    }

    // Compile and return the model for this specific restaurant's collection
    return restDb.model(collectionName, RestaurantItemSchema, collectionName);
}

