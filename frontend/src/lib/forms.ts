import type { InquiryInput, TrackOrderRequest, TrackedOrder } from "../types/api";
import { api } from "./api";
import type { Mode } from "./repo";

export async function submitInquiry(mode: Mode, input: InquiryInput) {
  void mode;
  return api.submitInquiry(input);
}

export async function subscribe(mode: Mode, email: string, source: string) {
  void mode;
  return api.subscribe(email, source);
}

export const notFoundMessage = "We couldn't find an order with those tracking details.";

export async function trackOrder(mode: Mode, input: TrackOrderRequest): Promise<TrackedOrder> {
  void mode;
  return api.trackOrder(input);
}
