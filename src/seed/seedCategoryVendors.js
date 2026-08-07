import User from "../models/user.model.js";
import Category from "../models/category.model.js";
import VendorSlot from "../models/vendor-slot.model.js";

const CATEGORY_ID = "6a7186aafb6a10023116d220"; // Rooms & Walls Painting

const mohaliVendors = [
  {
    name: "Sunrise Painters",
    email: "sunrise.painters@example.com",
    phone: "9999900001",
    role: "Vendor",
    status: 1,
    vendorCategories: ["6a7186aafb6a10023116d220"],
    currentLocation: { type: "Point", coordinates: [76.7179, 30.7046] }, // Phase 7, Mohali
    isAvailableNow: true,
    isVendorVerified: true,
  },
  {
    name: "Perfect Finish Painting Co.",
    email: "perfectfinish@example.com",
    phone: "9999900002",
    role: "Vendor",
    status: 1,
    vendorCategories: ["6a7186aafb6a10023116d220"],
    currentLocation: { type: "Point", coordinates: [76.7050, 30.7180] }, // Phase 3B2, Mohali
    isAvailableNow: true,
    isVendorVerified: true,
  },
  {
    name: "ColorCraft Home Services",
    email: "colorcraft@example.com",
    phone: "9999900003",
    role: "Vendor",
    status: 1,
    vendorCategories: ["6a7186aafb6a10023116d220"],
    currentLocation: { type: "Point", coordinates: [76.7300, 30.6950] }, // Sector 70, Mohali
    isAvailableNow: true,
    isVendorVerified: true,
  },
];

const timeToMinutes = (t) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const minutesToTime = (m) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

const generateSlotsForVendor = async (vendor, category, days = 7) => {
  const { start, end } = category.slotConfig.schedule.workingHours;
  const interval = category.slotConfig.schedule.slotIntervalMinutes;
  const startMin = timeToMinutes(start);
  const endMin = timeToMinutes(end);

  const slots = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  for (let d = 0; d < days; d++) {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() + d);

    for (let m = startMin; m + interval <= endMin; m += interval) {
      slots.push({
        vendor_id: vendor._id,
        category_id: category._id,
        date,
        startTime: minutesToTime(m),
        endTime: minutesToTime(m + interval),
        location: vendor.currentLocation, // renamed from vendor.location
        status: "available",
      });
    }
  }

  await VendorSlot.insertMany(slots, { ordered: false }).catch((err) => {
    if (err.code !== 11000) throw err;
  });

  return slots.length;
};

export const seedCategoryVendorsAndSlots = async () => {
  const category = await Category.findById(CATEGORY_ID);
  if (!category) throw new Error("Category not found — check CATEGORY_ID");

  for (const vendorData of mohaliVendors) {
    let vendor = await User.findOne({ email: vendorData.email });
    if (!vendor) {
      vendor = await User.create(vendorData);
      console.log(`Created vendor: ${vendor.name} (${vendor._id})`);
    } else {
      console.log(`Vendor already exists: ${vendor.name} (${vendor._id})`);
    }

    const count = await generateSlotsForVendor(vendor, category);
    console.log(`Generated ${count} slots for ${vendor.name}`);
  }
};