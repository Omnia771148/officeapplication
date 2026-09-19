import { NextResponse } from "next/server";
import dbConnect from "../../../../lib/mongoose";
import Catagoryfilterinmainpage from "../../../../models/Catagoryfilterinmainpage";

// Helper to normalize all category positions and IDs to 1..N contiguous sequence
async function normalizePositions(items) {
  if (!items || items.length === 0) return [];
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

// Helper to reorder a category filter to a target position
async function reorderCategory(targetIdentifier, newPosition) {
  const targetPos = parseInt(newPosition, 10);
  if (isNaN(targetPos) || targetPos < 1) {
    return {
      success: false,
      error: "Valid position number (>= 1) is required",
      status: 400,
    };
  }

  let items = await Catagoryfilterinmainpage.find({}).sort({ position: 1, _id: 1 });

  if (items.length === 0) {
    return { success: false, error: "No category filters found", status: 404 };
  }

  const targetStr = targetIdentifier.toString().trim();
  const movingIndex = items.findIndex(
    (it) =>
      (it._id && it._id.toString() === targetStr) ||
      (it.id && it.id.toString().trim() === targetStr)
  );

  if (movingIndex === -1) {
    return {
      success: false,
      error: `Category filter with ID ${targetIdentifier} not found`,
      status: 404,
    };
  }

  const clampedPos = Math.min(Math.max(1, targetPos), items.length);
  const [movingItem] = items.splice(movingIndex, 1);
  items.splice(clampedPos - 1, 0, movingItem);

  const updatedItems = await normalizePositions(items);

  return {
    success: true,
    message: `Updated position for "${movingItem.name || movingItem.id}" to #${clampedPos} (DB ID: ${clampedPos})`,
    data: updatedItems,
    status: 200,
  };
}

export async function GET() {
  try {
    await dbConnect();
    let items = await Catagoryfilterinmainpage.find({}).lean();

    items.sort((a, b) => {
      const posA = a.position || (a.id && !isNaN(parseInt(a.id, 10)) ? parseInt(a.id, 10) : 0);
      const posB = b.position || (b.id && !isNaN(parseInt(b.id, 10)) ? parseInt(b.id, 10) : 0);
      if (posA > 0 && posB > 0) return posA - posB;
      if (posA > 0) return -1;
      if (posB > 0) return 1;
      return (a.name || "").localeCompare(b.name || "");
    });

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

    const { _id, name, imageUrl, id, bgColor, fontSize, fontColor } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: "Image URL is required" },
        { status: 400 }
      );
    }

    const sanitizedName = name ? name.trim() : "";
    const sanitizedId = id ? id.toString().trim() : "";
    const sanitizedBgColor = bgColor ? bgColor.trim() : "rgba(0, 0, 0, 0.45)";
    const sanitizedFontSize = fontSize !== undefined && fontSize !== null && fontSize !== "" ? Number(fontSize) : 11;
    const sanitizedFontColor = fontColor ? fontColor.trim() : "#FFFFFF";

    let existing = null;
    if (_id) {
      existing = await Catagoryfilterinmainpage.findById(_id);
    }
    if (!existing && sanitizedId) {
      existing = await Catagoryfilterinmainpage.findOne({ id: sanitizedId });
    }

    if (existing) {
      if (sanitizedName) {
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
      }

      existing.name = sanitizedName;
      existing.imageUrl = imageUrl;
      existing.bgColor = sanitizedBgColor;
      existing.fontSize = sanitizedFontSize;
      existing.fontColor = sanitizedFontColor;
      await existing.save();

      return NextResponse.json({
        success: true,
        message: "Category filter updated successfully",
        data: existing,
      }, { status: 200 });
    }

    if (sanitizedName) {
      const exists = await Catagoryfilterinmainpage.findOne({
        name: { $regex: new RegExp(`^${sanitizedName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') }
      });

      if (exists) {
        return NextResponse.json(
          { success: false, error: "A category filter with this name already exists" },
          { status: 409 }
        );
      }
    }

    const totalCount = await Catagoryfilterinmainpage.countDocuments();
    const nextPos = totalCount + 1;
    const finalId = sanitizedId || nextPos.toString();

    const newEntry = await Catagoryfilterinmainpage.create({
      name: sanitizedName,
      id: finalId,
      imageUrl,
      position: nextPos,
      bgColor: sanitizedBgColor,
      fontSize: sanitizedFontSize,
      fontColor: sanitizedFontColor,
    });

    let allItems = await Catagoryfilterinmainpage.find({}).sort({ position: 1, _id: 1 });
    const normalized = await normalizePositions(allItems);

    return NextResponse.json({
      success: true,
      message: "Category filter added successfully",
      data: newEntry,
      categories: normalized,
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

    if (newPosition !== undefined) {
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
    }

    const existing = await Catagoryfilterinmainpage.findOne({
      $or: [{ _id: identifier }, { id: identifier }]
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Category filter not found" },
        { status: 404 }
      );
    }

    if (body.name !== undefined) existing.name = body.name ? body.name.trim() : "";
    if (body.imageUrl) existing.imageUrl = body.imageUrl;
    if (body.bgColor !== undefined) existing.bgColor = body.bgColor.trim();
    if (body.fontSize !== undefined) existing.fontSize = Number(body.fontSize) || 11;
    if (body.fontColor !== undefined) existing.fontColor = body.fontColor.trim();

    await existing.save();

    let allItems = await Catagoryfilterinmainpage.find({}).sort({ position: 1, _id: 1 });
    const normalized = await normalizePositions(allItems);

    return NextResponse.json({
      success: true,
      message: "Category updated successfully",
      data: existing,
      categories: normalized,
    }, { status: 200 });
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

    let remaining = await Catagoryfilterinmainpage.find({}).sort({ position: 1, _id: 1 });
    const normalized = await normalizePositions(remaining);

    return NextResponse.json({
      success: true,
      message: "Category filter deleted successfully",
      data: normalized,
    }, { status: 200 });
  } catch (error) {
    console.error("DELETE catagoryfilterinmainpage error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
