import mongoose from "mongoose";

const NativeDescriptionItemSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      default: undefined,
      validate: {
        validator: function (v) {
          if (this.type === "image" || this.type === "video") {
            return v != null && v.trim() !== "";
          }
          return true;
        },
        message: "url is required for image and video types",
      },
    },

    type: {
      type: String,
      enum: ["image", "video", "slider"],
      required: true,
    },

    sort_order: {
      type: Number,
      default: 0,
    },

    slider_title: {
      type: String,
      default: undefined,
    },

    slider_images: {
      type: [String],
      default: undefined,
    },
  },
  {
    _id: false,
  },
);

const NativeDescriptionSchema = new mongoose.Schema(
  {
    descriptionMedia: {
      type: [NativeDescriptionItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

const NativeDescription = mongoose.model(
  "NativeDescription",
  NativeDescriptionSchema,
);

export default NativeDescription;
