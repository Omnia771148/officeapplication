import { NextResponse } from "next/server";
import { getRestaurantItemModel } from "../../../../lib/mongoose";

export async function POST(req) {
  try {

    const { itemName, itemId, price, restaurantId, rating, photoUrl, itemStatus, itemtodisplayintherestuarentapp, vegOrNonVeg, offerpercentage, category } = await req.json();

    if (
      !itemName || !itemName.trim() ||
      !itemId || !itemId.trim() ||
      price === undefined || price === null || price === '' || isNaN(Number(price)) ||
      !restaurantId || !restaurantId.trim()
    ) {
      return NextResponse.json(
        { message: "Item name, Item ID, price, and restaurant ID are required and must be valid." },
        { status: 400 }
      );
    }

    const RestaurantItem = await getRestaurantItemModel(restaurantId);

    const newItem = await RestaurantItem.create({
      itemName,
      itemId,
      price: Number(price),
      restaurantId,
      rating: rating !== undefined ? Number(rating) : 0,
      photoUrl: photoUrl || "",
      itemStatus: itemStatus !== undefined ? itemStatus : true,
      itemtodisplayintherestuarentapp: itemtodisplayintherestuarentapp !== undefined ? itemtodisplayintherestuarentapp : true,
      vegOrNonVeg: vegOrNonVeg || "Both",
      offerpercentage: (offerpercentage !== undefined && offerpercentage !== null && offerpercentage !== '') ? Number(offerpercentage) : 0,
      category: category || "",
    });

    return NextResponse.json(
      { message: "Item created successfully", data: newItem },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  }
}
