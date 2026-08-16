import dbConnect from '../../../../lib/mongoose';
import PendingPayment from '../../../../models/PendingPayment';
import RestuarentUser from '../../../../models/RestuarentUser';
import FinalCompletedOrder from '../../../../models/FinalCompletedOrder';
import mongoose from 'mongoose';
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

async function getRestaurantData(restaurantId, monthParam) {
    const { year, month, startOfMonth, endOfMonth, monthKey } = getMonthBounds(monthParam);
    const numericRestId = !isNaN(Number(restaurantId)) ? Number(restaurantId) : null;

    // 1. Fetch RestaurantUser to get exact restId, name, phone, and commission rate
    let restaurant = null;
    let commissionRate = 0;
    try {
        const isObjId = mongoose.Types.ObjectId.isValid(restaurantId) && String(new mongoose.Types.ObjectId(restaurantId)) === String(restaurantId);
        const searchConditions = [
            { restId: String(restaurantId) },
            ...(numericRestId !== null ? [{ restId: numericRestId }] : []),
            { name: String(restaurantId) },
            { phone: String(restaurantId) },
            ...(isObjId ? [{ _id: restaurantId }] : [])
        ];
        restaurant = await RestuarentUser.findOne({ $or: searchConditions }).lean();
        if (restaurant) {
            const rawComm = restaurant.commission ?? restaurant.commissionRate ?? restaurant.commissionPercentage ?? restaurant.commission_rate;
            if (rawComm !== undefined && rawComm !== null && rawComm !== "") {
                commissionRate = Number(rawComm) || 0;
            }
        }
    } catch (err) {
        console.error("Error fetching restaurant user in pendingpayments:", err);
    }

    // Build all candidate identifiers for this restaurant
    const possibleIds = Array.from(new Set([
        String(restaurantId),
        ...(numericRestId !== null ? [numericRestId, String(numericRestId)] : []),
        ...(restaurant?.restId ? [String(restaurant.restId), Number(restaurant.restId)] : []),
        ...(restaurant?.name ? [String(restaurant.name)] : []),
        ...(restaurant?.phone ? [String(restaurant.phone)] : [])
    ].filter(v => v !== null && v !== undefined && v !== '' && !Number.isNaN(v))));

    // 2. Fetch PendingPayment record
    const payment = await PendingPayment.findOne({
        $or: [
            { restaurantId: { $in: possibleIds } },
            { restId: { $in: possibleIds } },
            { restaurantName: { $in: possibleIds } }
        ]
    }).lean();

    // 3. Fetch completed orders for this restaurant in the selected month
    const completedOrders = await FinalCompletedOrder.find({
        $and: [
            {
                $or: [
                    { restaurantId: { $in: possibleIds } },
                    { restId: { $in: possibleIds } },
                    { restaurantName: { $in: possibleIds } },
                    { phone: { $in: possibleIds } }
                ]
            },
            {
                $or: [
                    { completedAt: { $gte: startOfMonth, $lte: endOfMonth } },
                    { createdAt: { $gte: startOfMonth, $lte: endOfMonth } },
                    { date: { $gte: startOfMonth, $lte: endOfMonth } }
                ]
            }
        ]
    }).lean();

    // Calculate initial gross total from completed orders
    let initialGrossTotal = 0;
    if (completedOrders && completedOrders.length > 0) {
        initialGrossTotal = completedOrders.reduce((sum, order) => {
            return sum + (Number(order.grandTotal) || Number(order.totalPrice) || Number(order.totalAmount) || Number(order.grossTotal) || Number(order.grossAmount) || 0);
        }, 0);
    } else if (payment && payment.grossTotal !== undefined) {
        initialGrossTotal = Number(payment.grossTotal) || 0;
    }

    // 4. Calculate total paid from transaction history for selected month
    const allTransactions = payment?.transactions || [];
    const monthlyTransactions = allTransactions.filter(tx => {
        if (!tx.date) return false;
        const d = new Date(tx.date);
        return d.getFullYear() === year && (d.getMonth() + 1) === month;
    });

    const monthlyTotalPaid = monthlyTransactions.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

    // 5. Commission multiplier and dynamic Net Pending calculation from DB grandTotal
    const multiplier = commissionRate < 100 ? (100 - commissionRate) / 100 : 1;

    let monthlyNetPending = 0;
    if (payment && payment.grandTotal !== undefined && payment.grandTotal !== null) {
        monthlyNetPending = Number(payment.grandTotal) || 0;
    } else {
        monthlyNetPending = Math.max(0, (initialGrossTotal * multiplier) - monthlyTotalPaid);
    }

    // 6. Dynamic Gross Total corresponding to remaining Net Pending Payout
    let monthlyGrossTotal = 0;
    if (payment && payment.grossTotal !== undefined && payment.grossTotal !== null) {
        monthlyGrossTotal = Number(payment.grossTotal) || 0;
    } else if (multiplier > 0) {
        monthlyGrossTotal = monthlyNetPending / multiplier;
    } else {
        monthlyGrossTotal = monthlyNetPending;
    }

    return {
        payment,
        restaurant,
        monthlyGrossTotal,
        monthlyNetPending,
        monthlyTotalPaid,
        commissionRate,
        monthKey,
        monthlyTransactions,
        allTransactions,
        possibleIds
    };
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

        const data = await getRestaurantData(restaurantId, selectedMonthParam);

        return NextResponse.json({
            success: true,
            data: data.payment || { grandTotal: data.monthlyNetPending, grossTotal: data.monthlyGrossTotal, transactions: [] },
            grossTotal: data.monthlyGrossTotal,
            netPending: data.monthlyNetPending,
            totalPaid: data.monthlyTotalPaid,
            commission: data.commissionRate,
            month: data.monthKey,
            transactions: data.monthlyTransactions,
            allTransactions: data.allTransactions
        });
    } catch (error) {
        console.error("GET pendingpayments error:", error);
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

        const initialData = await getRestaurantData(restaurantId, selectedMonthParam);
        const paidAmount = Number(amount) || 0;

        // Find existing PendingPayment record
        const existingRecord = await PendingPayment.findOne({
            $or: [
                { restaurantId: { $in: initialData.possibleIds } },
                { restId: { $in: initialData.possibleIds } },
                { restaurantName: { $in: initialData.possibleIds } }
            ]
        });

        const targetRestId = existingRecord?.restaurantId || String(restaurantId);

        // Retrieve current DB grandTotal or initial net pending
        let currentGrandTotal = 0;
        if (existingRecord && existingRecord.grandTotal !== undefined && existingRecord.grandTotal !== null) {
            currentGrandTotal = Number(existingRecord.grandTotal) || 0;
        } else {
            currentGrandTotal = initialData.monthlyNetPending || 0;
        }

        const multiplier = initialData.commissionRate < 100 ? (100 - initialData.commissionRate) / 100 : 1;
        const newGrandTotal = Math.max(0, currentGrandTotal - paidAmount);
        const newGrossTotal = multiplier > 0 ? (newGrandTotal / multiplier) : newGrandTotal;

        let updatedPayment;
        if (existingRecord) {
            updatedPayment = await PendingPayment.findOneAndUpdate(
                { _id: existingRecord._id },
                {
                    $set: {
                        grandTotal: newGrandTotal,
                        grossTotal: newGrossTotal
                    },
                    $push: {
                        transactions: {
                            transactionId,
                            amount: paidAmount,
                            date: new Date()
                        }
                    }
                },
                { returnDocument: 'after' }
            );
        } else {
            updatedPayment = await PendingPayment.create({
                restaurantId: targetRestId,
                restaurantName: initialData.restaurant?.name || String(restaurantId),
                grandTotal: newGrandTotal,
                grossTotal: newGrossTotal,
                transactions: [{
                    transactionId,
                    amount: paidAmount,
                    date: new Date()
                }]
            });
        }

        const finalData = await getRestaurantData(restaurantId, selectedMonthParam);

        return NextResponse.json({
            success: true,
            data: finalData.payment,
            grossTotal: finalData.monthlyGrossTotal,
            netPending: finalData.monthlyNetPending,
            totalPaid: finalData.monthlyTotalPaid,
            commission: finalData.commissionRate,
            month: finalData.monthKey,
            transactions: finalData.monthlyTransactions,
            allTransactions: finalData.allTransactions
        });

    } catch (error) {
        console.error("POST pendingpayments error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
