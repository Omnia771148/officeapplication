import mongoose from 'mongoose';

const AdminFCMTokenSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
        unique: true
    }
}, { timestamps: true });

export default mongoose.models.AdminFCMToken || mongoose.model('AdminFCMToken', AdminFCMTokenSchema);
