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
