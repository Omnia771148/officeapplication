import mongoose from 'mongoose';

const DeliveryBoyUserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
        required: true,
    },
    firebaseUid: {
        type: String,
        required: true,
    },
    aadharUrl: {
        type: String,
    },
    aadharNumber: {
        type: String,
    },
    rcUrl: {
        type: String,
    },
    rcNumber: {
        type: String,
    },
    licenseUrl: {
        type: String,
    },
    licenseNumber: {
        type: String,
    },
    accountNumber: {
        type: String,
    },
    ifscCode: {
        type: String,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true, collection: 'deliveryboyusers' });

export default mongoose.models.DeliveryBoyUser || mongoose.model('DeliveryBoyUser', DeliveryBoyUserSchema);
