import type { TrainerAvailabilitySlot } from "./types";

export const trainerAvailability: TrainerAvailabilitySlot[] = [
  // Maya Okonkwo (tr-1) — mornings, teaches Strength Fundamentals Mon/Fri 09:00
  { id: "av-1", trainerId: "tr-1", day: "Mon", startTime: "06:00", endTime: "09:00" },
  { id: "av-2", trainerId: "tr-1", day: "Wed", startTime: "06:00", endTime: "12:00" },
  { id: "av-3", trainerId: "tr-1", day: "Fri", startTime: "10:00", endTime: "13:00" },

  // Daniel Reyes (tr-2) — teaches HIIT/Boxing evenings, PT available late afternoon
  { id: "av-4", trainerId: "tr-2", day: "Mon", startTime: "16:00", endTime: "18:00" },
  { id: "av-5", trainerId: "tr-2", day: "Tue", startTime: "06:00", endTime: "09:00" },
  { id: "av-6", trainerId: "tr-2", day: "Wed", startTime: "16:00", endTime: "20:00" },
  { id: "av-7", trainerId: "tr-2", day: "Fri", startTime: "16:00", endTime: "18:00" },

  // Priya Chandran (tr-3) — yoga/mobility days, PT windows around class blocks
  { id: "av-8", trainerId: "tr-3", day: "Tue", startTime: "08:00", endTime: "12:00" },
  { id: "av-9", trainerId: "tr-3", day: "Wed", startTime: "13:30", endTime: "17:00" },
  { id: "av-10", trainerId: "tr-3", day: "Thu", startTime: "09:00", endTime: "17:00" },
  { id: "av-11", trainerId: "tr-3", day: "Sat", startTime: "11:30", endTime: "15:00" },

  // Jordan Ellis (tr-4) — dedicated personal trainer, no classes, broad availability
  { id: "av-12", trainerId: "tr-4", day: "Mon", startTime: "07:00", endTime: "17:00" },
  { id: "av-13", trainerId: "tr-4", day: "Tue", startTime: "07:00", endTime: "17:00" },
  { id: "av-14", trainerId: "tr-4", day: "Wed", startTime: "07:00", endTime: "17:00" },
  { id: "av-15", trainerId: "tr-4", day: "Thu", startTime: "07:00", endTime: "17:00" },
  { id: "av-16", trainerId: "tr-4", day: "Fri", startTime: "07:00", endTime: "17:00" },

  // Sofia Marchetti (tr-5) — teaches Sunrise Spin Mon/Thu 06:00, PT around it
  { id: "av-17", trainerId: "tr-5", day: "Mon", startTime: "07:00", endTime: "10:00" },
  { id: "av-18", trainerId: "tr-5", day: "Wed", startTime: "15:00", endTime: "18:00" },
  { id: "av-19", trainerId: "tr-5", day: "Thu", startTime: "07:00", endTime: "10:00" },
  { id: "av-20", trainerId: "tr-5", day: "Fri", startTime: "15:00", endTime: "18:00" },

  // Marcus Webb (tr-6) — teaches Olympic Lifting Wed 09:00, PT other weekdays
  { id: "av-21", trainerId: "tr-6", day: "Mon", startTime: "09:00", endTime: "17:00" },
  { id: "av-22", trainerId: "tr-6", day: "Tue", startTime: "09:00", endTime: "17:00" },
  { id: "av-23", trainerId: "tr-6", day: "Wed", startTime: "13:00", endTime: "17:00" },
  { id: "av-24", trainerId: "tr-6", day: "Thu", startTime: "09:00", endTime: "17:00" },
];
