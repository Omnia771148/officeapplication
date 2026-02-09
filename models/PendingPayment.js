import mongoose from 'mongoose';

const PendingPaymentSchema = new mongoose.Schema({
    restaurantId: {
        type: String,
        required: true,
    },
    grandTotal: {
        type: Number,
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    restaurantName: {
        type: String,
        required: true,
    },
}, { strict: false });

export default mongoose.models.PendingPayment || mongoose.model('PendingPayment', PendingPaymentSchema);
