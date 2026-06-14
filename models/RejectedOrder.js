import mongoose from 'mongoose';

const RejectedOrderSchema = new mongoose.Schema({
    restaurantId: {
        type: String,
        required: true,
    },
}, { strict: false, collection: 'rejectedorders' });

export default mongoose.models.RejectedOrder || mongoose.model('RejectedOrder', RejectedOrderSchema);
