import dbConnect from '../../../../lib/mongoose';
import PendingPaymentOfDeliveryBoy from '../../../../models/PendingPaymentOfDeliveryBoy';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        await dbConnect();

        const rawPayments = await PendingPaymentOfDeliveryBoy.find({}).lean();

        const payments = rawPayments.map(p => {
            const charge = p.deliverycharges !== undefined 
                ? Number(p.deliverycharges) 
                : (p.deliveryCharge !== undefined ? Number(p.deliveryCharge) : (p.deliveryCharges !== undefined ? Number(p.deliveryCharges) : 0));
            return {
                ...p,
                deliverycharges: charge,
                deliveryCharge: charge
            };
        });

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

        const currentCharge = paymentRecord.deliverycharges !== undefined 
            ? Number(paymentRecord.deliverycharges) 
            : (paymentRecord.deliveryCharge !== undefined ? Number(paymentRecord.deliveryCharge) : 0);

        const newCharge = Math.max(0, currentCharge - parsedAmount);
        paymentRecord.deliveryCharge = newCharge;
        paymentRecord.deliverycharges = newCharge;

        await paymentRecord.save();

        return NextResponse.json({ success: true, data: paymentRecord });

    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
