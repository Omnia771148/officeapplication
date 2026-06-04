import mongoose from 'mongoose';

const FinalCompletedOrderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        required: true,
    },
    // We allow other fields to be present and saved/retrieved
}, { strict: false, collection: 'finalcompletedorders' });

export default mongoose.models.FinalCompletedOrder || mongoose.model('FinalCompletedOrder', FinalCompletedOrderSchema);
