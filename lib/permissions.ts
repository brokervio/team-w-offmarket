// Who can edit a listing. Keep in sync with public.can_edit_listing()
// in supabase/migrations/014_open_listing_editing.sql.
//   Admin                      edits everything
//   Open listing               any agent
//   Team W listing agent set   only that agent
//   Other brokerage / no agent the agent who added it
export type EditableListing = {
  is_open_listing?: boolean | null;
  listing_agent_id?: string | null;
  created_by?: string | null;
};

export function canEditListing(l: EditableListing, userId: string, role: string | null | undefined) {
  if (role === "admin") return true;
  if (role !== "agent") return false;
  if (l.is_open_listing) return true;
  if (l.listing_agent_id) return l.listing_agent_id === userId;
  return l.created_by === userId;
}

export function editRuleText(l: EditableListing, agentName?: string | null) {
  if (l.listing_agent_id) {
    return `${agentName || "The listing agent"} is the listing agent, so only they can edit it. Admins can edit everything.`;
  }
  return "Only the agent who added this listing can edit it. Admins can edit everything.";
}
