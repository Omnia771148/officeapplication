import mongoose from "mongoose";

const CarouselSchema = new mongoose.Schema(
  {
    carouselId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
    collection: "carousel", // exact collection name "carousel" in MongoDB
  }
);

export default mongoose.models.Carousel || mongoose.model("Carousel", CarouselSchema, "carousel");
