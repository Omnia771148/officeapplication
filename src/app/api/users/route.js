import dbConnect from '../../../../lib/mongoose';
import User from '../../../../models/User';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        await dbConnect();
        const users = await User.find({});
        return NextResponse.json({ success: true, data: users });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function PATCH(request) {
    try {
        await dbConnect();
        const { userId, blickstatus } = await request.json();
        
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { blickstatus: blickstatus },
            { new: true }
        );

        if (!updatedUser) {
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: updatedUser });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
