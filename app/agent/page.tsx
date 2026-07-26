import { redirect } from "next/navigation";

// The old prospect-era agent dashboard is retired in internal mode.
// /agent now just lands on the listing manager.
export default function AgentHome() {
  redirect("/agent/listings");
}
