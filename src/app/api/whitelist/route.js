import dbConnect from '../../../../lib/mongoose';
import User from '../../../../models/User';
import Controls from '../../../../models/Controls';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        await dbConnect();
        const whitelistedUsers = await User.find({ isWhitelisted: true })
            .sort({ createdAt: -1 })
            .lean();
        return NextResponse.json({ success: true, count: whitelistedUsers.length, data: whitelistedUsers });
    } catch (error) {
        console.error('[API Whitelist GET] Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        await dbConnect();
        const body = await request.json();
        const { phone, password } = body;

        const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);
        const trimmedPassword = String(password || '').trim();

        if (!cleanPhone || cleanPhone.length !== 10) {
            return NextResponse.json(
                { success: false, message: 'Please enter a valid 10-digit phone number.' },
                { status: 400 }
            );
        }

        if (!trimmedPassword) {
            return NextResponse.json(
                { success: false, message: 'Password is required.' },
                { status: 400 }
            );
        }

        // Search if user already exists
        let user = await User.findOne({
            $or: [
                { phone: cleanPhone },
                { phone: `+91${cleanPhone}` },
                { phone: { $regex: cleanPhone } }
            ]
        });

        if (user) {
            user.password = trimmedPassword;
            user.isWhitelisted = true;
            user.blickstatus = true;
            user.blockStatus = false;
            user.isBlocked = false;
            user.status = 'active';
            user.isPhoneVerified = true;
            user.termsAccepted = true;
            if (!user.name || user.name.trim() === '') {
                user.name = `Whitelisted User (${cleanPhone})`;
            }
            await user.save();
        } else {
            user = new User({
                phone: cleanPhone,
                password: trimmedPassword,
                name: `Whitelisted User (${cleanPhone})`,
                email: `${cleanPhone}@whitelisted.app`,
                isWhitelisted: true,
                blickstatus: true,
                blockStatus: false,
                isBlocked: false,
                status: 'active',
                isPhoneVerified: true,
                termsAccepted: true,
                termsAcceptedAt: new Date().toISOString(),
                coins: 0,
                createdAt: new Date()
            });
            await user.save();
        }

        // Also ensure phone is in controls whitelisted collection for quick cross-system checks
        try {
            await Controls.findOneAndUpdate(
                { key: 'whitelistedPhones' },
                {
                    $addToSet: { phones: cleanPhone },
                    $set: { name: 'Whitelisted Phone Numbers', status: true }
                },
                { upsert: true }
            );
        } catch (ctrlErr) {
            console.warn('[API Whitelist] Controls sync warning:', ctrlErr.message);
        }

        const safeUser = user.toObject ? user.toObject() : user;
        return NextResponse.json({
            success: true,
            message: `Phone ${cleanPhone} successfully whitelisted with unrestricted customer app access!`,
            data: safeUser
        });
    } catch (error) {
        console.error('[API Whitelist POST] Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const phone = searchParams.get('phone');

        let query = null;
        if (userId) {
            query = { _id: userId };
        } else if (phone) {
            const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
            query = {
                $or: [
                    { phone: cleanPhone },
                    { phone: `+91${cleanPhone}` },
                    { phone: { $regex: cleanPhone } }
                ]
            };
        }

        if (!query) {
            return NextResponse.json(
                { success: false, message: 'User ID or phone number is required to remove whitelist.' },
                { status: 400 }
            );
        }

        const user = await User.findOne(query);
        if (!user) {
            return NextResponse.json({ success: false, message: 'User not found.' }, { status: 404 });
        }

        user.isWhitelisted = false;
        await user.save();

        const cleanPhone = String(user.phone || '').replace(/\D/g, '').slice(-10);
        if (cleanPhone) {
            try {
                await Controls.findOneAndUpdate(
                    { key: 'whitelistedPhones' },
                    { $pull: { phones: cleanPhone } }
                );
            } catch (e) {}
        }

        return NextResponse.json({
            success: true,
            message: `Whitelist access removed for ${user.phone || 'user'}.`,
            data: user
        });
    } catch (error) {
        console.error('[API Whitelist DELETE] Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
