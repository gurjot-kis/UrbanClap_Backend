import mongoose from "mongoose";

const PromotionalBannerContentSchema = new mongoose.Schema(
  {
    image: {
      type: String,
      trim: true,
      default: undefined,
    },

    mainHeading: {
      type: String,
      trim: true,
      default: undefined,
    },

    mainHeadingColor: {
      type: {
        type: String,
        enum: ["solid", "gradient"],
        default: undefined,
      },

      color: {
        type: String,
        trim: true,
        default: undefined,
      },

      gradient: {
        startColor: {
          type: String,
          trim: true,
          default: undefined,
        },

        endColor: {
          type: String,
          trim: true,
          default: undefined,
        },

        direction: {
          type: String,
          trim: true,
          default: undefined,
        },
      },
    },

    label: {
      type: String,
      trim: true,
      default: undefined,
    },

    actionText: {
      type: String,
      trim: true,
      default: undefined,
    },

    showActionArrow: {
      type: Boolean,
      default: undefined,
    },

    backgroundColor: {
      type: String,
      trim: true,
      default: undefined,
    },

    textColor: {
      type: String,
      trim: true,
      default: undefined,
    },
  },
  {
    _id: false,
  },
);

const SpotlightContentSchema = new mongoose.Schema(
  {
    image: {
      type: String,
      trim: true,
      default: undefined,
    },

    sortOrder: {
      type: Number,
      default: undefined,
    },

    redirectType: {
      type: String,
      enum: ["service", "native"],
      default: undefined,
    },

    redirectId: {
      type: mongoose.Schema.Types.ObjectId,
      default: undefined,
    },
  },
  {
    _id: false,
  },
);

const SliderImageDetailsSchema = new mongoose.Schema(
  {
    image: {
      type: String,
      trim: true,
      required: true,
    },

    relatedImages: {
      type: [String],
      default: undefined,
    },

    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    _id: false,
  },
);
const SliderVideoDetailsSchema = new mongoose.Schema(
  {
    video: {
      type: String,
      trim: true,
      required: true,
    },

    relatedVideos: {
      type: [String],
      default: undefined,
    },

    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    _id: false,
  },
);

const DescriptionItemSchema = new mongoose.Schema(
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
    slider_description: {
      type: String,
      default: undefined,
    },

    slider_images: {
      type: [String],
      default: undefined,
    },
    
    slider_videos: {
      type: [SliderVideoDetailsSchema],
      default: undefined,
    },

    sliderImageDetails: {
      type: [SliderImageDetailsSchema],
      default: undefined,
    },

    relatedImages: {
      type: [String],
      default: undefined,
    },
  },
  {
    _id: false,
  },
);

const staticContentSchema = new mongoose.Schema(
  {
    page: {
      type: String,
      required: true,
      trim: true,
    },

    section: {
      type: String,
      trim: true,
      default: undefined,
    },

    key: {
      type: String,
      required: true,
      trim: true,
    },

    sectionTitle: {
      type: String,
      trim: true,
      default: undefined,
    },

    marqueeContent: {
      type: [String],
      default: undefined,
    },

    backgroundImage: {
      type: String,
      trim: true,
      default: undefined,
    },

    sliderContent: {
      type: [PromotionalBannerContentSchema],
      default: undefined,
    },

    spotlightContent: {
      type: [SpotlightContentSchema],
      default: undefined,
    },

    descriptionMedia: {
      type: [DescriptionItemSchema],
      default: undefined,
    },

    nativeCategoryDetails: {
      type: [DescriptionItemSchema],
      default: undefined,
    },

    nativeCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NativeCategory",
      default: undefined,
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  {
    timestamps: true,
  },
);

staticContentSchema.index({ page: 1, section: 1, key: 1 }, { unique: true });

const StaticContent = mongoose.model("StaticContent", staticContentSchema);

export default StaticContent;
