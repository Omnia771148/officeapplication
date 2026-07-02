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
    });

    // Automatically create a collection for this restaurant in the 'restuarents' database
    try {
      const restDb = mongoose.connection.useDb('restuarents', { useCache: true });
      const collectionName = phone.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      
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

    const phone = restaurant.phone;

    // Delete restaurant user document
    await RestuarentUser.deleteOne({ restId });

    // Try to drop the restaurant's menu items collection in 'restuarents' database
    try {
      if (phone) {
        const restDb = mongoose.connection.useDb('restuarents', { useCache: true });
        const collectionName = phone.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
        
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
