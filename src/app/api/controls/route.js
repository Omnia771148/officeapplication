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
    { key: 'confirmPayButton', name: 'Confirm Pay Button', status: true, title: '', description: '' },
    { key: 'maintenanceMode', name: 'Maintenance Mode', status: false, title: '', description: '' },
    { key: 'homeHangingBanner', name: 'Home Hanging Banner', status: false, title: 'Special Announcement 🎉', description: 'Check out our latest restaurant offers and food deals!' }
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
                    title: item.title || '',
                    description: item.description || '',
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
        const { key, status, name, title, description } = body;

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
                title: title !== undefined ? String(title).trim() : '',
                description: description !== undefined ? String(description).trim() : '',
                history: []
            });
        }

        const now = new Date();
        const istFormatted = getISTTimeString(now);

        control.status = Boolean(status);
        if (title !== undefined) {
            control.title = String(title).trim();
        }
        if (description !== undefined) {
            control.description = String(description).trim();
        }

        control.history.push({
            status: Boolean(status),
            name: String(name).trim(),
            title: title !== undefined ? String(title).trim() : (control.title || ''),
            description: description !== undefined ? String(description).trim() : (control.description || ''),
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
