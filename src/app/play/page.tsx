import { redirect } from "next/navigation";

/** Linear progression — entry is always Game 1. */
export default function PlayHubPage() {
  redirect("/play/1");
}
