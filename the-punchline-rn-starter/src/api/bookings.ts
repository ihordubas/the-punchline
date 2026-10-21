export type BookingRequest = {
  showId: string;
  name: string;
  email: string;
  quantity: number;
};

export type BookingConfirmation = {
  bookingId: string;
};

export async function submitBooking(
  request: BookingRequest,
): Promise<BookingConfirmation> {
  await new Promise<void>((resolve) => setTimeout(resolve, 700));
  return { bookingId: `${request.showId}-${Date.now()}` };
}
