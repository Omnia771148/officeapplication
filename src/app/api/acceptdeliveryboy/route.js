import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongoose';
import DeliveryBoyNewAdd from '../../../../models/DeliveryBoyNewAdd';
import DeliveryBoyUser from '../../../../models/DeliveryBoyUser';

export async function POST(request) {
    try {
        const { id } = await request.json();
        await dbConnect();

        // 1. Find the delivery boy in the temporary collection
        const boyData = await DeliveryBoyNewAdd.findById(id);

        if (!boyData) {
            return NextResponse.json({ error: 'Delivery boy not found' }, { status: 404 });
        }

        // 2. Create a new entry in the permanent collection
        // We explicitly map fields to avoid copying internal mongoose properties like _id (unless we want to keep the same _id)
        // Generally creating a new document with a new _id is safer to avoid collisions if not intended, 
        // but often keeping the same _id is useful. The prompt implies just "moving data".
        // I will let Mongoose generate a new _id for the new collection unless there is a reason to keep it.
        // However, if they have auth linked to _id, we might want to be careful. 
        // Given 'firebaseUid' is present, that's likely the auth anchor.

        const newDeliveryBoy = new DeliveryBoyUser({
            name: boyData.name,
            email: boyData.email,
            password: boyData.password,
            phone: boyData.phone,
            firebaseUid: boyData.firebaseUid,
            aadharUrl: boyData.aadharUrl,
            aadharNumber: boyData.aadharNumber,
            rcUrl: boyData.rcUrl,
            rcNumber: boyData.rcNumber,
            licenseUrl: boyData.licenseUrl,
            licenseNumber: boyData.licenseNumber,
            accountNumber: boyData.accountNumber,
            ifscCode: boyData.ifscCode,
            isActive: boyData.isActive,
        });

        await newDeliveryBoy.save();

        // 3. Delete from the temporary collection
        await DeliveryBoyNewAdd.findByIdAndDelete(id);

        return NextResponse.json({ message: 'Delivery boy accepted and moved successfully' }, { status: 200 });

    } catch (error) {
        console.error('Error accepting delivery boy:', error);
        return NextResponse.json({ error: 'Failed to accept delivery boy' }, { status: 500 });
    }
}
