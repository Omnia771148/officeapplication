import mongoose from 'mongoose';

const AcceptedOrderSchema = new mongoose.Schema({
    restaurantId: {
        type: String,
        required: true,
    },
    // We allow other fields to be present and saved/retrieved
}, { strict: false, collection: 'acceptedorders' });

export default mongoose.models.AcceptedOrder || mongoose.model('AcceptedOrder', AcceptedOrderSchema);
