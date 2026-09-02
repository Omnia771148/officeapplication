import dbConnect from '../../../../lib/mongoose';
import CouponCode from '../../../../models/CouponCode';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        await dbConnect();
        const coupons = await CouponCode.find({}).sort({ createdAt: -1 }).lean();
        return NextResponse.json({ success: true, data: coupons });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        await dbConnect();
        
        const data = await req.json();
        const { influencerName, couponCode, discountType, discountValue } = data;
        
        if (!influencerName || !couponCode) {
            return NextResponse.json({ success: false, message: 'All fields are required' }, { status: 400 });
        }

        const normalizedCode = couponCode.trim().toUpperCase();
        
        // Check if coupon code already exists
        const existingCoupon = await CouponCode.findOne({ couponCode: normalizedCode });
        if (existingCoupon) {
            return NextResponse.json({ success: false, message: 'Coupon code already exists' }, { status: 400 });
        }
        
        const newCoupon = new CouponCode({
            influencerName: influencerName.trim(),
            couponCode: normalizedCode,
            discountType: discountType || 'flat',
            discountValue: discountValue !== undefined ? Number(discountValue) : 50
        });
        
        await newCoupon.save();
        
        return NextResponse.json({ success: true, data: newCoupon }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) {
            return NextResponse.json({ success: false, message: 'Coupon ID is required' }, { status: 400 });
        }
        await CouponCode.findByIdAndDelete(id);
        return NextResponse.json({ success: true, message: 'Coupon deleted successfully' });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
