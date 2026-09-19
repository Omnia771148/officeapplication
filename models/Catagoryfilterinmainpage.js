import mongoose from "mongoose";

const CatagoryfilterinmainpageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: false,
      unique: true,
      trim: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    position: {
      type: Number,
      default: 0,
    },
    bgColor: {
      type: String,
      default: "rgba(0, 0, 0, 0.45)",
    },
    fontSize: {
      type: Number,
      default: 11,
    },
    fontColor: {
      type: String,
      default: "#FFFFFF",
    },
  },
  {
    timestamps: true,
    collection: "catagoryfilterinmainpage",
  }
);

if (mongoose.models.Catagoryfilterinmainpage) {
  delete mongoose.models.Catagoryfilterinmainpage;
}

export default mongoose.model(
  "Catagoryfilterinmainpage",
  CatagoryfilterinmainpageSchema,
  "catagoryfilterinmainpage"
);
