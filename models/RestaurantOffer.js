import mongoose from 'mongoose';

const RestaurantOfferSchema = new mongoose.Schema(
  {
    restId: {
      type: String,
      required: true,
      index: true,
    },
    bogoOffers: [
      {
        sourceCategory: { type: String, required: true },
        targetCategory: { type: String, required: true },
        offerTitle: { type: String, default: '1+1 Offer' },
        isActive: { type: Boolean, default: true },
      },
    ],
    categoryDiscounts: [
      {
        category: { type: String, required: true },
        discountPercentage: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
      },
    ],
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