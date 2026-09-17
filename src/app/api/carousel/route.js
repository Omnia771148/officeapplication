import { NextResponse } from "next/server";
import dbConnect from "../../../../lib/mongoose";
import Carousel from "../../../../models/Carousel";

// Helper to normalize both 'carouselId' and 'position' strictly to contiguous 1..N numbers
async function normalizePositions(items) {
  if (!items || items.length === 0) return [];

  // Check if any item needs an update to its position or carouselId
  const needsUpdate = items.some((item, idx) => {
    const desiredPos = idx + 1;
    const desiredId = desiredPos.toString();
    return item.position !== desiredPos || item.carouselId !== desiredId;
  });

  if (!needsUpdate) {
    return items.map((item) => (item.toObject ? item.toObject() : item));
  }

  // Phase 1: Set temporary IDs to avoid MongoDB unique constraint errors on index 'carouselId_1'
  const tempOps = items.map((item, idx) => ({
    updateOne: {
      filter: { _id: item._id },
      update: { $set: { carouselId: `__temp_${idx}_${item._id}__` } },
    },
  }));
  await Carousel.bulkWrite(tempOps);

  // Phase 2: Set final contiguous 1..N values for both carouselId and position
  const finalOps = items.map((item, idx) => {
    const desiredPos = idx + 1;
    const desiredId = desiredPos.toString();
    return {
      updateOne: {
        filter: { _id: item._id },
        update: { $set: { carouselId: desiredId, position: desiredPos } },
      },
    };
  });
  await Carousel.bulkWrite(finalOps);

  return items.map((item, idx) => {
    const desiredPos = idx + 1;
    const desiredId = desiredPos.toString();
    const itemObj = item.toObject ? item.toObject() : item;
    return {
      ...itemObj,
      carouselId: desiredId,
      position: desiredPos,
    };
  });
}

// Helper to reorder a carousel slide to a target position
async function reorderCarousel(targetIdentifier, newPosition) {
  const targetPos = parseInt(newPosition, 10);
  if (isNaN(targetPos) || targetPos < 1) {
    return {
      success: false,
      error: "Valid position number (>= 1) is required",
      status: 400,
    };
  }

  // Fetch all carousels sorted by current position / carouselId
  let items = await Carousel.find({}).sort({ position: 1, _id: 1 });

  if (items.length === 0) {
    return { success: false, error: "No carousel slides found", status: 404 };
  }

  // Find the carousel to move by Mongo _id or carouselId
  const targetStr = targetIdentifier.toString().trim();
  const movingIndex = items.findIndex(
    (it) =>
      (it._id && it._id.toString() === targetStr) ||
      (it.carouselId && it.carouselId.toString().trim() === targetStr)
  );

  if (movingIndex === -1) {
    return {
      success: false,
      error: `Carousel slide with ID ${targetIdentifier} not found`,
      status: 404,
    };
  }

  // Clamp position within [1, items.length]
  const clampedPos = Math.min(Math.max(1, targetPos), items.length);

  // Remove moving item from its current index
  const [movingItem] = items.splice(movingIndex, 1);

  // Insert at new index (clampedPos - 1)
  items.splice(clampedPos - 1, 0, movingItem);

  // Re-index all carousels: updates both 'carouselId' and 'position' from 1 to N in MongoDB
  const updatedItems = await normalizePositions(items);

  return {
    success: true,
    message: `Updated position for slide "${movingItem.title || movingItem.carouselId}" to #${clampedPos} (Slide ID: ${clampedPos})`,
    carousels: updatedItems,
    status: 200,
  };
}

export async function GET() {
  try {
    await dbConnect();

    let carousels = await Carousel.find({}).lean();

    // Sort items by position (non-zero first), then carouselId / createdAt
    carousels.sort((a, b) => {
      const posA = a.position || (a.carouselId && !isNaN(parseInt(a.carouselId, 10)) ? parseInt(a.carouselId, 10) : 0);
      const posB = b.position || (b.carouselId && !isNaN(parseInt(b.carouselId, 10)) ? parseInt(b.carouselId, 10) : 0);
      if (posA > 0 && posB > 0) return posA - posB;
      if (posA > 0) return -1;
      if (posB > 0) return 1;
      return (a.carouselId || "").localeCompare(b.carouselId || "");
    });

    // Ensure both 'carouselId' and 'position' are clean 1..N sequence in DB
    const normalized = await normalizePositions(carousels);

    return NextResponse.json({
      success: true,
      carousels: normalized,
    });
  } catch (error) {
    console.error("Get carousels error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();

    // Support position reordering via POST if newPosition is provided
    if (body.newPosition !== undefined) {
      const identifier = body._id || body.carouselId || body.id;
      if (!identifier) {
        return NextResponse.json(
          { success: false, error: "Carousel ID is required" },
          { status: 400 }
        );
      }
      const result = await reorderCarousel(identifier, body.newPosition);
      return NextResponse.json(
        {
          success: result.success,
          message: result.message,
          error: result.error,
          carousels: result.carousels,
        },
        { status: result.status }
      );
    }

    const { carouselId, imageUrl, title, restaurantId } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: "Carousel Image URL is required" },
        { status: 400 }
      );
    }

    const totalCount = await Carousel.countDocuments();
    const nextPos = totalCount + 1;
    const sanitizedId = carouselId ? carouselId.toString().trim() : nextPos.toString();

    if (!sanitizedId) {
      return NextResponse.json(
        { success: false, error: "Carousel ID is required" },
        { status: 400 }
      );
    }

    // Check if Carousel with this ID already exists
    const exists = await Carousel.findOne({ carouselId: sanitizedId });
    if (exists) {
      return NextResponse.json(
        { success: false, error: "A carousel slide with this ID already exists" },
        { status: 409 }
      );
    }

    // Create the carousel document with next position
    const newCarousel = await Carousel.create({
      carouselId: sanitizedId,
      position: nextPos,
      imageUrl,
      title: title ? title.trim() : "",
      restaurantId: restaurantId ? restaurantId.trim() : "",
    });

    // Re-normalize all to ensure clean sequence 1..N
    let allItems = await Carousel.find({}).sort({ position: 1, _id: 1 });
    const normalized = await normalizePositions(allItems);

    return NextResponse.json({
      success: true,
      message: "Carousel slide added successfully",
      carousel: newCarousel,
      carousels: normalized,
    }, { status: 201 });
  } catch (error) {
    console.error("Create carousel error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req) {
  try {
    await dbConnect();
    const body = await req.json();
    const identifier = body._id || body.carouselId || body.id;
    const newPosition = body.newPosition;

    if (!identifier) {
      return NextResponse.json(
        { success: false, error: "Carousel ID is required" },
        { status: 400 }
      );
    }

    const result = await reorderCarousel(identifier, newPosition);
    return NextResponse.json(
      {
        success: result.success,
        message: result.message,
        error: result.error,
        carousels: result.carousels,
      },
      { status: result.status }
    );
  } catch (error) {
    console.error("PUT carousel error:", error);
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
    const carouselId = searchParams.get("carouselId");

    if (!id && !carouselId) {
      return NextResponse.json(
        { success: false, error: "id or carouselId is required" },
        { status: 400 }
      );
    }

    const query = id ? { _id: id } : { carouselId };
    const deleted = await Carousel.findOneAndDelete(query);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Carousel slide not found" },
        { status: 404 }
      );
    }

    // Re-normalize remaining items so both 'carouselId' and 'position' stay contiguous 1..N with no gaps
    let remaining = await Carousel.find({}).sort({ position: 1, _id: 1 });
    const normalized = await normalizePositions(remaining);

    return NextResponse.json({
      success: true,
      message: "Carousel slide deleted successfully",
      deleted,
      carousels: normalized,
    });
  } catch (error) {
    console.error("Delete carousel error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}


