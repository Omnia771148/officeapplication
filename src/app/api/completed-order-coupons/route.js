import dbConnect from '../../../../lib/mongoose';
import FinalCompletedOrder from '../../../../models/FinalCompletedOrder';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        await dbConnect();

        const { searchParams } = new URL(request.url);
        const codeFilter = searchParams.get('code');

        // Fetch all completed orders from finalcompletedorders collection
        const completedOrders = await FinalCompletedOrder.find({})
            .sort({ completedAt: -1, orderDate: -1, createdAt: -1, _id: -1 })
            .lean();

        // Also fetch couponusages collection to cross-reference any usages
        let usagesByOrderId = {};
        try {
            const usages = await mongoose.connection.db.collection('couponusages').find({}).toArray();
            (usages || []).forEach(u => {
                if (u.orderId) {
                    usagesByOrderId[u.orderId] = u;
                }
            });
        } catch (usageErr) {
            console.error('Warning: could not load couponusages collection:', usageErr);
        }

        // Filter and compile orders that used coupon codes
        const ordersWithCoupon = [];
        const couponSummaryMap = {};

        completedOrders.forEach(order => {
            const usage = usagesByOrderId[order.orderId];
            const rawCode = order.couponCode || usage?.couponCode;

            if (rawCode && String(rawCode).trim() && String(rawCode).trim().toLowerCase() !== 'null') {
                const cleanCode = String(rawCode).trim().toUpperCase();

                if (codeFilter && cleanCode !== codeFilter.trim().toUpperCase()) {
                    return;
                }

                const discount = Number(order.discountAmount) || Number(usage?.discountAmount) || 0;
                const grandTotal = Number(order.grandTotal) || Number(order.totalPrice) || 0;
                const completedDate = order.completedAt || order.orderDate || order.createdAt || usage?.usedAt || null;

                const orderEntry = {
                    orderId: order.orderId || 'N/A',
                    couponCode: cleanCode,
                    discountAmount: discount,
                    influencerName: order.influencerName || null,
                    userName: order.userName || order.customerName || 'N/A',
                    userPhone: order.userPhone || order.phone || usage?.userPhone || 'N/A',
                    userEmail: order.userEmail || order.email || 'N/A',
                    userId: order.userId || usage?.userId || 'N/A',
                    restaurantName: order.restaurantName || order.rest || 'N/A',
                    restaurantId: order.restaurantId || 'N/A',
                    grandTotal: grandTotal,
                    paymentMethod: order.paymentMethod || 'N/A',
                    completedAt: completedDate,
                    itemsCount: Array.isArray(order.items) ? order.items.length : (order.totalCount || 0)
                };

                ordersWithCoupon.push(orderEntry);

                if (!couponSummaryMap[cleanCode]) {
                    couponSummaryMap[cleanCode] = {
                        couponCode: cleanCode,
                        influencerName: order.influencerName || null,
                        timesUsed: 0,
                        totalDiscount: 0,
                        totalOrderValue: 0,
                        uniqueUsers: new Set(),
                        orders: []
                    };
                }

                couponSummaryMap[cleanCode].timesUsed += 1;
                couponSummaryMap[cleanCode].totalDiscount += discount;
                couponSummaryMap[cleanCode].totalOrderValue += grandTotal;
                if (orderEntry.userPhone && orderEntry.userPhone !== 'N/A') {
                    couponSummaryMap[cleanCode].uniqueUsers.add(orderEntry.userPhone);
                }
                couponSummaryMap[cleanCode].orders.push(orderEntry);
            }
        });

        // Format summary for response
        const couponsSummary = Object.values(couponSummaryMap).map(c => ({
            couponCode: c.couponCode,
            influencerName: c.influencerName,
            timesUsed: c.timesUsed,
            uniqueUsersCount: c.uniqueUsers.size,
            totalDiscount: Number(c.totalDiscount.toFixed(2)),
            totalOrderValue: Number(c.totalOrderValue.toFixed(2)),
            orders: c.orders
        })).sort((a, b) => b.timesUsed - a.timesUsed);

        const totalDiscountGiven = couponsSummary.reduce((sum, c) => sum + c.totalDiscount, 0);

        return NextResponse.json({
            success: true,
            totalCompletedOrdersWithCoupon: ordersWithCoupon.length,
            uniqueCouponsCount: couponsSummary.length,
            totalDiscountGiven: Number(totalDiscountGiven.toFixed(2)),
            couponsSummary,
            orders: ordersWithCoupon
        });

    } catch (error) {
        console.error('Error retrieving coupon codes from final completed orders:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
