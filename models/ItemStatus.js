import mongoose from 'mongoose';

const ItemStatusSchema = new mongoose.Schema({
    itemName: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    restaurantId: {
        type: String,
        required: true
    },
    itemStatus: {
        type: Boolean,
        default: true
    },
    itemtodisplayintherestuarentapp: {
        type: Boolean,
        default: true
    }
}, { 
    collection: 'itemstatus',
    timestamps: true 
});

export default mongoose.models.ItemStatus || mongoose.model('ItemStatus', ItemStatusSchema);
