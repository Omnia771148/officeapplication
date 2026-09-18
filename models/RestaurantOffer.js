import mongoose from 'mongoose';

const RestaurantOfferSchema = new mongoose.Schema(
  {
    restId: {
      type: String,
      required: true,
      index: true,
    },
    // 1+1 Offers (Supports Category-Wise and Item-Wise)
    bogoOffers: [
      {
        type: { type: String, enum: ['category', 'item'], default: 'category' },
        sourceItemId: { type: String, default: '' },
        sourceItemName: { type: String, default: '' },
        targetItemId: { type: String, default: '' },
        targetItemName: { type: String, default: '' },
        sourceCategory: { type: String, default: '' },
        targetCategory: { type: String, default: '' },
        offerTitle: { type: String, default: '1+1 Offer' },
        isActive: { type: Boolean, default: true },
      },
    ],
    // Category-level % Discounts
    categoryDiscounts: [
      {
        category: { type: String, required: true },
        discountPercentage: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
      },
    ],
    // Tiered Restaurant Bill Discounts (Percentage or Flat Amount in Money)
    tieredDiscounts: [
      {
        minBillAmount: { type: Number, required: true, min: 0 },
        discountType: { type: String, default: 'percentage' },
        discountPercentage: { type: Number, default: 0 },
        discountAmount: { type: Number, default: 0 },
        label: { type: String, default: '' },
        isActive: { type: Boolean, default: true },
      },
    ],
  },
  { timestamps: true, strict: false }
);

if (mongoose.models && mongoose.models.RestaurantOffer) {
  delete mongoose.models.RestaurantOffer;
}

export default mongoose.models.RestaurantOffer ||
  mongoose.model('RestaurantOffer', RestaurantOfferSchema);
