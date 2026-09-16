import { NextResponse } from "next/server";
import dbConnect from "../../../../lib/mongoose";
import Catagoryfilterinmainpage from "../../../../models/Catagoryfilterinmainpage";

// Helper to normalize both 'id' and 'position' strictly to contiguous 1..N numbers
async function normalizePositions(items) {
  if (!items || items.length === 0) return [];

  // Check if any item needs an update to its position or id
  const needsUpdate = items.some((item, idx) => {
    const desiredPos = idx + 1;
    const desiredId = desiredPos.toString();
    return item.position !== desiredPos || item.id !== desiredId;
  });

  if (!needsUpdate) {
    return items.map((item) => (item.toObject ? item.toObject() : item));
  }

  // Phase 1: Set temporary IDs to avoid MongoDB unique constraint errors on index 'id_1'
  const tempOps = items.map((item, idx) => ({
    updateOne: {
      filter: { _id: item._id },
      update: { $set: { id: `__temp_${idx}_${item._id}__` } },
    },
  }));
  await Catagoryfilterinmainpage.bulkWrite(tempOps);

  // Phase 2: Set final contiguous 1..N values for both id and position
  const finalOps = items.map((item, idx) => {
    const desiredPos = idx + 1;
    const desiredId = desiredPos.toString();
    return {
      updateOne: {
        filter: { _id: item._id },
        update: { $set: { id: desiredId, position: desiredPos } },
      },
    };
  });
  await Catagoryfilterinmainpage.bulkWrite(finalOps);

  return items.map((item, idx) => {
    const desiredPos = idx + 1;
    const desiredId = desiredPos.toString();
    const itemObj = item.toObject ? item.toObject() : item;
    return {
      ...itemObj,
      id: desiredId,
      position: desiredPos,
    };
  });
}

// Helper to reorder a category to a target position
async function reorderCategory(targetIdentifier, newPosition) {
  const targetPos = parseInt(newPosition, 10);
  if (isNaN(targetPos) || targetPos < 1) {
    return {
      success: false,
      error: "Valid position number (>= 1) is required",
      status: 400,
    };
  }

  // Fetch all categories sorted by current position / id
  let items = await Catagoryfilterinmainpage.find({}).sort({ position: 1, _id: 1 });

  if (items.length === 0) {
    return { success: false, error: "No category filters found", status: 404 };
  }

  // Find the category to move by Mongo _id or custom id
  const targetStr = targetIdentifier.toString().trim();
  const movingIndex = items.findIndex(
    (it) =>
      (it._id && it._id.toString() === targetStr) ||
      (it.id && it.id.toString().trim() === targetStr)
  );

  if (movingIndex === -1) {
    return {
      success: false,
      error: `Category with ID ${targetIdentifier} not found`,
      status: 404,
    };
  }

  // Clamp position within [1, items.length]
  const clampedPos = Math.min(Math.max(1, targetPos), items.length);

  // Remove moving item from its current index
  const [movingItem] = items.splice(movingIndex, 1);

  // Insert at new index (clampedPos - 1)
  items.splice(clampedPos - 1, 0, movingItem);

  // Re-index all categories: updates both 'id' and 'position' from 1 to N in MongoDB
  const updatedItems = await normalizePositions(items);

  return {
    success: true,
    message: `Updated position for "${movingItem.name || movingItem.id}" to #${clampedPos} (DB ID: ${clampedPos})`,
    data: updatedItems,
    status: 200,
  };
}

export async function GET(req) {
  try {
    await dbConnect();
    let items = await Catagoryfilterinmainpage.find({}).lean();

    // Sort items by position (non-zero first), then name / id
    items.sort((a, b) => {
      const posA = a.position || (a.id && !isNaN(parseInt(a.id, 10)) ? parseInt(a.id, 10) : 0);
      const posB = b.position || (b.id && !isNaN(parseInt(b.id, 10)) ? parseInt(b.id, 10) : 0);
      if (posA > 0 && posB > 0) return posA - posB;
      if (posA > 0) return -1;
      if (posB > 0) return 1;
      return (a.name || "").localeCompare(b.name || "");
    });

    // Ensure both 'id' and 'position' are clean 1..N sequence in DB
    const normalized = await normalizePositions(items);

    return NextResponse.json({ success: true, data: normalized }, { status: 200 });
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
    const body = await req.json();

    // Support position reordering via POST if newPosition is provided
    if (body.newPosition !== undefined) {
      const identifier = body._id || body.id;
      if (!identifier) {
        return NextResponse.json(
          { success: false, error: "Category ID is required" },
          { status: 400 }
        );
      }
      const result = await reorderCategory(identifier, body.newPosition);
      return NextResponse.json(
        {
          success: result.success,
          message: result.message,
          error: result.error,
          data: result.data,
        },
        { status: result.status }
      );
    }

    const { _id, name, imageUrl, id } = body;

    if (!name || !imageUrl) {
      return NextResponse.json(
        { success: false, error: "Name and Image URL are required" },
        { status: 400 }
      );
    }

    const sanitizedName = name.trim();
    const sanitizedId = id ? id.toString().trim() : "";

    // Check if category exists either by _id or by custom id
    let existing = null;
    if (_id) {
      existing = await Catagoryfilterinmainpage.findById(_id);
    }
    if (!existing && sanitizedId) {
      existing = await Catagoryfilterinmainpage.findOne({ id: sanitizedId });
    }

    if (existing) {
      // Check if the name is already taken by a different category
      const nameExists = await Catagoryfilterinmainpage.findOne({
        _id: { $ne: existing._id },
        name: { $regex: new RegExp(`^${sanitizedName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') }
      });
      if (nameExists) {
        return NextResponse.json(
          { success: false, error: "A category filter with this name already exists on another category" },
          { status: 409 }
        );
      }

      // Update existing document while preserving current id and position
      existing.name = sanitizedName;
      existing.imageUrl = imageUrl;
      await existing.save();

      return NextResponse.json({
        success: true,
        message: "Category filter updated successfully",
        data: existing,
      }, { status: 200 });
    }

    // Check if category filter with this name already exists (case-insensitive) for new categories
    const exists = await Catagoryfilterinmainpage.findOne({
      name: { $regex: new RegExp(`^${sanitizedName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') }
    });

    if (exists) {
      return NextResponse.json(
        { success: false, error: "A category filter with this name already exists" },
        { status: 409 }
      );
    }

    // New category: assign contiguous next position and id
    const totalCount = await Catagoryfilterinmainpage.countDocuments();
    const nextPos = totalCount + 1;
    const finalId = sanitizedId || nextPos.toString();

    const newEntry = await Catagoryfilterinmainpage.create({
      name: sanitizedName,
      id: finalId,
      imageUrl,
      position: nextPos,
    });

    // Re-normalize all to ensure sequence 1..N
    let allItems = await Catagoryfilterinmainpage.find({}).sort({ position: 1, _id: 1 });
    const normalized = await normalizePositions(allItems);

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

export async function PUT(req) {
  try {
    await dbConnect();
    const body = await req.json();
    const identifier = body._id || body.id;
    const newPosition = body.newPosition;

    if (!identifier) {
      return NextResponse.json(
        { success: false, error: "Category ID is required" },
        { status: 400 }
      );
    }

    const result = await reorderCategory(identifier, newPosition);
    return NextResponse.json(
      {
        success: result.success,
        message: result.message,
        error: result.error,
        data: result.data,
      },
      { status: result.status }
    );
  } catch (error) {
    console.error("PUT catagoryfilterinmainpage error:", error);
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

    // Re-normalize remaining items so both 'id' and 'position' stay contiguous 1..N with no gaps
    let remaining = await Catagoryfilterinmainpage.find({}).sort({ position: 1, _id: 1 });
    await normalizePositions(remaining);

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
