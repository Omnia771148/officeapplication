import dbConnect from '../../../../lib/mongoose';
import Order from '../../../../models/Order';
import AdminFCMToken from '../../../../models/AdminFCMToken';
import admin from '../../../../lib/firebaseAdmin';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        await dbConnect();

        // Get threshold for 30 seconds ago
        const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);

        // Find ALL current orders in the collection
        const allOrders = await Order.find({});

        // Filter those older than 30 seconds using createdAt or _id timestamp
        const staleOrders = allOrders.filter(order => {
            // Priority 1: createdAt field
            if (order.createdAt && new Date(order.createdAt) < thirtySecondsAgo) return true;

            // Priority 2: Extract timestamp from ObjectId
            try {
                const idTimestamp = new Date(parseInt(order._id.toString().substring(0, 8), 16) * 1000);
                if (idTimestamp < thirtySecondsAgo) return true;
            } catch (e) {
                console.error('Failed to parse _id for order:', order._id);
            }

            return false;
        });

        if (staleOrders.length > 0) {
            // Fetch all registered admin tokens
            const allTokens = await AdminFCMToken.find({});
            const registrationTokens = allTokens.map(t => t.token);

            if (registrationTokens.length > 0 && admin.apps.length > 0) {
                const message = {
                    notification: {
                        title: 'URGENT: Orders Not Accepted',
                        body: `${staleOrders.length} orders have been pending for more than 30 seconds!`
                    },
                    data: {
                        click_action: 'FLUTTER_NOTIFICATION_CLICK', // optional
                        status: 'alert'
                    },
                    tokens: registrationTokens
                };

                try {
                    const response = await admin.messaging().sendMulticast(message);
                    console.log('Firebase notifications sent:', response.successCount);

                    // Cleanup invalid tokens if any (optional but good practice)
                    if (response.failureCount > 0) {
                        const failedTokens = [];
                        response.responses.forEach((resp, idx) => {
                            if (!resp.success) {
                                failedTokens.push(registrationTokens[idx]);
                            }
                        });
                        if (failedTokens.length > 0) {
                            await AdminFCMToken.deleteMany({ token: { $in: failedTokens } });
                        }
                    }
                } catch (err) {
                    console.error('Firebase send error:', err);
                }
            }
        }

        return NextResponse.json({
            success: true,
            count: staleOrders.length,
            status: staleOrders.length > 0 ? 'ALERT' : 'OK',
            orders: staleOrders.map(o => ({ id: o._id, restaurantId: o.restaurantId }))
        });

    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
