import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    createdAt: Date,
    blickstatus: { type: Boolean, default: true },
    blockStatus: { type: Boolean, default: false },
    inconvinience: { type: Number, default: 0 },
    coins: { type: Number, default: 0 }
}, { strict: false, collection: 'users' });

export default mongoose.models.User || mongoose.model('User', UserSchema);
