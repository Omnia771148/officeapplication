import dbConnect from '../../../../lib/mongoose';
import User from '../../../../models/User';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';

// GET /api/customer-coupons?userId=...
export async function GET(request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 });
        }

        const [user, allRestaurants] = await Promise.all([
            User.findById(userId).select('name phone customCoupons').lean(),
            mongoose.connection.db.collection('restuarentusers')
                .find({}, { projection: { _id: 1, restId: 1, name: 1, restLocation: 1 } })
                .sort({ name: 1 })
                .toArray()
        ]);

        if (!user) {
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
        }

        const restaurantList = (allRestaurants || []).map(r => ({
            _id: r._id.toString(),
            restId: String(r.restId || r._id.toString()),
            name: r.name || `Restaurant ${r.restId || ''}`,
            restLocation: r.restLocation || ''
        }));

        return NextResponse.json({
            success: true,
            coupons: Array.isArray(user.customCoupons) ? user.customCoupons : [],
            restaurants: restaurantList
        });
    } catch (error) {
        console.error('Error fetching customer coupons:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// POST /api/customer-coupons
export async function POST(request) {
    try {
        await dbConnect();
        const body = await request.json();
        const { userId, couponCode, couponType, discountType, discountValue, restId, restaurantName } = body;

        if (!userId || !couponCode || !discountValue) {
            return NextResponse.json({
                success: false,
                error: 'userId, couponCode, and discountValue are required'
            }, { status: 400 });
        }

        const cleanCode = String(couponCode).trim().toUpperCase();
        const cleanVal = Number(discountValue) || 0;
        const cleanType = (discountType === 'percentage' || discountType === '%') ? 'percentage' : 'flat';
        const cleanTarget = (couponType === 'delivery') ? 'delivery' : 'items';
        const targetRestId = restId && restId !== 'all' ? String(restId).trim() : null;
        const targetRestName = targetRestId ? String(restaurantName || 'Specific Restaurant').trim() : 'All Restaurants';

        if (cleanVal <= 0) {
            return NextResponse.json({ success: false, error: 'Discount value must be greater than 0' }, { status: 400 });
        }
        if (cleanType === 'percentage' && cleanVal > 100) {
            return NextResponse.json({ success: false, error: 'Percentage discount cannot exceed 100%' }, { status: 400 });
        }

        const user = await User.findById(userId);
        if (!user) {
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
        }

        const existingCoupons = Array.isArray(user.customCoupons) ? user.customCoupons : [];
        const isDuplicate = existingCoupons.some(c =>
            String(c.couponCode).trim().toUpperCase() === cleanCode && !c.isUsed
        );
        if (isDuplicate) {
            return NextResponse.json({
                success: false,
                error: `Active coupon "${cleanCode}" is already assigned to this customer.`
            }, { status: 400 });
        }

        const newCoupon = {
            couponCode: cleanCode,
            couponType: cleanTarget, // 'delivery' or 'items'
            discountType: cleanType, // 'percentage' or 'flat'
            discountValue: cleanVal,
            restId: targetRestId,
            restaurantName: targetRestName,
            isUsed: false,
            usedAt: null,
            usedOrderId: null,
            createdAt: new Date()
        };

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $push: { customCoupons: newCoupon } },
            { new: true }
        );

        return NextResponse.json({
            success: true,
            message: `Coupon ${cleanCode} (${targetRestName}) added successfully for ${user.name || 'customer'}!`,
            coupons: updatedUser.customCoupons || []
        });
    } catch (error) {
        console.error('Error adding customer coupon:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// DELETE /api/customer-coupons
export async function DELETE(request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const couponCode = searchParams.get('couponCode');

        if (!userId || !couponCode) {
            return NextResponse.json({ success: false, error: 'userId and couponCode are required' }, { status: 400 });
        }

        const cleanCode = String(couponCode).trim().toUpperCase();

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $pull: { customCoupons: { couponCode: cleanCode, isUsed: false } } },
            { new: true }
        );

        return NextResponse.json({
            success: true,
            message: `Coupon ${cleanCode} deleted successfully`,
            coupons: updatedUser?.customCoupons || []
        });
    } catch (error) {
        console.error('Error deleting customer coupon:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
