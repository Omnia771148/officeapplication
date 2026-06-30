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

    // Resolve restaurantId to the restaurant's registered phone number
    let resolvedPhone = restaurantId;
    try {
        const restUser = await mongoose.connection.db.collection('restuarentusers').findOne({
            $or: [
                { restId: restaurantId },
                { phone: restaurantId }
            ]
        });
        if (restUser && restUser.phone) {
            resolvedPhone = restUser.phone;
        }
    } catch (dbErr) {
        console.error("Failed to resolve restaurantId to phone number, using raw id:", dbErr);
    }

    // Sanitize the phone number for a safe MongoDB collection name
    const collectionName = resolvedPhone.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');

    // Switch connection to the 'restuarents' database, sharing the connection pool
    const restDb = mongoose.connection.useDb('restuarents', { useCache: true });

    // Check if the model is already compiled on this connection to prevent OverwriteModelError
    if (restDb.models[collectionName]) {
        return restDb.models[collectionName];
    }

    // Compile and return the model for this specific restaurant's collection
    return restDb.model(collectionName, RestaurantItemSchema, collectionName);
}

