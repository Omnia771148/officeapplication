import mongoose from "mongoose";

const CatagoryfilterinmainpageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
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
