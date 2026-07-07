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
  },
  {
    timestamps: true,
    collection: "catagoryfilterinmainpage",
  }
);

export default mongoose.models.Catagoryfilterinmainpage ||
  mongoose.model("Catagoryfilterinmainpage", CatagoryfilterinmainpageSchema, "catagoryfilterinmainpage");
