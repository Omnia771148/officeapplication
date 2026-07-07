import { getRestaurantItemModel } from '../../../../lib/mongoose';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const restaurantId = searchParams.get('restaurantId');

        if (!restaurantId) {
            return NextResponse.json({ success: false, error: 'Restaurant ID is required' }, { status: 400 });
        }

        const RestaurantItem = await getRestaurantItemModel(restaurantId);

        // Backfill existing database items that don't have the field set yet
        await RestaurantItem.updateMany(
            { itemtodisplayintherestuarentapp: { $exists: false } },
            { $set: { itemtodisplayintherestuarentapp: true } }
        );

        const items = await RestaurantItem.find({}).sort({ createdAt: -1 });
        return NextResponse.json({ success: true, data: items });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function PATCH(request) {
    try {
        const { itemId, itemStatus, itemtodisplayintherestuarentapp, itemName, price, offerpercentage, restaurantId, applyToAll } = await request.json();

        if (!restaurantId) {
            return NextResponse.json({ success: false, error: 'Restaurant ID is required' }, { status: 400 });
        }

        if (applyToAll) {
            if (offerpercentage === undefined) {
                return NextResponse.json({ success: false, error: 'Offer percentage is required' }, { status: 400 });
            }
            const parsedOffer = Number(offerpercentage);
            if (isNaN(parsedOffer) || parsedOffer < 0 || parsedOffer > 100) {
                return NextResponse.json({ success: false, error: 'Offer percentage must be a number between 0 and 100' }, { status: 400 });
            }
            const RestaurantItem = await getRestaurantItemModel(restaurantId);
            await RestaurantItem.updateMany({}, { offerpercentage: parsedOffer });
            return NextResponse.json({ success: true, message: `Applied ${parsedOffer}% offer to all items` });
        }

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
        if (offerpercentage !== undefined) {
            const parsedOffer = Number(offerpercentage);
            if (isNaN(parsedOffer) || parsedOffer < 0 || parsedOffer > 100) {
                return NextResponse.json({ success: false, error: 'Offer percentage must be a number between 0 and 100' }, { status: 400 });
            }
            updateData.offerpercentage = parsedOffer;
        }

        const RestaurantItem = await getRestaurantItemModel(restaurantId);

        const updatedItem = await RestaurantItem.findByIdAndUpdate(
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
        const { searchParams } = new URL(request.url);
        const itemId = searchParams.get('itemId');
        const restaurantId = searchParams.get('restaurantId');

        if (!restaurantId) {
            return NextResponse.json({ success: false, error: 'Restaurant ID is required' }, { status: 400 });
        }

        const RestaurantItem = await getRestaurantItemModel(restaurantId);

        if (itemId) {
            // Delete a single item
            const deletedItem = await RestaurantItem.findByIdAndDelete(itemId);
            if (!deletedItem) {
                return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
            }
            return NextResponse.json({ success: true, message: 'Item deleted successfully' });
        } else {
            // Delete all items for this restaurant
            const result = await RestaurantItem.deleteMany({});
            return NextResponse.json({ success: true, message: `Deleted ${result.deletedCount} items` });
        }
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
