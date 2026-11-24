import dbConnect from '../../../../lib/mongoose';
import User from '../../../../models/User';
import FinalCompletedOrder from '../../../../models/FinalCompletedOrder';
import { NextResponse } from 'next/server';

function normalizePhone(phone) {
    if (!phone) return '';
    const digits = String(phone).replace(/\D/g, '');
    return digits.length >= 10 ? digits.slice(-10) : digits;
}

function normalizeEmail(email) {
    if (!email) return '';
    return String(email).trim().toLowerCase();
}

export async function GET() {
    try {
        await dbConnect();

        const [users, completedOrders] = await Promise.all([
            User.find({}, { name: 1, email: 1, phone: 1, createdAt: 1 }).lean(),
            FinalCompletedOrder.find(
                {},
                {
                    userId: 1,
                    user_id: 1,
                    userEmail: 1,
                    email: 1,
                    userPhone: 1,
                    phone: 1,
                    restaurantName: 1,
                    rest: 1,
                    grandTotal: 1,
                    completedAt: 1,
                    orderDate: 1,
                    createdAt: 1
                }
            ).lean()
        ]);

        // Build lookup maps for fast matching
        const byId = new Map();
        const byPhone = new Map();
        const byEmail = new Map();

        const customerRecords = users.map((u) => {
            const idStr = String(u._id);
            const phone = u.phone ? String(u.phone).trim() : '';
            const email = u.email ? String(u.email).trim() : '';
            const name = u.name ? String(u.name).trim() : 'N/A';

            const record = {
                _id: idStr,
                name: name || 'N/A',
                email: email || 'N/A',
                phone: phone || 'N/A',
                totalOrders: 0,
                totalSpent: 0,
                restaurantCounts: {},
                restaurantSpent: {},
                orderDates: [],
                restaurantOrderDates: {},
                lastOrderAt: null
            };

            byId.set(idStr, record);

            const normPhone = normalizePhone(phone);
            if (normPhone && !byPhone.has(normPhone)) {
                byPhone.set(normPhone, record);
            }

            const normEmail = normalizeEmail(email);
            if (normEmail && !byEmail.has(normEmail)) {
                byEmail.set(normEmail, record);
            }

            return record;
        });

        const restaurantSet = new Set();

        for (const order of completedOrders) {
            const restNameRaw = order.restaurantName || order.rest;
            const restName = restNameRaw ? String(restNameRaw).trim() : 'Unknown Restaurant';
            if (restName && restName !== 'N/A') {
                restaurantSet.add(restName);
            }

            // Match order to a user from users collection
            let matched = null;
            const orderUserId = order.userId || order.user_id;
            if (orderUserId) {
                matched = byId.get(String(orderUserId));
            }
            if (!matched) {
                const normOrderPhone = normalizePhone(order.userPhone || order.phone);
                if (normOrderPhone) {
                    matched = byPhone.get(normOrderPhone);
                }
            }
            if (!matched) {
                const normOrderEmail = normalizeEmail(order.userEmail || order.email);
                if (normOrderEmail) {
                    matched = byEmail.get(normOrderEmail);
                }
            }

            if (matched) {
                const amount = Number(order.grandTotal) || 0;
                matched.totalOrders += 1;
                matched.totalSpent = Number((matched.totalSpent + amount).toFixed(2));
                matched.restaurantCounts[restName] = (matched.restaurantCounts[restName] || 0) + 1;
                matched.restaurantSpent[restName] = Number(
                    ((matched.restaurantSpent[restName] || 0) + amount).toFixed(2)
                );

                const placedTime = order.createdAt || order.orderDate || order.completedAt;
                if (placedTime) {
                    const ts = new Date(placedTime).getTime();
                    if (!isNaN(ts)) {
                        const isoStr = new Date(ts).toISOString();
                        matched.orderDates.push(isoStr);
                        if (!matched.restaurantOrderDates[restName]) {
                            matched.restaurantOrderDates[restName] = [];
                        }
                        matched.restaurantOrderDates[restName].push(isoStr);

                        if (!matched.lastOrderAt || ts > new Date(matched.lastOrderAt).getTime()) {
                            matched.lastOrderAt = isoStr;
                        }
                    }
                }
            }
        }

        // Sort each customer's order dates newest first
        for (const record of customerRecords) {
            record.orderDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
            for (const rKey of Object.keys(record.restaurantOrderDates)) {
                record.restaurantOrderDates[rKey].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
            }
        }

        // Default sort: highest order count first, then name alphabetically
        customerRecords.sort((a, b) => {
            if (b.totalOrders !== a.totalOrders) return b.totalOrders - a.totalOrders;
            return a.name.localeCompare(b.name);
        });

        const restaurants = Array.from(restaurantSet).sort((a, b) => a.localeCompare(b));

        return NextResponse.json({
            success: true,
            totalCustomers: customerRecords.length,
            totalCompletedOrders: completedOrders.length,
            restaurants,
            customers: customerRecords
        });
    } catch (error) {
        console.error('Error fetching customer order counts:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to load customer order counts' },
            { status: 500 }
        );
    }
}
