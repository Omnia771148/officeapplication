import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    createdAt: Date,
    blickstatus: { type: Boolean, default: true }
}, { strict: false, collection: 'users' });

export default mongoose.models.User || mongoose.model('User', UserSchema);
