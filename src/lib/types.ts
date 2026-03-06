import type { Database } from "@/lib/database.types";
import type { PriorityLevel, ProspectStatus } from "@/lib/constants";

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type BusinessRow = Database["public"]["Tables"]["businesses"]["Row"];
export type NoteRow = Database["public"]["Tables"]["business_notes"]["Row"];

export type OverpassBusiness = {
  source: "overpass";
  externalSourceId: string;
  name: string;
  category: string | null;
  lat: number;
  lng: number;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  opening_hours: string | null;
};

export type CombinedBusiness = {
  key: string;
  mode: "saved" | "overpass";
  worked: boolean;
  name: string;
  category: string | null;
  city: string | null;
  lat: number;
  lng: number;
  status: ProspectStatus;
  priority: PriorityLevel | null;
  business: BusinessRow | null;
  overpass: OverpassBusiness | null;
  lastInteractionAt: string | null;
  latestNote: string | null;
};

export type OverpassResponse = {
  fetchedAt: string;
  businesses: OverpassBusiness[];
};

export type CitySuggestion = {
  displayName: string;
  cityName: string;
  lat: number;
  lng: number;
};

export type GeocodeResult = {
  lat: number;
  lng: number;
  displayName: string;
};
