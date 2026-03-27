import { NextResponse } from "next/server";
import dbConnect from "../../../../lib/mongoose";
import RestuarentUser from "../../../../models/RestuarentUser";

export async function POST(req) {
  try {
    await dbConnect();

    const {
      email,
      phone,
      password,
      restId,
      restLocation,
      address,
      fssai,
      openTime,
      closeTime,
      latitude,
      longitude,
    } = await req.json();

    // validation
    if (
      !email ||
      !phone ||
      !password ||
      !restId ||
      !restLocation ||
      !address ||
      !fssai ||
      !openTime ||
      !closeTime ||
      !latitude ||
      !longitude
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
