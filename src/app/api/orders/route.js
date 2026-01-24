import dbConnect from '../../../../lib/mongoose';
import Order from '../../../../models/Order';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const restaurantId = searchParams.get('restaurantId');

        const query = {};
        if (restaurantId) {
            query.restaurantId = restaurantId;
        }

        const orders = await Order.find(query);
        return NextResponse.json({ success: true, data: orders });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}
