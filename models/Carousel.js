import mongoose from "mongoose";

const CarouselSchema = new mongoose.Schema(
  {
    carouselId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    position: {
      type: Number,
      default: 0,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: false,
    },
    restaurantId: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
    collection: "carousel", // exact collection name "carousel" in MongoDB
  }
);

if (mongoose.models.Carousel) {
  delete mongoose.models.Carousel;
}

export default mongoose.model("Carousel", CarouselSchema, "carousel");

