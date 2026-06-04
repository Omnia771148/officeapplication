import { NextResponse } from "next/server";
import dbConnect from "../../../../lib/mongoose";
import RestuarentUser from "../../../../models/RestuarentUser";
import RestaurantStatus from "../../../../models/RestaurantStatus";

export async function GET() {
  try {
    await dbConnect();

    const restaurants = await RestuarentUser.find({});
    const statuses = await RestaurantStatus.find({});

    const statusMap = new Map();
    statuses.forEach(s => statusMap.set(s.restaurantId, s));

    const result = restaurants.map(rest => {
      const statusDoc = statusMap.get(rest.restId);
      return {
        restId: rest.restId,
        name: rest.name || `Restaurant ${rest.restId}`,
        email: rest.email,
        phone: rest.phone,
        openTime: rest.openTime || "",
        closeTime: rest.closeTime || "",
        isActive: statusDoc ? statusDoc.isActive : false,
        isManuallyToggled: statusDoc ? statusDoc.isManuallyToggled : false,
      };
    });

    return NextResponse.json({ success: true, restaurants: result });
  } catch (error) {
    console.error("Fetch restaurant timings error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    await dbConnect();
    const { restId, openTime, closeTime, isActive } = await request.json();

    if (!restId) {
      return NextResponse.json({ success: false, error: "Restaurant ID is required" }, { status: 400 });
    }

    // Update operational hours if provided in request
    if (openTime !== undefined && closeTime !== undefined) {
      await RestuarentUser.findOneAndUpdate(
        { restId },
        { openTime, closeTime },
        { new: true }
      );
    }

    // Update active override status if provided in request
    if (isActive !== undefined) {
      await RestaurantStatus.findOneAndUpdate(
        { restaurantId: restId },
        {
          isActive,
          isManuallyToggled: true,
          manualStatusUpdatedAt: new Date(),
        },
        { upsert: true }
      );
    }

    return NextResponse.json({ success: true, message: "Restaurant configurations updated successfully" });
  } catch (error) {
    console.error("Update restaurant timings error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
