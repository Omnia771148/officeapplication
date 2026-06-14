import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    createdAt: Date,
    blickstatus: { type: Boolean, default: true },
    blockStatus: { type: Boolean, default: false },
    inconvinience: { type: Number, default: 0 },
    coins: { type: Number, default: 0 },
    transactionofcoins: {
        type: [
            {
                transactionId: String,
                noofcoins: Number,
                createdAt: { type: Date, default: Date.now }
            }
        ],
        default: []
    }
}, { strict: false, collection: 'users' });

export default mongoose.models.User || mongoose.model('User', UserSchema);
