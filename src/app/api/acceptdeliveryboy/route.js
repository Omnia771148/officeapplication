import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongoose';
import DeliveryBoyNewAdd from '../../../../models/DeliveryBoyNewAdd';
import DeliveryBoyUser from '../../../../models/DeliveryBoyUser';

export async function POST(request) {
    try {
        const { id } = await request.json();
        await dbConnect();

        // 1. Find the delivery boy in the temporary collection
        let boyData = await DeliveryBoyNewAdd.findById(id).lean();
        if (!boyData) {
            try {
                const { ObjectId } = require('mongodb');
                boyData = await DeliveryBoyNewAdd.collection.findOne({ _id: new ObjectId(id) });
            } catch (e) {}
        }

        if (!boyData) {
            return NextResponse.json({ error: 'Delivery boy not found' }, { status: 404 });
        }

        // 2. Create a new entry in the permanent collection
        const { _id, __v, ...restData } = boyData;

        const docToInsert = {
            ...restData,
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
            isActive: boyData.isActive !== undefined ? boyData.isActive : true,
            isBlocked: boyData.isBlocked !== undefined ? boyData.isBlocked : false,
            profilePicUrl: boyData.profilePicUrl || '',
            photoUrl: boyData.photoUrl || '',
            termsAndConditionsAccepted: boyData.termsAndConditionsAccepted !== undefined ? boyData.termsAndConditionsAccepted : true,
            termsAndConditionsAcceptedAt: boyData.termsAndConditionsAcceptedAt ? new Date(boyData.termsAndConditionsAcceptedAt) : new Date(),
            termsAndConditionsVersion: boyData.termsAndConditionsVersion || '1.0',
            createdAt: boyData.createdAt ? new Date(boyData.createdAt) : new Date(),
            updatedAt: new Date()
        };

        // Insert directly into the deliveryboyusers collection to guarantee all fields are preserved
        await DeliveryBoyUser.collection.insertOne(docToInsert);

        // 3. Delete from the temporary collection
        await DeliveryBoyNewAdd.collection.deleteOne({ _id: boyData._id });

        return NextResponse.json({ message: 'Delivery boy accepted and moved successfully' }, { status: 200 });

    } catch (error) {
        console.error('Error accepting delivery boy:', error);
        return NextResponse.json({ error: 'Failed to accept delivery boy' }, { status: 500 });
    }
}
