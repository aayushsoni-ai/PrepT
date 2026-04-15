import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { updateBookingStatus } from "@/actions/booking";

export async function GET(request, { params }) {
  const { bookingId, action } = await params;
  const user = await currentUser();

  if (!user) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect_url", request.url);
    return redirect(signInUrl.toString());
  }

  try {
    let status;
    if (action === "accept") {
      status = "SCHEDULED";
    } else if (action === "reject") {
      status = "REJECTED";
    } else {
      return new Response("Invalid action", { status: 400 });
    }

    const res = await updateBookingStatus(bookingId, status);

    if (res.success) {
      return redirect(
        `/dashboard?message=${encodeURIComponent(
          action === "accept"
            ? "Interview accepted successfully!"
            : "Interview rejected."
        )}`
      );
    } else {
      throw new Error("Failed to update booking");
    }
  } catch (error) {
    console.error("Booking API error:", error);
    return redirect(
      `/dashboard?error=${encodeURIComponent(
        error.message || "An error occurred while processing your request."
      )}`
    );
  }
}
