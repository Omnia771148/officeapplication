import dbConnect from '../../../../lib/mongoose';
import ItemStatus from '../../../../models/ItemStatus';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        await dbConnect();
        const { existingId, newId } = await request.json();

        if (!existingId || !newId) {
            return NextResponse.json(
                { success: false, error: 'Both Existing Restaurant ID and New Restaurant ID are required.' },
                { status: 400 }
            );
        }

        // Perform the update on ItemStatus collection
        const result = await ItemStatus.updateMany(
            { restaurantId: existingId },
            { $set: { restaurantId: newId } }
        );

        // nModified or modifiedCount holds the number of updated documents
        const count = result.modifiedCount !== undefined ? result.modifiedCount : (result.nModified !== undefined ? result.nModified : 0);

        return NextResponse.json({
            success: true,
            modifiedCount: count
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
