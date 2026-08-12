import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongoose';
import DeliveryBoyUser from '../../../../models/DeliveryBoyUser';

export async function GET() {
    try {
        await dbConnect();
        const deliveryBoys = await DeliveryBoyUser.find({});
        return NextResponse.json(deliveryBoys, { status: 200 });
    } catch (error) {
        console.error('Error fetching delivery boys:', error);
        return NextResponse.json({ error: 'Failed to fetch delivery boys' }, { status: 500 });
    }
}

export async function PATCH(request) {
    try {
        await dbConnect();
        const { id, isBlocked, isActive } = await request.json();

        if (!id) {
            return NextResponse.json({ success: false, error: 'Delivery Boy ID is required' }, { status: 400 });
        }

        const updateData = {};
        if (isBlocked !== undefined) {
            updateData.isBlocked = isBlocked;
            // Sync isActive with block status if not explicitly overridden
            if (isActive === undefined) {
                updateData.isActive = !isBlocked;
            }
        }
        if (isActive !== undefined) {
            updateData.isActive = isActive;
        }

        const updatedBoy = await DeliveryBoyUser.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        );

        if (!updatedBoy) {
            return NextResponse.json({ success: false, error: 'Delivery Boy not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: updatedBoy }, { status: 200 });
    } catch (error) {
        console.error('Error updating delivery boy status:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
