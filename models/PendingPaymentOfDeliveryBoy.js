import mongoose from 'mongoose';

const PendingPaymentOfDeliveryBoySchema = new mongoose.Schema({
    deliveryBoyId: { type: String, required: true },
    deliveryBoyName: { type: String, required: true },
    deliveryBoyPhone: { type: String, required: true },
    deliveryCharge: { type: Number, default: 0 },
    deliverycharges: { type: Number, default: 0 },
    accountNumber: { type: String },
    ifscCode: { type: String },
    transactions: [{
        transactionId: String,
        amountPaid: Number,
        date: { type: Date, default: Date.now }
    }]
}, { timestamps: true, collection: 'pendingpaymentsofdeliveryboy', strict: false });

export default mongoose.models.PendingPaymentOfDeliveryBoy || mongoose.model('PendingPaymentOfDeliveryBoy', PendingPaymentOfDeliveryBoySchema);
