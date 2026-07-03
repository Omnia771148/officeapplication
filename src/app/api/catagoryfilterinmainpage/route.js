import { NextResponse } from "next/server";
import dbConnect from "../../../../lib/mongoose";
import Catagoryfilterinmainpage from "../../../../models/Catagoryfilterinmainpage";

export async function GET(req) {
  try {
    await dbConnect();
    const items = await Catagoryfilterinmainpage.find({}).sort({ name: 1 });
    return NextResponse.json({ success: true, data: items }, { status: 200 });
  } catch (error) {
    console.error("GET catagoryfilterinmainpage error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    await dbConnect();
    const { name, imageUrl } = await req.json();

    if (!name || !imageUrl) {
      return NextResponse.json(
        { success: false, error: "Name and Image URL are required" },
        { status: 400 }
      );
    }

    const sanitizedName = name.trim();

    // Check if category filter with this name already exists (case-insensitive)
    const exists = await Catagoryfilterinmainpage.findOne({
      name: { $regex: new RegExp(`^${sanitizedName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') }
    });

    if (exists) {
      return NextResponse.json(
        { success: false, error: "A category filter with this name already exists" },
        { status: 409 }
      );
    }

    // Create the document
    const newEntry = await Catagoryfilterinmainpage.create({
      name: sanitizedName,
      imageUrl,
    });

    return NextResponse.json({
      success: true,
      message: "Category filter added successfully",
      data: newEntry,
    }, { status: 201 });
  } catch (error) {
    console.error("POST catagoryfilterinmainpage error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID is required to delete" },
        { status: 400 }
      );
    }

    const deleted = await Catagoryfilterinmainpage.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Category filter not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Category filter deleted successfully"
    }, { status: 200 });
  } catch (error) {
    console.error("DELETE catagoryfilterinmainpage error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
