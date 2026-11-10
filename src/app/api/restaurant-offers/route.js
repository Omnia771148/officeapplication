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
      const restUser = await mongoose.connection.db.collection('restuarentusers').findOne({
        $or: [{ restId: String(restaurantId) }, { restId: Number(restaurantId) }]
      });
      offer = {
        restId: restaurantId,
        bogoOffers: [],
        categoryDiscounts: [],
        tieredDiscounts: [],
        freeItemOffers: restUser?.freeItemOffers || []
      };
    } else {
      if (!Array.isArray(offer.freeItemOffers)) {
        const restUser = await mongoose.connection.db.collection('restuarentusers').findOne({
          $or: [{ restId: String(restaurantId) }, { restId: Number(restaurantId) }]
        });
        offer.freeItemOffers = restUser?.freeItemOffers || [];
      }
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
    const { restaurantId, bogoOffers, categoryDiscounts, tieredDiscounts, freeItemOffers } = body;

    if (!restaurantId) {
      return NextResponse.json({ success: false, error: 'Restaurant ID is required' }, { status: 400 });
    }

    const setFields = {
      restId: String(restaurantId),
      updatedAt: new Date()
    };

    if (bogoOffers !== undefined) {
      setFields.bogoOffers = (bogoOffers || []).map((b) => ({
        type: b.type === 'item' ? 'item' : 'category',
        sourceItemId: String(b.sourceItemId || ''),
        sourceItemName: String(b.sourceItemName || ''),
        targetItemId: String(b.targetItemId || ''),
        targetItemName: String(b.targetItemName || ''),
        sourceCategory: String(b.sourceCategory || ''),
        targetCategory: String(b.targetCategory || ''),
        offerTitle: String(b.offerTitle || '1+1 Offer'),
        isActive: b.isActive !== false
      }));
    }

    if (categoryDiscounts !== undefined) {
      setFields.categoryDiscounts = categoryDiscounts || [];
    }

    if (tieredDiscounts !== undefined) {
      setFields.tieredDiscounts = (tieredDiscounts || []).map((t) => ({
        minBillAmount: Number(t.minBillAmount || 0),
        discountType: t.discountType === 'flat' ? 'flat' : 'percentage',
        discountPercentage: Number(t.discountPercentage || 0),
        discountAmount: Number(t.discountAmount || 0),
        label: String(t.label || ''),
        isActive: t.isActive !== false
      }));
    }

    if (freeItemOffers !== undefined) {
      setFields.freeItemOffers = (freeItemOffers || []).map((f, idx) => ({
        _id: f._id ? String(f._id) : `free_${Date.now()}_${idx}`,
        minOrderAmount: Number(f.minOrderAmount || 0),
        freeItemId: String(f.freeItemId || ''),
        freeItemName: String(f.freeItemName || ''),
        freeItemPrice: Number(f.freeItemPrice || 0),
        freeItemCategory: String(f.freeItemCategory || ''),
        offerTitle: String(f.offerTitle || (f.freeItemName ? `Free ${f.freeItemName} on orders ₹${f.minOrderAmount || 0}+` : 'Free Item Offer')),
        description: String(f.description || ''),
        isActive: f.isActive !== false,
        createdAt: f.createdAt ? new Date(f.createdAt) : new Date()
      }));
    }

    const updateDoc = {
      $set: setFields,
      $setOnInsert: {
        createdAt: new Date()
      }
    };

    const result = await mongoose.connection.db.collection('restaurantoffers').findOneAndUpdate(
      { $or: [{ restId: String(restaurantId) }, { restId: Number(restaurantId) }] },
      updateDoc,
      { upsert: true, returnDocument: 'after' }
    );

    // Also sync to restuarentusers collection if freeItemOffers was updated
    if (setFields.freeItemOffers !== undefined) {
      try {
        await mongoose.connection.db.collection('restuarentusers').updateOne(
          { $or: [{ restId: String(restaurantId) }, { restId: Number(restaurantId) }] },
          { $set: { freeItemOffers: setFields.freeItemOffers } }
        );
      } catch (userErr) {
        console.error('Error syncing freeItemOffers to restuarentusers:', userErr);
      }
    }

    const resultData = result.value || result;
    return NextResponse.json({ success: true, data: resultData });
  } catch (error) {
    console.error('Error saving restaurant offers:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
