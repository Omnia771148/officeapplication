import dbConnect from '../../../../lib/mongoose';
import PendingPayment from '../../../../models/PendingPayment';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const restaurantId = searchParams.get('restaurantId');

        if (!restaurantId) {
            return NextResponse.json({ success: false, error: 'Restaurant ID is required' }, { status: 400 });
        }

        const payment = await PendingPayment.findOne({ restaurantId });

        if (!payment) {
            return NextResponse.json({ success: true, data: { grandTotal: 0 } });
        }

        return NextResponse.json({ success: true, data: payment });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        await dbConnect();
        const { restaurantId, transactionId, amount } = await request.json();

        if (!restaurantId || !transactionId || !amount) {
            return NextResponse.json({ success: false, error: 'Restaurant ID, Transaction ID, and Amount are required' }, { status: 400 });
        }

        const updatedPayment = await PendingPayment.findOneAndUpdate(
            { restaurantId },
            {
                $set: { grandTotal: 0 },
                $push: {
                    transactions: {
                        transactionId,
                        amount: Number(amount),
                        date: new Date()
                    }
                }
            },
            { new: true }
        );

        if (!updatedPayment) {
            return NextResponse.json({ success: false, error: 'Restaurant not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: updatedPayment });

    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
