import dbConnect from '../../../../lib/mongoose';
import FinalCompletedOrder from '../../../../models/FinalCompletedOrder';
import RestuarentUser from '../../../../models/RestuarentUser';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const restaurantId = searchParams.get('restaurantId');

        if (!restaurantId) {
            return NextResponse.json({ success: false, error: 'Restaurant ID is required' }, { status: 400 });
        }

        // Fetch FSSAI license number
        const restaurant = await RestuarentUser.findOne({ restId: restaurantId }).lean();
        const fssai = restaurant ? restaurant.fssai : 'N/A';

        // Calculate date 7 days ago
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        // Fetch completed orders for this restaurant in the last 7 days
        const orders = await FinalCompletedOrder.find({
            restaurantId: restaurantId,
            $or: [
                { completedAt: { $gte: sevenDaysAgo } },
                { createdAt: { $gte: sevenDaysAgo } }
            ]
        }).lean();

        // Initialize 7 days array
        const stats = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateString = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const keyString = date.toISOString().split('T')[0]; // YYYY-MM-DD
            
            stats.push({
                dateLabel: dateString,
                key: keyString,
                count: 0,
                revenue: 0
            });
        }

        // Aggregate orders by day
        orders.forEach(order => {
            const orderDateStr = order.completedAt || order.createdAt;
            if (!orderDateStr) return;
            
            const orderDate = new Date(orderDateStr);
            const key = orderDate.toISOString().split('T')[0];
            
            const dayStat = stats.find(s => s.key === key);
            if (dayStat) {
                dayStat.count += 1;
                dayStat.revenue += Number(order.grandTotal) || Number(order.totalPrice) || 0;
            }
        });

        return NextResponse.json({ 
            success: true, 
            data: stats, 
            fssai,
            restaurantDetails: restaurant ? {
                email: restaurant.email,
                phone: restaurant.phone,
                name: restaurant.name || "",
                offerTitle: restaurant.offerTitle || "",
                password: restaurant.password,
                restId: restaurant.restId,
                restLocation: restaurant.restLocation,
                address: restaurant.address,
                fssai: restaurant.fssai,
                openTime: restaurant.openTime,
                closeTime: restaurant.closeTime,
                restaurantLocation: restaurant.restaurantLocation,
                logoUrl: restaurant.logoUrl,
                vegOrNonVeg: restaurant.vegOrNonVeg || "Both"
            } : null
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
