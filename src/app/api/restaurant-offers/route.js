import dbConnect from '../../../../lib/mongoose';
import RestaurantOffer from '../../../../models/RestaurantOffer';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');

    if (!restaurantId) {
      return NextResponse.json({ success: false, error: 'Restaurant ID is required' }, { status: 400 });
    }

    let offer = await mongoose.connection.db.collection('restaurantoffers').findOne({
      $or: [{ restId: String(restaurantId) }, { restId: Number(restaurantId) }]
    });

    if (!offer) {
      offer = {
        restId: restaurantId,
        bogoOffers: [],
        categoryDiscounts: [],
        tieredDiscounts: []
      };
    }

    return NextResponse.json({ success: true, data: offer });
  } catch (error) {
    console.error('Error fetching restaurant offers:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { restaurantId, bogoOffers, categoryDiscounts, tieredDiscounts } = body;

    if (!restaurantId) {
      return NextResponse.json({ success: false, error: 'Restaurant ID is required' }, { status: 400 });
    }

    const sanitizedTiers = (tieredDiscounts || []).map((t) => ({
      minBillAmount: Number(t.minBillAmount || 0),
      discountType: t.discountType === 'flat' ? 'flat' : 'percentage',
      discountPercentage: Number(t.discountPercentage || 0),
      discountAmount: Number(t.discountAmount || 0),
      label: String(t.label || ''),
      isActive: t.isActive !== false
    }));

    const updateDoc = {
      $set: {
        restId: String(restaurantId),
        bogoOffers: bogoOffers || [],
        categoryDiscounts: categoryDiscounts || [],
        tieredDiscounts: sanitizedTiers,
        updatedAt: new Date()
      },
      $setOnInsert: {
        createdAt: new Date()
      }
    };

    const result = await mongoose.connection.db.collection('restaurantoffers').findOneAndUpdate(
      { $or: [{ restId: String(restaurantId) }, { restId: Number(restaurantId) }] },
      updateDoc,
      { upsert: true, returnDocument: 'after' }
    );

    const resultData = result.value || result;
    return NextResponse.json({ success: true, data: resultData });
  } catch (error) {
    console.error('Error saving restaurant offers:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
