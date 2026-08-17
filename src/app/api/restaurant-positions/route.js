import { NextResponse } from "next/server";
import dbConnect from "../../../../lib/mongoose";
import RestuarentUser from "../../../../models/RestuarentUser";

// Helper to normalize restaurant positions strictly to contiguous 1..N numbers
async function normalizePositions(restaurants) {
  const bulkOps = [];
  const normalized = restaurants.map((rest, idx) => {
    const desiredPos = idx + 1;
    const restObj = rest.toObject ? rest.toObject() : rest;
    if (rest.position !== desiredPos) {
      bulkOps.push({
        updateOne: {
          filter: { _id: rest._id },
          update: { $set: { position: desiredPos } },
        },
      });
    }
    return {
      ...restObj,
      position: desiredPos,
    };
  });

  if (bulkOps.length > 0) {
    await RestuarentUser.bulkWrite(bulkOps);
  }

  return normalized;
}

export async function GET() {
  try {
    await dbConnect();

    // Fetch all restaurants
    let restaurants = await RestuarentUser.find({}).lean();

    // Sort restaurants by position (non-zero first), then createdAt / restId
    restaurants.sort((a, b) => {
      const posA = a.position || 0;
      const posB = b.position || 0;
      if (posA > 0 && posB > 0) return posA - posB;
      if (posA > 0) return -1;
      if (posB > 0) return 1;
      return (a.name || a.restId || "").localeCompare(b.name || b.restId || "");
    });

    // Ensure positions are clean 1..N sequence
    const normalized = await normalizePositions(restaurants);

    return NextResponse.json({
      success: true,
      restaurants: normalized.map((r) => ({
        _id: r._id,
        restId: r.restId,
        name: r.name || r.phone || `Restaurant ${r.restId}`,
        restLocation: r.restLocation || "",
        logoUrl: r.logoUrl || "",
        position: r.position,
        isActive: r.isActive !== undefined ? r.isActive : true,
      })),
    });
  } catch (error) {
    console.error("Fetch restaurant positions error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const { restId, newPosition } = await request.json();

    if (!restId) {
      return NextResponse.json(
        { success: false, error: "Restaurant ID is required" },
        { status: 400 }
      );
    }

    const targetPos = parseInt(newPosition, 10);
    if (isNaN(targetPos) || targetPos < 1) {
      return NextResponse.json(
        { success: false, error: "Valid position number (>= 1) is required" },
        { status: 400 }
      );
    }

    // Fetch all restaurants sorted by current position
    let restaurants = await RestuarentUser.find({}).sort({ position: 1, _id: 1 });

    if (restaurants.length === 0) {
      return NextResponse.json(
        { success: false, error: "No restaurants found" },
        { status: 404 }
      );
    }

    // Find the restaurant to move
    const movingIndex = restaurants.findIndex((r) => r.restId === restId);
    if (movingIndex === -1) {
      return NextResponse.json(
        { success: false, error: `Restaurant with ID ${restId} not found` },
        { status: 404 }
      );
    }

    // Clamp position within [1, restaurants.length]
    const clampedPos = Math.min(Math.max(1, targetPos), restaurants.length);

    // Remove moving restaurant from its current index
    const [movingRest] = restaurants.splice(movingIndex, 1);

    // Insert at new index (clampedPos - 1)
    restaurants.splice(clampedPos - 1, 0, movingRest);

    // Re-index all restaurants from 1 to N
    const bulkOps = [];
    const updatedRestaurants = restaurants.map((rest, index) => {
      const pos = index + 1;
      bulkOps.push({
        updateOne: {
          filter: { _id: rest._id },
          update: { $set: { position: pos } },
        },
      });
      return {
        _id: rest._id,
        restId: rest.restId,
        name: rest.name || rest.phone || `Restaurant ${rest.restId}`,
        restLocation: rest.restLocation || "",
        logoUrl: rest.logoUrl || "",
        position: pos,
        isActive: rest.isActive !== undefined ? rest.isActive : true,
      };
    });

    if (bulkOps.length > 0) {
      await RestuarentUser.bulkWrite(bulkOps);
    }

    return NextResponse.json({
      success: true,
      message: `Updated position for ${movingRest.name || movingRest.restId} to ${clampedPos}`,
      restaurants: updatedRestaurants,
    });
  } catch (error) {
    console.error("Update restaurant position error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
