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
    } = await req.json();

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
      isManuallyToggled: true,
      manualStatusUpdatedAt: new Date(),
      vegOrNonVeg,
      commission: commission ? Number(commission) : 0,
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
    const { restId, newName } = await req.json();

    if (!restId || !newName || !newName.trim()) {
      return NextResponse.json(
        { success: false, error: "Restaurant ID and New Name are required" },
        { status: 400 }
      );
    }

    const sanitizedNewName = newName.trim();

    // Find the restaurant user
    const restaurant = await RestuarentUser.findOne({ restId });
    if (!restaurant) {
      return NextResponse.json(
        { success: false, error: "Restaurant branch not found" },
        { status: 404 }
      );
    }

    const oldPhone = restaurant.phone;
    // Derive the new phone (since phone is used as the unique name/login identifier in this app)
    const newPhone = sanitizedNewName;

    const oldName = restaurant.name;
    const newNameVal = sanitizedNewName;

    // Generate sanitized collection names
    const oldCollectionName = (oldName || oldPhone || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const newCollectionName = newNameVal.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');

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

    // Update restaurant details in database
    restaurant.name = sanitizedNewName;
    restaurant.phone = newPhone;
    await restaurant.save();

    return NextResponse.json({
      success: true,
      message: "Restaurant name and collection updated successfully",
      data: {
        name: restaurant.name,
        phone: restaurant.phone,
        collectionName: newCollectionName
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
