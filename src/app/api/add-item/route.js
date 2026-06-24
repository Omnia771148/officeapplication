import { NextResponse } from "next/server";
import dbConnect from "../../../../lib/mongoose";
import ItemStatus from "../../../../models/ItemStatus";

export async function POST(req) {
  try {
    await dbConnect();

    const { itemName, price, restaurantId, itemStatus } = await req.json();

    if (!itemName || price === undefined || !restaurantId) {
      return NextResponse.json(
        { message: "Item name, price, and restaurant ID are required" },
        { status: 400 }
      );
    }

    const newItem = await ItemStatus.create({
      itemName,
      price: Number(price),
      restaurantId,
      itemStatus: itemStatus !== undefined ? itemStatus : true,
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
