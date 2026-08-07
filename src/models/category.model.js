import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    parent_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },

    level: {
      type: Number,
      required: true,
      enum: [1, 2, 3],
      default: 1,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    category_image: {
      type: String,
      default: "",
      trim: true,
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },

    slotConfig: {
      allowInstant: { type: Boolean, default: true },
      allowSchedule: { type: Boolean, default: true },

      instant: {
        duration: { type: Number, default: 60 }, // service duration in minutes
        bufferTime: { type: Number, default: 30 }, // vendor travel/reach buffer
        searchRadiusKm: { type: Number, default: 10 }, // radius to find nearby vendor
      },

      schedule: {
        slotIntervalMinutes: { type: Number, default: 30 },
        workingHours: {
          start: { type: String, default: "09:00" },
          end: { type: String, default: "21:00" },
        },
        minAdvanceBookingHours: { type: Number, default: 2 },
        maxAdvanceBookingDays: { type: Number, default: 15 },
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Indexes
categorySchema.index({ parent_id: 1 });
categorySchema.index({ level: 1 });
categorySchema.index({ name: 1 });
categorySchema.index({ status: 1 });

const Category = mongoose.model("Category", categorySchema);

export default Category;
