import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

export async function assertTeamMember(
  ctx: MutationCtx | QueryCtx,
  teamId: Id<"teams">,
  userId: Id<"users">
) {
  const membership = await ctx.db
    .query("teamMembers")
    .withIndex("by_team_user", (q) => q.eq("teamId", teamId).eq("userId", userId))
    .first();
  if (!membership) throw new Error("Not a team member");
  return membership;
}

export async function assertTeamOwner(
  ctx: MutationCtx | QueryCtx,
  teamId: Id<"teams">,
  userId: Id<"users">
) {
  const membership = await assertTeamMember(ctx, teamId, userId);
  if (membership.role !== "owner") throw new Error("Not a team owner");
  return membership;
}
