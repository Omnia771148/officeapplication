import dbConnect from '../../../../lib/mongoose';
import FinalCompletedOrder from '../../../../models/FinalCompletedOrder';
import RestuarentUser from '../../../../models/RestuarentUser';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        await dbConnect();

        const [orders, restaurantUsers] = await Promise.all([
            FinalCompletedOrder.find({})
                .sort({ completedAt: -1, createdAt: -1, orderDate: -1, _id: -1 })
                .lean(),
            RestuarentUser.find({}, { name: 1, restId: 1 })
                .sort({ name: 1 })
                .lean()
        ]);

        const restaurantSet = new Set();
        (restaurantUsers || []).forEach((r) => {
            if (r.name && r.name.trim()) restaurantSet.add(r.name.trim());
        });

        // Also ensure any restaurant name present in completed orders is preserved
        orders.forEach((o) => {
            const name = o.restaurantName || o.rest;
            if (name && name.trim()) restaurantSet.add(name.trim());
        });

        const restaurantList = Array.from(restaurantSet).sort((a, b) =>
            a.localeCompare(b, undefined, { sensitivity: 'base' })
        );

        let totalNetEarnings = 0;
        let totalCoinsEarned = 0;
        let totalGrandTotal = 0;

        const formattedOrders = orders.map((order) => {
            const netEarnings = order.netEarnings !== undefined && order.netEarnings !== null
                ? Number(order.netEarnings)
                : 0;
            const coinsEarned = order.coinsEarned !== undefined && order.coinsEarned !== null
                ? Number(order.coinsEarned)
                : 0;
            const grandTotal = Number(order.grandTotal) || Number(order.totalPrice) || 0;

            totalNetEarnings += netEarnings;
            totalCoinsEarned += coinsEarned;
            totalGrandTotal += grandTotal;

            return {
                _id: String(order._id),
                orderId: order.orderId || 'N/A',
                // Customer details
                userName: order.userName || order.customerName || 'N/A',
                userPhone: order.userPhone || order.phone || 'N/A',
                // Restaurant details
                restaurantName: order.restaurantName || order.rest || 'N/A',
                restaurantId: order.restaurantId || 'N/A',
                // Earnings & coins
                coinsEarned: coinsEarned,
                netEarnings: Number(netEarnings.toFixed(2)),
                // Delivery partner details
                deliveryBoyId: order.deliveryBoyId || 'N/A',
                deliveryBoyName: order.deliveryBoyName || 'N/A',
                deliveryBoyPhone: order.deliveryBoyPhone || 'N/A',
                // General order details
                grandTotal: Number(grandTotal.toFixed(2)),
                deliveryCharge: Number(order.deliveryCharge) || 0,
                commissionAmount: Number(order.commissionAmount) || 0,
                paymentMethod: order.paymentMethod || 'N/A',
                paymentStatus: order.paymentStatus || (order.isPaid ? 'Paid' : 'Unpaid'),
                status: order.status || order.orderStatus || 'Delivered',
                orderDate: order.completedAt || order.orderDate || order.createdAt || null,
                deliveryAddress: [order.flatNo, order.street, order.landmark, order.deliveryAddress]
                    .filter(Boolean)
                    .join(', ') || order.deliveryAddress || 'N/A',
                items: Array.isArray(order.items) ? order.items : [],
                itemsCount: Array.isArray(order.items) ? order.items.length : (order.totalCount || 0)
            };
        });

        return NextResponse.json({
            success: true,
            restaurants: restaurantList,
            summary: {
                totalOrders: orders.length,
                totalNetEarnings: Number(totalNetEarnings.toFixed(2)),
                totalCoinsEarned: totalCoinsEarned,
                totalGrandTotal: Number(totalGrandTotal.toFixed(2))
            },
            orders: formattedOrders
        });
    } catch (error) {
        console.error('Error fetching total completed orders:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
