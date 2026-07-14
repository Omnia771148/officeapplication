import mongoose from 'mongoose';

const FeesConfigSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true, default: 'global' },
    deliveryFeeBase: { type: Number, required: true, default: 20 },
    deliveryFeePerKm: { type: Number, required: true, default: 10 },
    surgeFee: { type: Number, required: true, default: 0 },
    isSurgeActive: { type: Boolean, required: true, default: false },
    isCoinsActive: { type: Boolean, required: true, default: true },
    coinMinOrderAmount: { type: Number, required: true, default: 200 },
    coinBaseAmount: { type: Number, required: true, default: 10 },
    coinStepAmount: { type: Number, required: true, default: 100 },
    coinStepValue: { type: Number, required: true, default: 5 },
    coinMaxLimit: { type: Number, required: true, default: 100 },
    coinMaxThreshold: { type: Number, required: true, default: 1000 },
}, { timestamps: true, collection: 'feesconfigs' });

export default mongoose.models.FeesConfig || mongoose.model('FeesConfig', FeesConfigSchema);
