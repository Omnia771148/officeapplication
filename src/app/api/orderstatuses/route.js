import dbConnect from '../../../../lib/mongoose';
import OrderStatus from '../../../../models/OrderStatus';
import RestuarentUser from '../../../../models/RestuarentUser';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        await dbConnect();
        const statuses = await OrderStatus.find({}).sort({ createdAt: -1 }).lean(); // Get latest statuses first

        // Fetch restaurant phone from RestuarentUser
        const enrichedStatuses = await Promise.all(
            statuses.map(async (status) => {
                if (status.restaurantId) {
                    const restaurant = await RestuarentUser.findOne({ restId: status.restaurantId }).select('phone name').lean();
                    if (restaurant) {
                        if (!status.restaurantPhone) status.restaurantPhone = restaurant.phone;
                        if (!status.restaurantName) status.restaurantName = restaurant.name;
                    }
                }
                return status;
            })
        );

        return NextResponse.json({ success: true, data: enrichedStatuses });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
