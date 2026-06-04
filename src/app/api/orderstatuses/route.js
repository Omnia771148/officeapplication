import dbConnect from '../../../../lib/mongoose';
import OrderStatus from '../../../../models/OrderStatus';
import RestuarentUser from '../../../../models/RestuarentUser';
import AcceptedOrder from '../../../../models/AcceptedOrder';
import AcceptedByDelivery from '../../../../models/AcceptedByDelivery';
import AcceptedByRestaurant from '../../../../models/AcceptedByRestaurant';
import FinalCompletedOrder from '../../../../models/FinalCompletedOrder';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        await dbConnect();
        const statuses = await OrderStatus.find({}).sort({ createdAt: -1 }).lean(); // Get latest statuses first

        // Fetch restaurant phone from RestuarentUser and acceptance time from AcceptedOrder
        const enrichedStatuses = await Promise.all(
            statuses.map(async (status) => {
                if (status.restaurantId) {
                    const restaurant = await RestuarentUser.findOne({ restId: status.restaurantId }).select('phone name').lean();
                    if (restaurant) {
                        if (!status.restaurantPhone) status.restaurantPhone = restaurant.phone;
                        if (!status.restaurantName) status.restaurantName = restaurant.name;
                    }
                }
                
                // Get the time the restaurant accepted the order
                const acceptedOrder = await AcceptedOrder.findOne({ orderId: status.orderId }).lean();
                if (acceptedOrder && acceptedOrder._id) {
                    // Extract timestamp from ObjectId if createdAt is not available
                    status.restaurantAcceptedAt = acceptedOrder.createdAt || new Date(parseInt(acceptedOrder._id.toString().substring(0, 8), 16) * 1000);
                } else {
                    // Fallback to acceptedbyrestorents collection if deleted from acceptedorders
                    const acceptedByRestaurant = await AcceptedByRestaurant.findOne({ orderId: status.orderId }).lean();
                    if (acceptedByRestaurant && acceptedByRestaurant._id) {
                        status.restaurantAcceptedAt = acceptedByRestaurant.createdAt || new Date(parseInt(acceptedByRestaurant._id.toString().substring(0, 8), 16) * 1000);
                    }
                }

                // Get the time the delivery boy accepted the order
                const acceptedByDelivery = await AcceptedByDelivery.findOne({ orderId: status.orderId }).lean();
                if (acceptedByDelivery && acceptedByDelivery._id) {
                    status.deliveryBoyAcceptedAt = acceptedByDelivery.acceptedAt || acceptedByDelivery.createdAt || new Date(parseInt(acceptedByDelivery._id.toString().substring(0, 8), 16) * 1000);
                } else {
                    // Fallback to finalcompletedorders if completed and deleted from active delivery acceptance collection
                    const finalCompletedOrder = await FinalCompletedOrder.findOne({ orderId: status.orderId }).lean();
                    if (finalCompletedOrder && finalCompletedOrder._id) {
                        status.deliveryBoyAcceptedAt = finalCompletedOrder.acceptedAt || finalCompletedOrder.createdAt || new Date(parseInt(finalCompletedOrder._id.toString().substring(0, 8), 16) * 1000);
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
