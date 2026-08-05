import dbConnect from '../../../../lib/mongoose';
import Controls from '../../../../models/Controls';
import { NextResponse } from 'next/server';

function getISTTimeString(date = new Date()) {
    return date.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    }) + ' IST';
}

const DEFAULT_CONTROLS = [
    { key: 'confirmPayButton', name: 'Confirm Pay Button', status: true },
    { key: 'maintenanceMode', name: 'Maintenance Mode', status: false }
];

export async function GET() {
    try {
        await dbConnect();

        // Ensure default records exist in controls collection
        for (const item of DEFAULT_CONTROLS) {
            const existing = await Controls.findOne({ key: item.key });
            if (!existing) {
                await Controls.create({
                    key: item.key,
                    name: item.name,
                    status: item.status,
                    history: []
                });
            }
        }

        const allControls = await Controls.find({}).sort({ createdAt: 1 });
        return NextResponse.json({
            success: true,
            controls: allControls
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        await dbConnect();
        const body = await request.json();
        const { key, status, name } = body;

        if (!key || status === undefined || !name) {
            return NextResponse.json(
                { success: false, error: 'key, status, and name are required' },
                { status: 400 }
            );
        }

        let control = await Controls.findOne({ key });
        if (!control) {
            const defaultMatch = DEFAULT_CONTROLS.find(c => c.key === key);
            control = new Controls({
                key,
                name: defaultMatch ? defaultMatch.name : key,
                status: Boolean(status),
                history: []
            });
        }

        const now = new Date();
        const istFormatted = getISTTimeString(now);

        control.status = Boolean(status);
        control.history.push({
            status: Boolean(status),
            name: String(name).trim(),
            date: istFormatted,
            istTime: istFormatted,
            timestamp: now.getTime()
        });

        await control.save();

        const allControls = await Controls.find({}).sort({ createdAt: 1 });
        return NextResponse.json({
            success: true,
            controls: allControls
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
