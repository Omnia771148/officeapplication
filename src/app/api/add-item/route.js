import { NextResponse } from "next/server";
import dbConnect from "../../../../lib/mongoose";
import ItemStatus from "../../../../models/ItemStatus";

export async function POST(req) {
  try {
    await dbConnect();

    const { itemName, itemId, price, restaurantId, itemStatus, itemtodisplayintherestuarentapp } = await req.json();

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

    const newItem = await ItemStatus.create({
      itemName,
      itemId,
      price: Number(price),
      restaurantId,
      itemStatus: itemStatus !== undefined ? itemStatus : true,
      itemtodisplayintherestuarentapp: itemtodisplayintherestuarentapp !== undefined ? itemtodisplayintherestuarentapp : true,
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
