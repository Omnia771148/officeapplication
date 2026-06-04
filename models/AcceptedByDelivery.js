import mongoose from 'mongoose';

const AcceptedByDeliverySchema = new mongoose.Schema({
    orderId: {
        type: String,
        required: true,
    },
    // We allow other fields to be present and saved/retrieved
}, { strict: false, collection: 'acceptedbydeliveries', timestamps: true });

export default mongoose.models.AcceptedByDelivery || mongoose.model('AcceptedByDelivery', AcceptedByDeliverySchema);
