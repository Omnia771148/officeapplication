import mongoose from 'mongoose';

const OrderStatusSchema = new mongoose.Schema({
    // We allow arbitrary fields since the schema is not fully defined
}, { strict: false, timestamps: true });

export default mongoose.models.OrderStatus || mongoose.model('OrderStatus', OrderStatusSchema);
