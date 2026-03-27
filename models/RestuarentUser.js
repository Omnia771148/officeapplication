import mongoose from "mongoose";

const RegisterUserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },
    email: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },

    // NEW FIELDS 👇
    restId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    restLocation: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    fssai: {
      type: String,
      required: true,
    },
    openTime: {
      type: String, // format "HH:mm"
    },
    closeTime: {
      type: String, // format "HH:mm"
    },
    restaurantLocation: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    fcmToken: {
      type: String, // Store the FCM token for notifications (Web)
    },
    mobileFcmToken: {
      type: String, // Store the FCM token for notifications (App)
    },
    pushSubscription: {
      type: Object, // Store the Web Push subscription object
    },
  },
  { timestamps: true }
);

export default mongoose.models.RestuarentUser ||
  mongoose.model(
    "RestuarentUser",
    RegisterUserSchema,
    "restuarentusers"
  );
