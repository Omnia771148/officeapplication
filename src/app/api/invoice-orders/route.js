import dbConnect from '../../../../lib/mongoose';
import FinalCompletedOrder from '../../../../models/FinalCompletedOrder';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        await dbConnect();

        const orders = await FinalCompletedOrder.find({})
            .sort({ completedAt: -1, orderDate: -1, createdAt: -1, _id: -1 })
            .lean();

        let totalGrandTotal = 0;
        let totalTotalPrice = 0;
        let totalDeliveryFee = 0;
        let totalAmountSentToRestaurants = 0;
        let totalWhatWeGet = 0;

        const formattedOrders = orders.map((order) => {
            const grandTotal = Number(order.grandTotal) || 0;
            const totalPrice = Number(order.totalPrice) || 0;
            const deliveryFee = Number(order.deliveryFee ?? order.deliveryCharge ?? 0);
            
            // Display every order as UPI (read-only for UI presentation, DB is not modified)
            const paymentType = 'UPI';

            const commissionRate = Number(order.commissionRate) || 0;

            // Commission amount in currency
            let commissionAmount = Number(order.commissionAmount);
            if (isNaN(commissionAmount) || commissionAmount === 0) {
                if (commissionRate > 0 && totalPrice > 0) {
                    commissionAmount = Number(((totalPrice * commissionRate) / 100).toFixed(2));
                } else {
                    commissionAmount = 0;
                }
            }

            // Amount sent to restaurants = totalprice - commission
            // Using DB's totalPriceAfterCommission or netEarnings if present, or computing totalPrice - commissionAmount
            let amountSentToRestaurants = 0;
            if (order.totalPriceAfterCommission !== undefined && order.totalPriceAfterCommission !== null) {
                amountSentToRestaurants = Number(order.totalPriceAfterCommission);
            } else if (order.netEarnings !== undefined && order.netEarnings !== null) {
                amountSentToRestaurants = Number(order.netEarnings);
            } else {
                amountSentToRestaurants = Number((totalPrice - commissionAmount).toFixed(2));
            }

            // What we get = commission cut (totalPrice - amountSentToRestaurants)
            // Or magnitude of amountSentToRestaurants - totalPrice
            let whatWeGet = Number(Math.abs(totalPrice - amountSentToRestaurants).toFixed(2));
            if (whatWeGet === 0 && commissionAmount > 0) {
                whatWeGet = commissionAmount;
            }

            totalGrandTotal += grandTotal;
            totalTotalPrice += totalPrice;
            totalDeliveryFee += deliveryFee;
            totalAmountSentToRestaurants += amountSentToRestaurants;
            totalWhatWeGet += whatWeGet;

            return {
                _id: String(order._id),
                orderId: order.orderId || 'N/A',
                restaurantName: order.restaurantName || order.rest || 'N/A',
                restaurantId: order.restaurantId || 'N/A',
                grandTotal: Number(grandTotal.toFixed(2)),
                totalPrice: Number(totalPrice.toFixed(2)),
                deliveryFee: Number(deliveryFee.toFixed(2)),
                paymentType: paymentType,
                commissionRate: commissionRate,
                commissionAmount: Number(commissionAmount.toFixed(2)),
                amountSentToRestaurants: Number(amountSentToRestaurants.toFixed(2)),
                whatWeGet: Number(whatWeGet.toFixed(2)),
                orderDate: order.completedAt || order.orderDate || order.createdAt || null,
                status: order.status || order.orderStatus || 'Delivered'
            };
        });

        return NextResponse.json({
            success: true,
            summary: {
                totalOrders: formattedOrders.length,
                totalGrandTotal: Number(totalGrandTotal.toFixed(2)),
                totalTotalPrice: Number(totalTotalPrice.toFixed(2)),
                totalDeliveryFee: Number(totalDeliveryFee.toFixed(2)),
                totalAmountSentToRestaurants: Number(totalAmountSentToRestaurants.toFixed(2)),
                totalWhatWeGet: Number(totalWhatWeGet.toFixed(2))
            },
            orders: formattedOrders
        });
    } catch (error) {
        console.error('Error fetching final completed orders for invoices:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
