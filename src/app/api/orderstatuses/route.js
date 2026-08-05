import dbConnect from '../../../../lib/mongoose';
import OrderStatus from '../../../../models/OrderStatus';
import Order from '../../../../models/Order';
import RestuarentUser from '../../../../models/RestuarentUser';
import AcceptedOrder from '../../../../models/AcceptedOrder';
import AcceptedByDelivery from '../../../../models/AcceptedByDelivery';
import AcceptedByRestaurant from '../../../../models/AcceptedByRestaurant';
import FinalCompletedOrder from '../../../../models/FinalCompletedOrder';
import { NextResponse } from 'next/server';

function getObjectIdDate(id) {
    if (!id) return null;
    try {
        const str = id.toString();
        if (str.length >= 8) {
            const timestamp = parseInt(str.substring(0, 8), 16) * 1000;
            if (!isNaN(timestamp) && timestamp > 1000000000000) {
                return new Date(timestamp);
            }
        }
    } catch (e) {}
    return null;
}

function resolveDate(item) {
    if (!item) return null;
    if (item.createdAt) {
        const d = new Date(item.createdAt);
        if (!isNaN(d.getTime())) return d.toISOString();
    }
    if (item.created_at) {
        const d = new Date(item.created_at);
        if (!isNaN(d.getTime())) return d.toISOString();
    }
    if (item.date) {
        const d = new Date(item.date);
        if (!isNaN(d.getTime())) return d.toISOString();
    }
    if (item.orderDate) {
        const d = new Date(item.orderDate);
        if (!isNaN(d.getTime())) return d.toISOString();
    }
    const oidDate = getObjectIdDate(item._id);
    if (oidDate) return oidDate.toISOString();
    return null;
}

export async function GET() {
    try {
        await dbConnect();
        
        // Fetch from OrderStatus and pending Order collections
        const rawStatuses = await OrderStatus.find({}).sort({ _id: -1 }).lean();
        const pendingOrders = await Order.find({}).sort({ _id: -1 }).lean();

        const statusMap = new Map();

        // Add pending Order entries first (active customer orders)
        for (const order of pendingOrders) {
            const key = String(order.orderId || order.id || order._id);
            const orderCreatedAt = resolveDate(order);
            statusMap.set(key, {
                _id: String(order._id),
                orderId: String(order.orderId || order.id || order._id),
                restaurantId: String(order.restaurantId || ''),
                restaurantName: order.restaurantName || order.name || '',
                restaurantPhone: order.restaurantPhone || order.phone || '',
                userPhone: order.userPhone || order.customerPhone || order.userMobile || order.phone || '',
                status: order.status || 'Yet To Accept',
                createdAt: orderCreatedAt,
                restaurantAcceptedAt: null,
                deliveryBoyAcceptedAt: null,
                items: order.items || []
            });
        }

        // Add/merge OrderStatus entries
        for (const status of rawStatuses) {
            const key = String(status.orderId || status.id || status._id);
            const statusCreatedAt = resolveDate(status);
            
            if (statusMap.has(key)) {
                const existing = statusMap.get(key);
                statusMap.set(key, {
                    ...existing,
                    ...status,
                    _id: String(status._id || existing._id),
                    orderId: String(status.orderId || existing.orderId),
                    createdAt: statusCreatedAt || existing.createdAt
                });
            } else {
                statusMap.set(key, {
                    ...status,
                    _id: String(status._id),
                    orderId: String(status.orderId || status.id || status._id),
                    createdAt: statusCreatedAt,
                    restaurantAcceptedAt: null,
                    deliveryBoyAcceptedAt: null
                });
            }
        }

        const combinedStatuses = Array.from(statusMap.values());

        // Enrich statuses
        const enrichedStatuses = await Promise.all(
            combinedStatuses.map(async (status) => {
                const orderIdVal = status.orderId || status.id;

                if (status.restaurantId) {
                    const restaurant = await RestuarentUser.findOne({ restId: String(status.restaurantId) }).select('phone name').lean();
                    if (restaurant) {
                        if (!status.restaurantPhone) status.restaurantPhone = restaurant.phone;
                        if (!status.restaurantName) status.restaurantName = restaurant.name;
                    }
                }
                
                if (orderIdVal && String(orderIdVal) !== 'undefined' && String(orderIdVal) !== 'null') {
                    const queryConditions = [{ orderId: orderIdVal }, { orderId: String(orderIdVal) }];
                    if (!isNaN(Number(orderIdVal))) {
                        queryConditions.push({ orderId: Number(orderIdVal) });
                    }
                    const query = { $or: queryConditions };

                    // Get restaurant acceptance
                    const acceptedOrder = await AcceptedOrder.findOne(query).lean();
                    if (acceptedOrder) {
                        status.restaurantAcceptedAt = resolveDate(acceptedOrder);
                    } else {
                        const acceptedByRestaurant = await AcceptedByRestaurant.findOne(query).lean();
                        if (acceptedByRestaurant) {
                            status.restaurantAcceptedAt = resolveDate(acceptedByRestaurant);
                        }
                    }

                    // Get delivery boy acceptance
                    const acceptedByDelivery = await AcceptedByDelivery.findOne(query).lean();
                    if (acceptedByDelivery) {
                        status.deliveryBoyAcceptedAt = resolveDate(acceptedByDelivery);
                    } else {
                        const finalCompletedOrder = await FinalCompletedOrder.findOne(query).lean();
                        if (finalCompletedOrder) {
                            status.deliveryBoyAcceptedAt = resolveDate(finalCompletedOrder);
                        }
                    }
                }

                return status;
            })
        );

        return NextResponse.json({ success: true, data: enrichedStatuses });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
