import mongoose from 'mongoose';

const CategorySchema = new mongoose.Schema({
    restaurantId: {
        type: String,
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

// Compound index to guarantee uniqueness of category name per restaurant
CategorySchema.index({ restaurantId: 1, name: 1 }, { unique: true });

export default mongoose.models.Category || mongoose.model('Category', CategorySchema);
