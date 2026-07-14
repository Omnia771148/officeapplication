import mongoose from 'mongoose';

const CouponCodeSchema = new mongoose.Schema({
    influencerName: {
        type: String,
        required: true,
    },
    couponCode: {
        type: String,
        required: true,
        unique: true,
    },
    discountType: {
        type: String,
        enum: ['flat', 'percentage'],
        default: 'flat',
    },
    discountValue: {
        type: Number,
        default: 50,
    }
}, { timestamps: true });

export default mongoose.models.CouponCode || mongoose.model('CouponCode', CouponCodeSchema);

