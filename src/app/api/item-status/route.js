import dbConnect from '../../../../lib/mongoose';
import ItemStatus from '../../../../models/ItemStatus';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const restaurantId = searchParams.get('restaurantId');

        if (!restaurantId) {
            return NextResponse.json({ success: false, error: 'Restaurant ID is required' }, { status: 400 });
        }

        // Backfill existing database items that don't have the field set yet
        await ItemStatus.updateMany(
            { itemtodisplayintherestuarentapp: { $exists: false } },
            { $set: { itemtodisplayintherestuarentapp: true } }
        );

        const items = await ItemStatus.find({ restaurantId }).sort({ createdAt: -1 });
        return NextResponse.json({ success: true, data: items });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function PATCH(request) {
    try {
        await dbConnect();
        const { itemId, itemStatus, itemtodisplayintherestuarentapp, itemName, price } = await request.json();

        if (!itemId) {
            return NextResponse.json({ success: false, error: 'Item ID is required' }, { status: 400 });
        }

        const updateData = {};
        if (itemStatus !== undefined) {
            updateData.itemStatus = itemStatus;
            if (itemStatus === true) {
                updateData.itemtodisplayintherestuarentapp = true;
            }
        }
        if (itemtodisplayintherestuarentapp !== undefined) {
            updateData.itemtodisplayintherestuarentapp = itemtodisplayintherestuarentapp;
            if (itemtodisplayintherestuarentapp === false) {
                updateData.itemStatus = false;
            }
        }
        if (itemName !== undefined) {
            if (typeof itemName !== 'string' || !itemName.trim()) {
                return NextResponse.json({ success: false, error: 'Item name cannot be empty' }, { status: 400 });
            }
            updateData.itemName = itemName.trim();
        }
        if (price !== undefined) {
            const parsedPrice = Number(price);
            if (isNaN(parsedPrice) || parsedPrice < 0) {
                return NextResponse.json({ success: false, error: 'Price must be a valid non-negative number' }, { status: 400 });
            }
            updateData.price = parsedPrice;
        }

        const updatedItem = await ItemStatus.findByIdAndUpdate(
            itemId,
            updateData,
            { new: true }
        );

        if (!updatedItem) {
            return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: updatedItem });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const itemId = searchParams.get('itemId');
        const restaurantId = searchParams.get('restaurantId');

        if (itemId) {
            // Delete a single item
            const deletedItem = await ItemStatus.findByIdAndDelete(itemId);
            if (!deletedItem) {
                return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
            }
            return NextResponse.json({ success: true, message: 'Item deleted successfully' });
        } else if (restaurantId) {
            // Delete all items for this restaurant
            const result = await ItemStatus.deleteMany({ restaurantId });
            return NextResponse.json({ success: true, message: `Deleted ${result.deletedCount} items` });
        } else {
            return NextResponse.json({ success: false, error: 'itemId or restaurantId is required' }, { status: 400 });
        }
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
