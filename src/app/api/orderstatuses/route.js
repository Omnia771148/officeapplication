import dbConnect from '../../../../lib/mongoose';
import OrderStatus from '../../../../models/OrderStatus';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        await dbConnect();
        const statuses = await OrderStatus.find({}).sort({ createdAt: -1 }); // Get latest statuses first
        return NextResponse.json({ success: true, data: statuses });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
