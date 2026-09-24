import type { GymClass } from "./types";

export const gymClasses: GymClass[] = [
  { id: "cl-1", name: "Sunrise Spin", type: "Spin", trainerId: "tr-5", day: "Mon", startTime: "06:00", duration: 45, capacity: 20, booked: 18, location: "Conditioning Studio" },
  { id: "cl-2", name: "Strength Fundamentals", type: "Strength", trainerId: "tr-1", day: "Mon", startTime: "09:00", duration: 60, capacity: 12, booked: 9, location: "Strength Floor" },
  { id: "cl-3", name: "Power Hour HIIT", type: "HIIT", trainerId: "tr-2", day: "Mon", startTime: "18:00", duration: 45, capacity: 16, booked: 16, location: "Conditioning Studio" },
  { id: "cl-4", name: "Vinyasa Flow", type: "Yoga", trainerId: "tr-3", day: "Tue", startTime: "07:00", duration: 60, capacity: 18, booked: 11, location: "Studio A" },
  { id: "cl-5", name: "Boxing Conditioning", type: "Boxing", trainerId: "tr-2", day: "Tue", startTime: "18:30", duration: 50, capacity: 14, booked: 13, location: "Conditioning Studio" },
  { id: "cl-6", name: "Olympic Lifting Technique", type: "Strength", trainerId: "tr-6", day: "Wed", startTime: "09:00", duration: 60, capacity: 10, booked: 7, location: "Strength Floor" },
  { id: "cl-7", name: "Midday Mobility", type: "Mobility", trainerId: "tr-3", day: "Wed", startTime: "12:30", duration: 30, capacity: 20, booked: 8, location: "Studio A" },
  { id: "cl-8", name: "Sunrise Spin", type: "Spin", trainerId: "tr-5", day: "Thu", startTime: "06:00", duration: 45, capacity: 20, booked: 20, location: "Conditioning Studio" },
  { id: "cl-9", name: "Power Hour HIIT", type: "HIIT", trainerId: "tr-2", day: "Thu", startTime: "18:00", duration: 45, capacity: 16, booked: 12, location: "Conditioning Studio" },
  { id: "cl-10", name: "Strength Fundamentals", type: "Strength", trainerId: "tr-1", day: "Fri", startTime: "09:00", duration: 60, capacity: 12, booked: 10, location: "Strength Floor" },
  { id: "cl-11", name: "Vinyasa Flow", type: "Yoga", trainerId: "tr-3", day: "Fri", startTime: "17:30", duration: 60, capacity: 18, booked: 14, location: "Studio A" },
  { id: "cl-12", name: "Weekend Warrior HIIT", type: "HIIT", trainerId: "tr-2", day: "Sat", startTime: "09:00", duration: 45, capacity: 16, booked: 15, location: "Conditioning Studio" },
  { id: "cl-13", name: "Pilates Core", type: "Pilates", trainerId: "tr-3", day: "Sat", startTime: "10:30", duration: 45, capacity: 16, booked: 6, location: "Studio A" },
  { id: "cl-14", name: "Recovery Flow", type: "Mobility", trainerId: "tr-3", day: "Sun", startTime: "10:00", duration: 40, capacity: 20, booked: 9, location: "Studio A" },
];

export const daysOfWeek: GymClass["day"][] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
