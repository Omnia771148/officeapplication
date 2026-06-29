import { NextResponse } from "next/server";
import dbConnect from "../../../../lib/mongoose";
import Carousel from "../../../../models/Carousel";

export async function POST(req) {
  try {
    await dbConnect();

    const { carouselId, imageUrl } = await req.json();

    if (!carouselId || !imageUrl) {
      return NextResponse.json(
        { success: false, error: "Carousel ID and Image URL are required" },
        { status: 400 }
      );
    }

    // Check if Carousel with this ID already exists
    const exists = await Carousel.findOne({ carouselId });
    if (exists) {
      return NextResponse.json(
        { success: false, error: "A carousel slide with this ID already exists" },
        { status: 409 }
      );
    }

    // Create the carousel document
    const newCarousel = await Carousel.create({
      carouselId,
      imageUrl,
    });

    return NextResponse.json({
      success: true,
      message: "Carousel slide added successfully",
      carousel: newCarousel,
    }, { status: 201 });
  } catch (error) {
    console.error("Create carousel error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
