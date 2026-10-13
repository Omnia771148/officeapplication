import { NextResponse } from "next/server";
import dbConnect from "../../../../lib/mongoose";
import RestuarentUser from "../../../../models/RestuarentUser";
import mongoose from "mongoose";

export async function POST(req) {
  try {
    await dbConnect();

    const {
      email,
      phone,
      name,
      offerTitle,
      password,
      restId,
      restLocation,
      address,
      fssai,
      openTime,
      closeTime,
      latitude,
      longitude,
      logoUrl,
      vegOrNonVeg,
      commission,
      rating,
      subrestaurentsId,
      subrestaurents_id,
    } = await req.json();

    let finalSubRestIds = [];
    if (Array.isArray(subrestaurentsId)) {
      finalSubRestIds = subrestaurentsId.map(id => String(id));
    } else if (Array.isArray(subrestaurents_id)) {
      finalSubRestIds = subrestaurents_id.map(id => String(id));
    } else if (typeof subrestaurentsId === 'string' && subrestaurentsId.trim()) {
      finalSubRestIds = [subrestaurentsId.trim()];
    }

    // validation
    if (
      !email ||
      !phone ||
      !name ||
      !password ||
      !restId ||
      !restLocation ||
      !address ||
      !fssai ||
      !openTime ||
      !closeTime ||
      !latitude ||
      !longitude ||
      !vegOrNonVeg
    ) {
      return NextResponse.json(
        { message: "All fields are required" },
        { status: 400 }
      );
    }

    const exists = await RestuarentUser.findOne({
      $or: [{ email }, { phone }],
    });

    if (exists) {
      return NextResponse.json(
        { message: "User already exists" },
        { status: 409 }
      );
    }

    await RestuarentUser.create({
      email,
      phone,
      name,
      offerTitle,
      password,
      restId,
      restLocation,
      address,
      fssai,
      openTime,
      closeTime,
      restaurantLocation: {
        lat: Number(latitude),
        lng: Number(longitude),
      },
      logoUrl: logoUrl || "",
      isActive: true,
      todisplaytocustomer: true,
      isManuallyToggled: true,
      manualStatusUpdatedAt: new Date(),
      vegOrNonVeg,
      commission: commission ? Number(commission) : 0,
      rating: rating !== undefined && rating !== null && rating !== "" ? Number(rating) : 4.2,
      subrestaurentsId: finalSubRestIds,
      subrestaurents_id: finalSubRestIds,
    });

    // Automatically create a collection for this restaurant in the 'restuarents' database
    try {
      const restDb = mongoose.connection.useDb('restuarents', { useCache: true });
      const collectionName = name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      
      const collections = await restDb.db.listCollections({ name: collectionName }).toArray();
      if (collections.length === 0) {
        await restDb.createCollection(collectionName);
      }
    } catch (dbErr) {
      console.error("Failed to automatically create collection during registration:", dbErr);
    }

    return NextResponse.json(
      { message: "Restaurant user created successfully" },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  try {
    await dbConnect();
    const { restId } = await req.json();

    if (!restId) {
      return NextResponse.json(
        { message: "Restaurant ID is required" },
        { status: 400 }
      );
    }

    const restaurant = await RestuarentUser.findOne({ restId });
    if (!restaurant) {
      return NextResponse.json(
        { message: "Restaurant not found" },
        { status: 404 }
      );
    }

    const name = restaurant.name;

    // Delete restaurant user document
    await RestuarentUser.deleteOne({ restId });

    // Try to drop the restaurant's menu items collection in 'restuarents' database
    try {
      if (name) {
        const restDb = mongoose.connection.useDb('restuarents', { useCache: true });
        const collectionName = name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
        
        const collections = await restDb.db.listCollections({ name: collectionName }).toArray();
        if (collections.length > 0) {
          await restDb.db.dropCollection(collectionName);
        }
      }
    } catch (dbErr) {
      console.error("Failed to drop restaurant collection during deletion:", dbErr);
    }

    return NextResponse.json(
      { message: "Restaurant deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req) {
  try {
    await dbConnect();
    const { restId, newName, logoUrl } = await req.json();

    if (!restId) {
      return NextResponse.json(
        { success: false, error: "Restaurant ID is required" },
        { status: 400 }
      );
    }

    if ((newName === undefined || newName === null || !newName.trim()) && !logoUrl) {
      return NextResponse.json(
        { success: false, error: "Either New Name or New Logo URL is required" },
        { status: 400 }
      );
    }

    // Find the restaurant user
    const restaurant = await RestuarentUser.findOne({ restId });
    if (!restaurant) {
      return NextResponse.json(
        { success: false, error: "Restaurant branch not found" },
        { status: 404 }
      );
    }

    let updatedCollectionName = undefined;

    // If newName is provided and different from current name
    if (newName && newName.trim() && newName.trim() !== restaurant.name) {
      const sanitizedNewName = newName.trim();
      const newPhone = sanitizedNewName;
      const oldName = restaurant.name;
      const oldPhone = restaurant.phone;

      // Generate sanitized collection names
      const oldCollectionName = (oldName || oldPhone || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      const newCollectionName = sanitizedNewName.toLowerCase().replace(/[^a-z0-9_-]/g, '_');

      // Check if new name/phone is already taken by another user
      const exists = await RestuarentUser.findOne({
        restId: { $ne: restId },
        $or: [{ phone: newPhone }]
      });

      if (exists) {
        return NextResponse.json(
          { success: false, error: "A restaurant with this name already exists" },
          { status: 409 }
        );
      }

      // Rename the MongoDB collection if it exists in the 'restuarents' database
      if (oldCollectionName !== newCollectionName) {
        try {
          const restDb = mongoose.connection.useDb('restuarents', { useCache: true });
          const collections = await restDb.db.listCollections({ name: oldCollectionName }).toArray();
          if (collections.length > 0) {
            // Check if new collection already exists
            const newCollections = await restDb.db.listCollections({ name: newCollectionName }).toArray();
            if (newCollections.length > 0) {
              return NextResponse.json(
                { success: false, error: "Database collection for the new name already exists." },
                { status: 409 }
              );
            }
            await restDb.db.collection(oldCollectionName).rename(newCollectionName);
          } else {
            // If old collection didn't exist, create the new collection
            await restDb.createCollection(newCollectionName);
          }
        } catch (dbErr) {
          console.error("Failed to rename MongoDB collection:", dbErr);
          return NextResponse.json(
            { success: false, error: "Database error renaming collection: " + dbErr.message },
            { status: 500 }
          );
        }
      }

      // Update name and phone
      restaurant.name = sanitizedNewName;
      restaurant.phone = newPhone;
      updatedCollectionName = newCollectionName;
    }

    // Update logoUrl if provided
    if (logoUrl) {
      restaurant.logoUrl = logoUrl;
    }

    await restaurant.save();

    return NextResponse.json({
      success: true,
      message: "Restaurant details updated successfully",
      data: {
        name: restaurant.name,
        phone: restaurant.phone,
        logoUrl: restaurant.logoUrl,
        collectionName: updatedCollectionName
      }
    });

  } catch (error) {
    console.error("PUT restaurant-register error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(req) {
  try {
    await dbConnect();
    const restaurants = await RestuarentUser.find({}, { restId: 1, name: 1, phone: 1, createdAt: 1 }).sort({ createdAt: -1 }).lean();

    if (!restaurants || restaurants.length === 0) {
      return NextResponse.json({ success: true, latestRestId: "None", restaurants: [] });
    }

    const latestCreated = restaurants[0]?.restId || "None";

    let maxNumericId = 0;
    restaurants.forEach(r => {
      const num = Number(r.restId);
      if (!isNaN(num) && num > maxNumericId) {
        maxNumericId = num;
      }
    });

    const displayLatest = maxNumericId > 0 ? String(maxNumericId) : latestCreated;

    // Filter and map existing restaurants for dropdown selection
    const restaurantList = restaurants
      .filter(r => r.restId)
      .map(r => ({
        restId: String(r.restId),
        name: r.name || r.phone || `Restaurant ${r.restId}`
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      success: true,
      latestRestId: displayLatest,
      restaurants: restaurantList
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
