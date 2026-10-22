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
            maxPoolSize: 20,
            minPoolSize: 2,
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
    oldprices: {
        type: Number,
        default: null
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
    offerTitle: {
        type: String,
        default: ""
    },
    category: {
        type: String,
        default: ""
    },
    description: {
        type: String,
        default: ""
    }
}, { 
    timestamps: true 
});

// In-memory cache for restaurantId -> collectionName
let restaurantCollectionMap = new Map();
let lastCollectionScanTime = 0;
const COLLECTION_SCAN_INTERVAL = 60000; // Rescan every 60 seconds if needed

export async function getRestaurantItemModel(restaurantId) {
    if (!restaurantId) {
        throw new Error('Restaurant ID is required to get dynamic collection model.');
    }
    
    // Ensure the main connection is established
    await dbConnect();

    const idStr = String(restaurantId).trim();
    const idNum = Number(idStr);

    // Switch connection to the 'restuarents' database, sharing the connection pool
    const restDb = mongoose.connection.useDb('restuarents', { useCache: true });

    let collectionName = restaurantCollectionMap.get(idStr);

    const now = Date.now();
    if (!collectionName || (now - lastCollectionScanTime > COLLECTION_SCAN_INTERVAL)) {
        try {
            const allCollections = await restDb.db.listCollections().toArray();
            const collNames = allCollections.map(c => c.name);

            // If a collection directly named `idStr` exists, use it
            if (collNames.includes(idStr)) {
                collectionName = idStr;
                restaurantCollectionMap.set(idStr, idStr);
            } else {
                // Scan collections to find which one stores items for this restaurantId
                const matches = await Promise.all(collNames.map(async (name) => {
                    const doc = await restDb.db.collection(name).findOne({
                        $or: [
                            { restaurantId: idStr },
                            ...(!isNaN(idNum) ? [{ restaurantId: idNum }] : [])
                        ]
                    }, { projection: { _id: 1, restaurantId: 1 } });

                    if (doc) {
                        return { name, restaurantId: String(doc.restaurantId) };
                    }
                    return null;
                }));

                for (const match of matches) {
                    if (match) {
                        restaurantCollectionMap.set(match.restaurantId, match.name);
                        if (match.restaurantId === idStr) {
                            collectionName = match.name;
                        }
                    }
                }
                lastCollectionScanTime = now;
            }
        } catch (scanErr) {
            console.error("Error finding existing collection for restaurantId:", scanErr);
        }
    }

    // Fallback: If no existing collection contains items for this restaurantId, use restaurantId directly
    if (!collectionName) {
        collectionName = idStr;
        restaurantCollectionMap.set(idStr, idStr);
    }

    // Check if the model is already compiled on this connection to prevent OverwriteModelError
    if (restDb.models[collectionName]) {
        // If the compiled model lacks the newly added offerpercentage, oldprices, offerTitle, or description field, clear it from cache to force recompilation
        if (!restDb.models[collectionName].schema.paths.offerpercentage || !restDb.models[collectionName].schema.paths.oldprices || !restDb.models[collectionName].schema.paths.offerTitle || !restDb.models[collectionName].schema.paths.description) {
            delete restDb.models[collectionName];
        } else {
            return restDb.models[collectionName];
        }
    }

    // Compile and return the model for this specific restaurant's collection
    return restDb.model(collectionName, RestaurantItemSchema, collectionName);
}

