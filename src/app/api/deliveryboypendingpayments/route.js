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

        const currentCharge = paymentRecord.deliveryCharge;

        paymentRecord.transactions.push({
            transactionId,
            amountPaid: currentCharge, // Storing what was cleared
            date: new Date()
        });

        paymentRecord.deliveryCharge = 0;
        await paymentRecord.save();

        return NextResponse.json({ success: true, data: paymentRecord });

    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
