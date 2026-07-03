import dbConnect from '../../../../lib/mongoose';
import Category from '../../../../models/Category';
import { getRestaurantItemModel } from '../../../../lib/mongoose';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const restaurantId = searchParams.get('restaurantId');

        if (!restaurantId) {
            return NextResponse.json({ success: false, error: 'Restaurant ID is required' }, { status: 400 });
        }

        const categories = await Category.find({ restaurantId }).sort({ name: 1 });
        return NextResponse.json({ success: true, data: categories });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        await dbConnect();
        const { restaurantId, name } = await request.json();

        if (!restaurantId || !name || !name.trim()) {
            return NextResponse.json({ success: false, error: 'Restaurant ID and Category Name are required' }, { status: 400 });
        }

        const sanitizedName = name.trim();

        // Case-insensitive check to avoid duplicate category names
        const exists = await Category.findOne({
            restaurantId,
            name: { $regex: new RegExp(`^${sanitizedName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') }
        });

        if (exists) {
            return NextResponse.json({ success: false, error: 'Category already exists' }, { status: 409 });
        }

        const newCategory = await Category.create({
            restaurantId,
            name: sanitizedName
        });

        return NextResponse.json({ success: true, data: newCategory }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        await dbConnect();
        const { restaurantId, oldName, newName } = await request.json();

        if (!restaurantId || !oldName || !oldName.trim() || !newName || !newName.trim()) {
            return NextResponse.json({ success: false, error: 'Restaurant ID, Old Name, and New Name are required' }, { status: 400 });
        }

        const sanitizedOld = oldName.trim();
        const sanitizedNew = newName.trim();

        if (sanitizedOld.toLowerCase() === sanitizedNew.toLowerCase()) {
            // Update case only
            const cat = await Category.findOne({ restaurantId, name: sanitizedOld });
            if (cat) {
                cat.name = sanitizedNew;
                await cat.save();
            }
            return NextResponse.json({ success: true });
        }

        // Verify the new name is unique for this restaurant (case-insensitive check)
        const exists = await Category.findOne({
            restaurantId,
            name: { $regex: new RegExp(`^${sanitizedNew.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') }
        });

        if (exists) {
            return NextResponse.json({ success: false, error: 'Category already exists' }, { status: 409 });
        }

        const updated = await Category.findOneAndUpdate(
            { restaurantId, name: sanitizedOld },
            { name: sanitizedNew },
            { new: true }
        );

        if (!updated) {
            return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 });
        }

        // Propagate the name change to all items of this category in the dynamic collection
        try {
            const ItemModel = await getRestaurantItemModel(restaurantId);
            await ItemModel.updateMany({ category: sanitizedOld }, { $set: { category: sanitizedNew } });
        } catch (dbErr) {
            console.error("Failed to propagate category name change:", dbErr);
        }

        return NextResponse.json({ success: true, data: updated });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        await dbConnect();
        const { restaurantId, name } = await request.json();

        if (!restaurantId || !name || !name.trim()) {
            return NextResponse.json({ success: false, error: 'Restaurant ID and Category Name are required' }, { status: 400 });
        }

        const sanitizedName = name.trim();

        const deleted = await Category.findOneAndDelete({ restaurantId, name: sanitizedName });
        if (!deleted) {
            return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 });
        }

        // Clear the category attribute from all items of this category in the dynamic collection
        try {
            const ItemModel = await getRestaurantItemModel(restaurantId);
            await ItemModel.updateMany({ category: sanitizedName }, { $set: { category: "" } });
        } catch (dbErr) {
            console.error("Failed to clear categories from items on deletion:", dbErr);
        }

        return NextResponse.json({ success: true, message: 'Category deleted successfully' });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
