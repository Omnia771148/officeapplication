import dbConnect from '../../../../lib/mongoose';
import AdminFCMToken from '../../../../models/AdminFCMToken';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        await dbConnect();
        const { token } = await request.json();

        if (!token) {
            return NextResponse.json({ success: false, error: 'Token is required' }, { status: 400 });
        }

        // Upsert the token
        await AdminFCMToken.findOneAndUpdate(
            { token },
            { token },
            { upsert: true, new: true }
        );

        return NextResponse.json({ success: true, message: 'FCM Token registered successfully' });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
