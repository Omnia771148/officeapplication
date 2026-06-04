import mongoose from 'mongoose';

const AcceptedByRestaurantSchema = new mongoose.Schema({
    orderId: {
        type: String,
        required: true,
    },
    // We allow other fields to be present and saved/retrieved
}, { strict: false, collection: 'acceptedbyrestorents' });

export default mongoose.models.AcceptedByRestaurant || mongoose.model('AcceptedByRestaurant', AcceptedByRestaurantSchema);
