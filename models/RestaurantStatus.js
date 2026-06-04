import mongoose from "mongoose";

const RestaurantStatusSchema = new mongoose.Schema({
  restaurantId: {
    type: String,
    required: true,
    unique: true,
  },
  isActive: {
    type: Boolean,
    default: false,
  },
  isManuallyToggled: {
    type: Boolean,
    default: false,
  },
  manualStatusUpdatedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.RestaurantStatus ||
  mongoose.model("RestaurantStatus", RestaurantStatusSchema);
