import dbConnect from '../../../../lib/mongoose';
import PendingPayment from '../../../../models/PendingPayment';
import RestuarentUser from '../../../../models/RestuarentUser';
import FinalCompletedOrder from '../../../../models/FinalCompletedOrder';
import { NextResponse } from 'next/server';

function getMonthBounds(monthParam) {
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth() + 1; // 1-indexed

    if (monthParam && typeof monthParam === 'string' && monthParam.includes('-')) {
        const parts = monthParam.split('-');
        const parsedYear = Number(parts[0]);
        const parsedMonth = Number(parts[1]);
        if (!isNaN(parsedYear) && !isNaN(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12) {
            year = parsedYear;
            month = parsedMonth;
        }
    }

    const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;

    return { year, month, startOfMonth, endOfMonth, monthKey };
}

export async function GET(request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const restaurantId = searchParams.get('restaurantId');
        const selectedMonthParam = searchParams.get('month');

        if (!restaurantId) {
            return NextResponse.json({ success: false, error: 'Restaurant ID is required' }, { status: 400 });
        }

        const { year, month, startOfMonth, endOfMonth, monthKey } = getMonthBounds(selectedMonthParam);

        const numericRestId = !isNaN(Number(restaurantId)) ? Number(restaurantId) : null;

        const payment = await PendingPayment.findOne({
            $or: [
                { restaurantId: String(restaurantId) },
                ...(numericRestId !== null ? [{ restaurantId: numericRestId }] : []),
                { restId: String(restaurantId) },
                ...(numericRestId !== null ? [{ restId: numericRestId }] : [])
            ]
        });

        // Fetch restaurant's commission percentage strictly from database
        let commissionRate = 0;
        try {
            const restaurant = await RestuarentUser.findOne({
                $or: [
                    { restId: String(restaurantId) },
                    ...(numericRestId !== null ? [{ restId: numericRestId }] : []),
                    { _id: String(restaurantId) },
                    { id: String(restaurantId) }
                ]
            }).lean();
            if (restaurant) {
                const rawComm = restaurant.commission ?? restaurant.commissionRate ?? restaurant.commissionPercentage ?? restaurant.commission_rate;
                if (rawComm !== undefined && rawComm !== null && rawComm !== "") {
                    commissionRate = Number(rawComm);
                }
            }
        } catch (err) {
            console.error("Error fetching restaurant commission:", err);
        }

        // Fetch completed orders for this restaurant in the selected month
        const completedOrders = await FinalCompletedOrder.find({
            restaurantId: restaurantId,
            $or: [
                { completedAt: { $gte: startOfMonth, $lte: endOfMonth } },
                { createdAt: { $gte: startOfMonth, $lte: endOfMonth } }
            ]
        }).lean();

        let monthlyGrossTotal = 0;
        if (completedOrders && completedOrders.length > 0) {
            monthlyGrossTotal = completedOrders.reduce((sum, order) => {
                return sum + (Number(order.grandTotal) || Number(order.totalPrice) || Number(order.totalAmount) || 0);
            }, 0);
        } else if (payment) {
            // Fallback to payment.grandTotal if no separate completed orders found
            monthlyGrossTotal = Number(payment.grandTotal) || 0;
        }

        // Filter payouts/transactions recorded for this month
        const allTransactions = payment?.transactions || [];
        const monthlyTransactions = allTransactions.filter(tx => {
            if (!tx.date) return false;
            const d = new Date(tx.date);
            return d.getFullYear() === year && (d.getMonth() + 1) === month;
        });

        const monthlyTotalPaid = monthlyTransactions.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

        const multiplier = (100 - commissionRate) / 100;
        const monthlyInitialNet = monthlyGrossTotal * multiplier;
        const monthlyNetPending = Math.max(0, monthlyInitialNet - monthlyTotalPaid);

        return NextResponse.json({
            success: true,
            data: payment || { grandTotal: monthlyGrossTotal, transactions: [] },
            grossTotal: monthlyGrossTotal,
            netPending: monthlyNetPending,
            totalPaid: monthlyTotalPaid,
            commission: commissionRate,
            month: monthKey,
            transactions: monthlyTransactions,
            allTransactions: allTransactions
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        await dbConnect();
        const { restaurantId, transactionId, amount, month: selectedMonthParam } = await request.json();

        if (!restaurantId || !transactionId || !amount) {
            return NextResponse.json({ success: false, error: 'Restaurant ID, Transaction ID, and Amount are required' }, { status: 400 });
        }

        const { year, month, startOfMonth, endOfMonth, monthKey } = getMonthBounds(selectedMonthParam);

        const numericRestId = !isNaN(Number(restaurantId)) ? Number(restaurantId) : null;

        const paymentRecord = await PendingPayment.findOne({
            $or: [
                { restaurantId: String(restaurantId) },
                ...(numericRestId !== null ? [{ restaurantId: numericRestId }] : []),
                { restId: String(restaurantId) },
                ...(numericRestId !== null ? [{ restId: numericRestId }] : [])
            ]
        });
        if (!paymentRecord) {
            return NextResponse.json({ success: false, error: 'Restaurant not found' }, { status: 404 });
        }

        // Fetch restaurant's commission percentage strictly from database
        let commissionRate = 0;
        try {
            const restaurant = await RestuarentUser.findOne({
                $or: [
                    { restId: String(restaurantId) },
                    ...(numericRestId !== null ? [{ restId: numericRestId }] : []),
                    { _id: String(restaurantId) },
                    { id: String(restaurantId) }
                ]
            }).lean();
            if (restaurant) {
                const rawComm = restaurant.commission ?? restaurant.commissionRate ?? restaurant.commissionPercentage ?? restaurant.commission_rate;
                if (rawComm !== undefined && rawComm !== null && rawComm !== "") {
                    commissionRate = Number(rawComm);
                }
            }
        } catch (err) {
            console.error("Error fetching restaurant commission in POST:", err);
        }

        const paidAmount = Number(amount) || 0;

        // Push new payout transaction with current date
        const updatedPayment = await PendingPayment.findOneAndUpdate(
            { restaurantId },
            {
                $push: {
                    transactions: {
                        transactionId,
                        amount: paidAmount,
                        date: new Date()
                    }
                }
            },
            { new: true }
        );

        if (!updatedPayment) {
            return NextResponse.json({ success: false, error: 'Failed to update payment' }, { status: 500 });
        }

        // Calculate Month-wise stats for response
        const completedOrders = await FinalCompletedOrder.find({
            restaurantId: restaurantId,
            $or: [
                { completedAt: { $gte: startOfMonth, $lte: endOfMonth } },
                { createdAt: { $gte: startOfMonth, $lte: endOfMonth } }
            ]
        }).lean();

        let monthlyGrossTotal = 0;
        if (completedOrders && completedOrders.length > 0) {
            monthlyGrossTotal = completedOrders.reduce((sum, order) => {
                return sum + (Number(order.grandTotal) || Number(order.totalPrice) || Number(order.totalAmount) || 0);
            }, 0);
        } else {
            monthlyGrossTotal = Number(updatedPayment.grandTotal) || 0;
        }

        const allTransactions = updatedPayment.transactions || [];
        const monthlyTransactions = allTransactions.filter(tx => {
            if (!tx.date) return false;
            const d = new Date(tx.date);
            return d.getFullYear() === year && (d.getMonth() + 1) === month;
        });

        const monthlyTotalPaid = monthlyTransactions.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
        const multiplier = (100 - commissionRate) / 100;
        const monthlyInitialNet = monthlyGrossTotal * multiplier;
        const monthlyNetPending = Math.max(0, monthlyInitialNet - monthlyTotalPaid);

        return NextResponse.json({
            success: true,
            data: updatedPayment,
            grossTotal: monthlyGrossTotal,
            netPending: monthlyNetPending,
            totalPaid: monthlyTotalPaid,
            commission: commissionRate,
            month: monthKey,
            transactions: monthlyTransactions,
            allTransactions: allTransactions
        });

    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
