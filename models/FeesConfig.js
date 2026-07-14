import mongoose from 'mongoose';

const FeesConfigSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true, default: 'global' },
    deliveryFeeBase: { type: Number, required: true, default: 20 },
    deliveryFeePerKm: { type: Number, required: true, default: 10 },
    surgeFee: { type: Number, required: true, default: 0 },
    isSurgeActive: { type: Boolean, required: true, default: false },
}, { timestamps: true, collection: 'feesconfigs' });

export default mongoose.models.FeesConfig || mongoose.model('FeesConfig', FeesConfigSchema);
