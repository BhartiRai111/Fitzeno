import type { Supplier } from "./types";

export const suppliers: Supplier[] = [
  {
    id: "sup-1",
    name: "PureForm Nutrition",
    contactName: "Dev Malhotra",
    email: "orders@pureformnutrition.example",
    phone: "+44 161 555 0301",
    leadTimeDays: 5,
  },
  {
    id: "sup-2",
    name: "HydroGear Supplies",
    contactName: "Anna Kowalski",
    email: "sales@hydrogear.example",
    phone: "+44 161 555 0322",
    leadTimeDays: 7,
  },
  {
    id: "sup-3",
    name: "Fitzeno Apparel Co.",
    contactName: "Marcus Liu",
    email: "production@fitzenoapparel.example",
    phone: "+44 161 555 0347",
    leadTimeDays: 14,
  },
  {
    id: "sup-4",
    name: "IronCore Equipment",
    contactName: "Sofia Rinaldi",
    email: "wholesale@ironcoreequip.example",
    phone: "+44 161 555 0365",
    leadTimeDays: 10,
  },
];
