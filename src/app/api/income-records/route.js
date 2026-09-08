import dbConnect from '../../../../lib/mongoose';
import FinalCompletedOrder from '../../../../models/FinalCompletedOrder';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        await dbConnect();

        const orders = await FinalCompletedOrder.find({})
            .sort({ completedAt: -1, createdAt: -1, orderDate: -1, _id: -1 })
            .lean();

        let totalEarningsBeforeCommission = 0;
        let totalEarningsAfterCommission = 0;
        let totalDeliveryCharges = 0;

        const formattedRecords = orders.map((order) => {
            const grandTotal = Number(order.grandTotal) || 0;
            const commissionAmount = Number(order.commissionAmount) || 0;
            const deliveryCharge = Number(order.deliveryCharge) || 0;

            totalEarningsBeforeCommission += grandTotal;
            totalEarningsAfterCommission += commissionAmount;
            totalDeliveryCharges += deliveryCharge;

            return {
                _id: String(order._id),
                orderId: order.orderId || 'N/A',
                restaurantName: order.restaurantName || order.rest || 'N/A',
                restaurantId: order.restaurantId || 'N/A',
                grandTotal: grandTotal,
                commissionAmount: commissionAmount,
                deliveryCharge: deliveryCharge,
                deliveryBoyName: order.deliveryBoyName || 'N/A',
                deliveryBoyPhone: order.deliveryBoyPhone || 'N/A',
                paymentMethod: order.paymentMethod || 'N/A',
                paymentStatus: order.paymentStatus || 'N/A',
                date: order.completedAt || order.createdAt || order.orderDate || null,
                itemsCount: Array.isArray(order.items) ? order.items.length : (order.totalCount || 0)
            };
        });

        return NextResponse.json({
            success: true,
            summary: {
                totalEarningsBeforeCommission: Number(totalEarningsBeforeCommission.toFixed(2)),
                totalEarningsAfterCommission: Number(totalEarningsAfterCommission.toFixed(2)),
                totalDeliveryCharges: Number(totalDeliveryCharges.toFixed(2)),
                totalRecordsCount: orders.length
            },
            records: formattedRecords
        });
    } catch (error) {
        console.error('Error fetching income records:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
