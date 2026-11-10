import dbConnect from '../../../../lib/mongoose';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';

// Helper to query by restId or _id
function getRestaurantQuery(restaurantId) {
  if (!restaurantId) return null;
  const isObjectId = mongoose.Types.ObjectId.isValid(restaurantId);
  if (isObjectId) {
    return {
      $or: [
        { _id: new mongoose.Types.ObjectId(restaurantId) },
        { restId: String(restaurantId) }
      ]
    };
  }
  return { restId: String(restaurantId) };
}

// GET: Fetch restaurant offers or all restaurants list
export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const restId = searchParams.get('restId') || searchParams.get('restaurantId');

    const restUsersCol = mongoose.connection.db.collection('restuarentusers');
    const restOffersCol = mongoose.connection.db.collection('restaurantoffers');

    if (restId) {
      const q = getRestaurantQuery(restId);
      const [restUser, offerDoc] = await Promise.all([
        restUsersCol.findOne(q),
        restOffersCol.findOne({ $or: [{ restId: String(restId) }, { restId: Number(restId) }] })
      ]);

      const cartOffers = offerDoc?.cartOffers || restUser?.cartOffers || {
        itemDiscount: {
          enabled: false,
          tiers: [
            { itemCount: 1, discountPercentage: 10, enabled: true, couponCode: 'ITEM1' },
            { itemCount: 2, discountPercentage: 20, enabled: true, couponCode: 'ITEM2' }
          ]
        },
        deliveryDiscount: {
          enabled: false,
          discountType: 'flat', // 'flat' or 'percentage'
          discountValue: 20,
          couponCode: 'FREEDEL'
        }
      };

      return NextResponse.json({
        success: true,
        restId,
        restaurantName: restUser?.name || `Restaurant ${restId}`,
        cartOffers
      });
    }

    // If no restId, return list of all restaurants for selector
    const allRestaurants = await restUsersCol
      .find({}, { projection: { _id: 1, restId: 1, name: 1, restLocation: 1, cartOffers: 1 } })
      .sort({ name: 1 })
      .toArray();

    const list = allRestaurants.map((r) => ({
      _id: r._id.toString(),
      restId: r.restId || r._id.toString(),
      name: r.name || `Restaurant ${r.restId || ''}`,
      restLocation: r.restLocation || '',
      hasCartOffers: Boolean(r.cartOffers?.itemDiscount?.enabled || r.cartOffers?.deliveryDiscount?.enabled)
    }));

    return NextResponse.json({ success: true, restaurants: list });
  } catch (error) {
    console.error('Error in GET /api/restaurant-cart-offers:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Save cart offers for a specific restaurant
export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { restId, cartOffers } = body;

    if (!restId) {
      return NextResponse.json({ success: false, error: 'Restaurant ID (restId) is required' }, { status: 400 });
    }

    const restUsersCol = mongoose.connection.db.collection('restuarentusers');
    const restOffersCol = mongoose.connection.db.collection('restaurantoffers');

    const cleanCartOffers = {
      itemDiscount: {
        enabled: Boolean(cartOffers?.itemDiscount?.enabled),
        tiers: Array.isArray(cartOffers?.itemDiscount?.tiers)
          ? cartOffers.itemDiscount.tiers.map((t) => ({
              itemCount: Number(t.itemCount) || 1,
              discountPercentage: Number(t.discountPercentage) || 0,
              enabled: Boolean(t.enabled),
              couponCode: (t.couponCode || `DISC${t.discountPercentage || 0}`).trim().toUpperCase()
            }))
          : []
      },
      deliveryDiscount: {
        enabled: Boolean(cartOffers?.deliveryDiscount?.enabled),
        discountType: cartOffers?.deliveryDiscount?.discountType === 'percentage' ? 'percentage' : 'flat',
        discountValue: Number(cartOffers?.deliveryDiscount?.discountValue) || 0,
        couponCode: (cartOffers?.deliveryDiscount?.couponCode || 'DELIVDISC').trim().toUpperCase()
      },
      updatedAt: new Date()
    };

    // Update restaurantoffers collection
    await restOffersCol.updateOne(
      { $or: [{ restId: String(restId) }, { restId: Number(restId) }] },
      {
        $set: {
          restId: String(restId),
          cartOffers: cleanCartOffers,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );

    // Also update restuarentusers collection for quick retrieval
    const q = getRestaurantQuery(restId);
    if (q) {
      await restUsersCol.updateOne(q, {
        $set: {
          cartOffers: cleanCartOffers,
          updatedAt: new Date()
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Restaurant cart offers updated successfully!',
      cartOffers: cleanCartOffers
    });
  } catch (error) {
    console.error('Error in POST /api/restaurant-cart-offers:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

