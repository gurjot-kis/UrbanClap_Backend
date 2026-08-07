export const isValidTimeString = (value) =>
  /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(value));

export const normalizeSlotConfig = (slotConfig, existing = {}) => {
  if (slotConfig === undefined) return undefined;

  if (
    typeof slotConfig !== "object" ||
    slotConfig === null ||
    Array.isArray(slotConfig)
  ) {
    const err = new Error("slotConfig must be an object");
    err.statusCode = 400;
    throw err;
  }

  const allowInstant =
    slotConfig.allowInstant !== undefined
      ? Boolean(slotConfig.allowInstant)
      : (existing.allowInstant ?? true);

  const allowSchedule =
    slotConfig.allowSchedule !== undefined
      ? Boolean(slotConfig.allowSchedule)
      : (existing.allowSchedule ?? true);

  if (!allowInstant && !allowSchedule) {
    const err = new Error(
      "At least one of allowInstant or allowSchedule must be true",
    );
    err.statusCode = 400;
    throw err;
  }

  const merged = {
    allowInstant,
    allowSchedule,
    instant: allowInstant
      ? {
          duration:
            slotConfig.instant?.duration !== undefined
              ? Number(slotConfig.instant.duration)
              : (existing.instant?.duration ?? 60),
          bufferTime:
            slotConfig.instant?.bufferTime !== undefined
              ? Number(slotConfig.instant.bufferTime)
              : (existing.instant?.bufferTime ?? 30),
          searchRadiusKm:
            slotConfig.instant?.searchRadiusKm !== undefined
              ? Number(slotConfig.instant.searchRadiusKm)
              : (existing.instant?.searchRadiusKm ?? 10),
        }
      : { duration: 0, bufferTime: 0, searchRadiusKm: 0 }, // reset when disabled
    schedule: allowSchedule
      ? {
          slotIntervalMinutes:
            slotConfig.schedule?.slotIntervalMinutes !== undefined
              ? Number(slotConfig.schedule.slotIntervalMinutes)
              : (existing.schedule?.slotIntervalMinutes ?? 30),
          workingHours: {
            start:
              slotConfig.schedule?.workingHours?.start ??
              existing.schedule?.workingHours?.start ??
              "09:00",
            end:
              slotConfig.schedule?.workingHours?.end ??
              existing.schedule?.workingHours?.end ??
              "21:00",
          },
          minAdvanceBookingHours:
            slotConfig.schedule?.minAdvanceBookingHours !== undefined
              ? Number(slotConfig.schedule.minAdvanceBookingHours)
              : (existing.schedule?.minAdvanceBookingHours ?? 2),
          maxAdvanceBookingDays:
            slotConfig.schedule?.maxAdvanceBookingDays !== undefined
              ? Number(slotConfig.schedule.maxAdvanceBookingDays)
              : (existing.schedule?.maxAdvanceBookingDays ?? 15),
        }
      : {
          slotIntervalMinutes: 0,
          workingHours: { start: "00:00", end: "00:00" },
          minAdvanceBookingHours: 0,
          maxAdvanceBookingDays: 0,
        },
  };

  // only validate the sub-object that's actually active
  if (allowInstant) {
    if (merged.instant.duration <= 0) {
      const err = new Error(
        "slotConfig.instant.duration must be greater than 0",
      );
      err.statusCode = 400;
      throw err;
    }
    if (merged.instant.bufferTime < 0) {
      const err = new Error("slotConfig.instant.bufferTime cannot be negative");
      err.statusCode = 400;
      throw err;
    }
    if (merged.instant.searchRadiusKm <= 0) {
      const err = new Error(
        "slotConfig.instant.searchRadiusKm must be greater than 0",
      );
      err.statusCode = 400;
      throw err;
    }
  }

  if (allowSchedule) {
    if (merged.schedule.slotIntervalMinutes <= 0) {
      const err = new Error(
        "slotConfig.schedule.slotIntervalMinutes must be greater than 0",
      );
      err.statusCode = 400;
      throw err;
    }
    if (!isValidTimeString(merged.schedule.workingHours.start)) {
      const err = new Error(
        "slotConfig.schedule.workingHours.start must be in HH:mm format",
      );
      err.statusCode = 400;
      throw err;
    }
    if (!isValidTimeString(merged.schedule.workingHours.end)) {
      const err = new Error(
        "slotConfig.schedule.workingHours.end must be in HH:mm format",
      );
      err.statusCode = 400;
      throw err;
    }
    if (
      merged.schedule.workingHours.start >= merged.schedule.workingHours.end
    ) {
      const err = new Error(
        "workingHours.start must be earlier than workingHours.end",
      );
      err.statusCode = 400;
      throw err;
    }
    if (merged.schedule.minAdvanceBookingHours < 0) {
      const err = new Error(
        "slotConfig.schedule.minAdvanceBookingHours cannot be negative",
      );
      err.statusCode = 400;
      throw err;
    }
    if (merged.schedule.maxAdvanceBookingDays <= 0) {
      const err = new Error(
        "slotConfig.schedule.maxAdvanceBookingDays must be greater than 0",
      );
      err.statusCode = 400;
      throw err;
    }
  }

  return merged;
};
