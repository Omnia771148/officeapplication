import { NextResponse } from "next/server";
import dbConnect from "../../../../lib/mongoose";
import RestuarentUser from "../../../../models/RestuarentUser";
import RestaurantStatus from "../../../../models/RestaurantStatus";

function getKolkataTime(now) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(now);
  const getVal = (type) => parts.find(p => p.type === type).value;
  
  const year = parseInt(getVal('year'), 10);
  const month = parseInt(getVal('month'), 10);
  const day = parseInt(getVal('day'), 10);
  let hour = parseInt(getVal('hour'), 10);
  const minute = parseInt(getVal('minute'), 10);
  
  if (hour === 24) hour = 0;
  
  return { year, month, day, hour, minute };
}

function isSameDayInKolkata(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  
  const getDayStr = (d) => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(d);
  };
  
  return getDayStr(d1) === getDayStr(d2);
}

function isRestaurantOpen(openTime, closeTime, currentHour, currentMinute) {
  if (!openTime || !closeTime) return false;

  const currentMinutes = currentHour * 60 + currentMinute;

  const [openHour, openMin] = openTime.split(':').map(Number);
  const openMinutes = openHour * 60 + openMin;

  const [closeHour, closeMin] = closeTime.split(':').map(Number);
  const closeMinutes = closeHour * 60 + closeMin;

  if (closeMinutes > openMinutes) {
    // Normal day: e.g. 09:00 to 22:00
    return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  } else {
    // Overnight: e.g. 18:00 to 02:00
    return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
  }
}

export async function GET() {
  try {
    await dbConnect();

    const restaurants = await RestuarentUser.find({});
    const statuses = await RestaurantStatus.find({});

    const statusMap = new Map();
    statuses.forEach(s => statusMap.set(s.restaurantId, s));

    const now = new Date();
    const kolkataTime = getKolkataTime(now);
    const result = [];

    for (const rest of restaurants) {
      const statusDoc = statusMap.get(rest.restId);
      let isActive = statusDoc ? statusDoc.isActive : false;
      let isManuallyToggled = statusDoc ? statusDoc.isManuallyToggled : false;

      const hasSchedule = rest.openTime && rest.closeTime;

      if (hasSchedule) {
        // Scheduled Mode
        let isExpired = false;
        if (isManuallyToggled && statusDoc && statusDoc.manualStatusUpdatedAt) {
          if (!isSameDayInKolkata(statusDoc.manualStatusUpdatedAt, now)) {
            isExpired = true;
          }
        }

        if (isExpired) {
          isManuallyToggled = false;
          isActive = isRestaurantOpen(rest.openTime, rest.closeTime, kolkataTime.hour, kolkataTime.minute);
          
          await RestaurantStatus.findOneAndUpdate(
            { restaurantId: rest.restId },
            { 
              isActive, 
              isManuallyToggled: false 
            },
            { upsert: true }
          );
        } else if (!isManuallyToggled) {
          const computedActive = isRestaurantOpen(rest.openTime, rest.closeTime, kolkataTime.hour, kolkataTime.minute);
          if (computedActive !== isActive || !statusDoc) {
            isActive = computedActive;
            await RestaurantStatus.findOneAndUpdate(
              { restaurantId: rest.restId },
              { 
                isActive, 
                isManuallyToggled: false 
              },
              { upsert: true }
            );
          }
        }
      }

      result.push({
        restId: rest.restId,
        name: rest.name || `Restaurant ${rest.restId}`,
        email: rest.email,
        phone: rest.phone,
        openTime: rest.openTime || "",
        closeTime: rest.closeTime || "",
        isActive,
        isManuallyToggled,
      });
    }

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

      if (openTime === "" && closeTime === "") {
        // Clearing timings puts the restaurant back in manual mode
        await RestaurantStatus.findOneAndUpdate(
          { restaurantId: restId },
          { isManuallyToggled: true },
          { upsert: true }
        );
      } else {
        // Setting timings: calculate initial status based on schedule and reset manual toggle
        const now = new Date();
        const kolkataTime = getKolkataTime(now);
        const calculatedActive = isRestaurantOpen(openTime, closeTime, kolkataTime.hour, kolkataTime.minute);

        await RestaurantStatus.findOneAndUpdate(
          { restaurantId: restId },
          {
            isActive: calculatedActive,
            isManuallyToggled: false,
            manualStatusUpdatedAt: now,
          },
          { upsert: true }
        );
      }
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
