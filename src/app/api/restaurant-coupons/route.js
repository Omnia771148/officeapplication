import dbConnect from '../../../../lib/mongoose';
import RestuarentUser from '../../../../models/RestuarentUser';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';

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

// GET: Fetch all restaurants and their coupons
export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const filterRestaurantId = searchParams.get('restaurantId') || searchParams.get('restId');

    const collection = mongoose.connection.db.collection('restuarentusers');

    // Fetch all restaurants for dropdown
    const allRestaurants = await collection
      .find({}, { projection: { _id: 1, restId: 1, name: 1, restLocation: 1, coupons: 1 } })
      .sort({ name: 1 })
      .toArray();

    const restaurantList = allRestaurants.map((r) => ({
      _id: r._id.toString(),
      restId: r.restId || r._id.toString(),
      name: r.name || `Restaurant ${r.restId || ''}`,
      restLocation: r.restLocation || ''
    }));

    // Build coupon list
    let allCoupons = [];
    allRestaurants.forEach((r) => {
      if (Array.isArray(r.coupons)) {
        r.coupons.forEach((c) => {
          allCoupons.push({
            _id: c._id ? c._id.toString() : `${r._id}_${c.couponCode}`,
            couponCode: c.couponCode,
            offerType: c.offerType || 'percentage',
            offerValue: Number(c.offerValue) || 0,
            createdAt: c.createdAt || new Date(),
            restaurantId: r._id.toString(),
            restId: r.restId || r._id.toString(),
            restaurantName: r.name || `Restaurant ${r.restId || ''}`,
            restLocation: r.restLocation || ''
          });
        });
      }
    });

    // Filter if requested for a specific restaurant
    if (filterRestaurantId) {
      allCoupons = allCoupons.filter(
        (c) => c.restaurantId === filterRestaurantId || c.restId === String(filterRestaurantId)
      );
    }

    // Sort newest coupons first
    allCoupons.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return NextResponse.json({
      success: true,
      restaurants: restaurantList,
      coupons: allCoupons
    });
  } catch (error) {
    console.error('Error in GET /api/restaurant-coupons:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Add new coupon to selected restaurant in restuarentusers collection
export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { restaurantId, couponCode, offerType, offerValue } = body;

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, message: 'Please select a restaurant' },
        { status: 400 }
      );
    }

    if (!couponCode || !couponCode.trim()) {
      return NextResponse.json(
        { success: false, message: 'Coupon code is required' },
        { status: 400 }
      );
    }

    const normalizedCode = couponCode.trim().toUpperCase();

    if (!offerType || !['percentage', 'money'].includes(offerType)) {
      return NextResponse.json(
        { success: false, message: 'Offer type must be Percentage (%) or Flat Money (₹)' },
        { status: 400 }
      );
    }

    const numValue = Number(offerValue);
    if (isNaN(numValue) || numValue <= 0) {
      return NextResponse.json(
        { success: false, message: 'Please enter a valid positive offer value' },
        { status: 400 }
      );
    }

    if (offerType === 'percentage' && numValue > 100) {
      return NextResponse.json(
        { success: false, message: 'Percentage discount cannot exceed 100%' },
        { status: 400 }
      );
    }

    const collection = mongoose.connection.db.collection('restuarentusers');
    const query = getRestaurantQuery(restaurantId);

    const restaurant = await collection.findOne(query);
    if (!restaurant) {
      return NextResponse.json(
        { success: false, message: 'Selected restaurant was not found' },
        { status: 404 }
      );
    }

    // Check if this coupon code already exists for this restaurant
    const existingCoupons = Array.isArray(restaurant.coupons) ? restaurant.coupons : [];
    const duplicate = existingCoupons.find(
      (c) => (c.couponCode || '').toUpperCase() === normalizedCode
    );

    if (duplicate) {
      return NextResponse.json(
        { success: false, message: `Coupon code "${normalizedCode}" already exists for ${restaurant.name || 'this restaurant'}` },
        { status: 400 }
      );
    }

    const newCoupon = {
      _id: new mongoose.Types.ObjectId(),
      couponCode: normalizedCode,
      offerType,
      offerValue: numValue,
      createdAt: new Date()
    };

    const updateResult = await collection.updateOne(
      { _id: restaurant._id },
      { $push: { coupons: newCoupon } }
    );

    if (updateResult.matchedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Failed to update restaurant coupons' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Coupon "${normalizedCode}" added successfully to ${restaurant.name || 'restaurant'}!`,
      coupon: {
        ...newCoupon,
        _id: newCoupon._id.toString(),
        restaurantId: restaurant._id.toString(),
        restId: restaurant.restId,
        restaurantName: restaurant.name || ''
      }
    });
  } catch (error) {
    console.error('Error in POST /api/restaurant-coupons:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Remove a specific coupon from selected restaurant
export async function DELETE(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    let restaurantId = searchParams.get('restaurantId') || searchParams.get('restId');
    let couponId = searchParams.get('couponId');
    let couponCode = searchParams.get('couponCode');

    // If query params are empty, try reading request body
    if (!restaurantId || (!couponId && !couponCode)) {
      try {
        const body = await request.json();
        restaurantId = restaurantId || body.restaurantId || body.restId;
        couponId = couponId || body.couponId;
        couponCode = couponCode || body.couponCode;
      } catch (e) {
        // Body might not be provided or already parsed
      }
    }

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, message: 'Restaurant ID is required to delete coupon' },
        { status: 400 }
      );
    }

    if (!couponId && !couponCode) {
      return NextResponse.json(
        { success: false, message: 'Coupon ID or Coupon Code is required' },
        { status: 400 }
      );
    }

    const collection = mongoose.connection.db.collection('restuarentusers');
    const query = getRestaurantQuery(restaurantId);

    const restaurant = await collection.findOne(query);
    if (!restaurant) {
      return NextResponse.json(
        { success: false, message: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // Build pull condition
    let pullCondition = {};
    if (couponId && mongoose.Types.ObjectId.isValid(couponId)) {
      pullCondition = {
        $or: [
          { _id: new mongoose.Types.ObjectId(couponId) },
          { _id: String(couponId) }
        ]
      };
    } else if (couponCode) {
      pullCondition = { couponCode: couponCode.trim().toUpperCase() };
    } else {
      pullCondition = { couponCode: String(couponId).trim().toUpperCase() };
    }

    const updateResult = await collection.updateOne(
      { _id: restaurant._id },
      { $pull: { coupons: pullCondition } }
    );

    if (updateResult.modifiedCount === 0) {
      // Fallback: in case _id was stored as string or mismatch, pull by couponCode if available
      if (couponCode) {
        await collection.updateOne(
          { _id: restaurant._id },
          { $pull: { coupons: { couponCode: couponCode.trim().toUpperCase() } } }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Coupon deleted successfully'
    });
  } catch (error) {
    console.error('Error in DELETE /api/restaurant-coupons:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
