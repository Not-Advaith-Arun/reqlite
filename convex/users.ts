import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getMe = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (!user) return null;

    const memberships = await ctx.db
      .query("teamMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const teams = await Promise.all(
      memberships.map(async (m) => {
        const team = await ctx.db.get(m.teamId);
        return team ? { ...team, role: m.role } : null;
      })
    );

    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      image: user.image,
      githubId: user.githubId,
      teams: teams.filter(Boolean),
    };
  },
});
