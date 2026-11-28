import dbConnect from '../../../../lib/mongoose';
import PendingPayment from '../../../../models/PendingPayment';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        await dbConnect();

        const payments = await PendingPayment.find({ grandTotal: { $gt: 0 } })
            .sort({ grandTotal: -1 })
            .lean();

        const totalGrandTotal = payments.reduce(
            (sum, item) => sum + (Number(item.grandTotal) || 0),
            0
        );

        return NextResponse.json({
            success: true,
            data: payments,
            totalGrandTotal,
        });
    } catch (error) {
        console.error('Error fetching pending payments:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
