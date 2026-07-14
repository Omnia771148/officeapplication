import dbConnect from '../../../../lib/mongoose';
import FeesConfig from '../../../../models/FeesConfig';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        await dbConnect();
        let config = await FeesConfig.findOne({ key: 'global' });
        if (!config) {
            config = await FeesConfig.create({
                key: 'global',
                deliveryFeeBase: 20,
                deliveryFeePerKm: 10,
                surgeFee: 0,
                isSurgeActive: false,
                isCoinsActive: true,
                coinMinOrderAmount: 200,
                coinBaseAmount: 10,
                coinStepAmount: 100,
                coinStepValue: 5,
                coinMaxLimit: 100,
                coinMaxThreshold: 1000
            });
        }
        return NextResponse.json({ success: true, data: config });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        await dbConnect();
        const body = await request.json();
        const { 
            deliveryFeeBase, 
            deliveryFeePerKm, 
            surgeFee, 
            isSurgeActive,
            isCoinsActive,
            coinMinOrderAmount,
            coinBaseAmount,
            coinStepAmount,
            coinStepValue,
            coinMaxLimit,
            coinMaxThreshold
        } = body;

        let config = await FeesConfig.findOne({ key: 'global' });
        if (!config) {
            config = new FeesConfig({ key: 'global' });
        }

        if (deliveryFeeBase !== undefined) config.deliveryFeeBase = Number(deliveryFeeBase);
        if (deliveryFeePerKm !== undefined) config.deliveryFeePerKm = Number(deliveryFeePerKm);
        if (surgeFee !== undefined) config.surgeFee = Number(surgeFee);
        if (isSurgeActive !== undefined) config.isSurgeActive = Boolean(isSurgeActive);
        if (isCoinsActive !== undefined) config.isCoinsActive = Boolean(isCoinsActive);
        if (coinMinOrderAmount !== undefined) config.coinMinOrderAmount = Number(coinMinOrderAmount);
        if (coinBaseAmount !== undefined) config.coinBaseAmount = Number(coinBaseAmount);
        if (coinStepAmount !== undefined) config.coinStepAmount = Number(coinStepAmount);
        if (coinStepValue !== undefined) config.coinStepValue = Number(coinStepValue);
        if (coinMaxLimit !== undefined) config.coinMaxLimit = Number(coinMaxLimit);
        if (coinMaxThreshold !== undefined) config.coinMaxThreshold = Number(coinMaxThreshold);

        await config.save();
        return NextResponse.json({ success: true, data: config });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
