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
    const { restId, newName, logoUrl, subrestaurentsId } = await req.json();

    if (!restId) {
      return NextResponse.json(
        { success: false, error: "Restaurant ID is required" },
        { status: 400 }
      );
    }

    if (
      (newName === undefined || newName === null || !newName.trim()) &&
      !logoUrl &&
      subrestaurentsId === undefined
    ) {
      return NextResponse.json(
        { success: false, error: "Either New Name, New Logo URL, or Sub-Restaurants is required" },
        { status: 400 }
      );
    }

    // Find the restaurant user in restuarentusers collection
    const restaurant = await RestuarentUser.findOne({ restId });
    if (!restaurant) {
      return NextResponse.json(
        { success: false, error: "Restaurant branch not found" },
        { status: 404 }
      );
    }

    // Only update the name variable in the restuarentusers collection
    if (newName && newName.trim()) {
      restaurant.name = newName.trim();
    }

    // Update logoUrl if provided
    if (logoUrl) {
      restaurant.logoUrl = logoUrl;
    }

    // Update sub-restaurants list if provided
    if (subrestaurentsId !== undefined) {
      const cleanSubIds = Array.isArray(subrestaurentsId)
        ? subrestaurentsId.map((id) => String(id).trim()).filter(Boolean)
        : [];
      restaurant.subrestaurentsId = cleanSubIds;
      restaurant.subrestaurents_id = cleanSubIds;
    }

    // Save only to the restuarentusers collection
    await restaurant.save();

    return NextResponse.json({
      success: true,
      message: "Restaurant details updated successfully",
      data: {
        name: restaurant.name,
        phone: restaurant.phone,
        logoUrl: restaurant.logoUrl,
        subrestaurentsId: restaurant.subrestaurentsId
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
