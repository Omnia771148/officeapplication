import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema({
    restaurantId: {
        type: String,
        required: true,
    },
    // We allow other fields to be present and saved/retrieved
}, { strict: false, timestamps: true });

export default mongoose.models.Order || mongoose.model('Order', OrderSchema);
