import dbConnect from '../../../../lib/mongoose';
import PendingPaymentOfDeliveryBoy from '../../../../models/PendingPaymentOfDeliveryBoy';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        await dbConnect();

        // Use the model to fetch data. The model is now configured with the correct collection name.
        const payments = await PendingPaymentOfDeliveryBoy.find({});

        return NextResponse.json({ success: true, data: payments });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        await dbConnect();
        const { deliveryBoyId, transactionId, amountPaid } = await request.json();

        if (!deliveryBoyId || !transactionId) {
            return NextResponse.json({ success: false, error: 'Delivery Boy ID and Transaction ID are required' }, { status: 400 });
        }

        const paymentRecord = await PendingPaymentOfDeliveryBoy.findOne({ deliveryBoyId });

        if (!paymentRecord) {
            return NextResponse.json({ success: false, error: 'Record not found' }, { status: 404 });
        }

        const parsedAmount = Number(amountPaid);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return NextResponse.json({ success: false, error: 'Valid amount paid is required' }, { status: 400 });
        }

        paymentRecord.transactions.push({
            transactionId,
            amountPaid: parsedAmount,
            date: new Date()
        });

        paymentRecord.deliveryCharge = Math.max(0, paymentRecord.deliveryCharge - parsedAmount);
        await paymentRecord.save();

        return NextResponse.json({ success: true, data: paymentRecord });

    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
