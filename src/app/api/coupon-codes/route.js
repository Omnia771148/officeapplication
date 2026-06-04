import dbConnect from '../../../../lib/mongoose';
import CouponCode from '../../../../models/CouponCode';
import { NextResponse } from 'next/server';

export async function POST(req) {
    try {
        await dbConnect();
        
        const data = await req.json();
        const { influencerName, couponCode } = data;
        
        if (!influencerName || !couponCode) {
            return NextResponse.json({ success: false, message: 'All fields are required' }, { status: 400 });
        }
        
        // Check if coupon code already exists
        const existingCoupon = await CouponCode.findOne({ couponCode });
        if (existingCoupon) {
            return NextResponse.json({ success: false, message: 'Coupon code already exists' }, { status: 400 });
        }
        
        const newCoupon = new CouponCode({
            influencerName,
            couponCode
        });
        
        await newCoupon.save();
        
        return NextResponse.json({ success: true, data: newCoupon }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
