import Link from "next/link";

export type Sender = { name: string; phone: string; hasPhoto: boolean };

// Client links show the sender's own photo and number, so flag a blank profile.
export default function ProfileNudge({ sender }: { sender: Sender }) {
  if (sender.phone && sender.hasPhoto) return null;
  const missing = !sender.phone && !sender.hasPhoto ? "your cell number and photo"
    : !sender.phone ? "your cell number" : "your photo";
  return (
    <p className="mt-2 text-xs rounded-md bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2">
      Clients see your name, photo and number on the link. Add {missing} on{" "}
      <Link href="/profile" className="font-semibold underline">My Profile</Link>
      {!sender.phone ? " before you can send links." : "."}
    </p>
  );
}
