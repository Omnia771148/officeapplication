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
    }
}, { timestamps: true });

export default mongoose.models.CouponCode || mongoose.model('CouponCode', CouponCodeSchema);
