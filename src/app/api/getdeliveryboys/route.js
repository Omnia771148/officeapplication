import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongoose';
import DeliveryBoyNewAdd from '../../../../models/DeliveryBoyNewAdd';

export async function GET() {
    try {
        await dbConnect();
        const deliveryBoys = await DeliveryBoyNewAdd.find({});
        return NextResponse.json(deliveryBoys, { status: 200 });
    } catch (error) {
        console.error('Error fetching delivery boys:', error);
        return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }
}
