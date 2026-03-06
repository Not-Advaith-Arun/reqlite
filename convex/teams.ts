import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { assertTeamMember, assertTeamOwner } from "./lib";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

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

    return teams.filter(Boolean);
  },
});

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const name = args.name.trim();
    if (!name || name.length > 100) {
      throw new Error("Team name must be 1-100 characters");
    }

    const teamId = await ctx.db.insert("teams", {
      name,
      createdBy: userId,
      isPersonal: false,
    });

    await ctx.db.insert("teamMembers", {
      teamId,
      userId,
      role: "owner",
    });

    return await ctx.db.get(teamId);
  },
});

export const invite = mutation({
  args: { teamId: v.id("teams"), email: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await assertTeamOwner(ctx, args.teamId, userId);

    // Basic email validation + normalize to lowercase
    const email = args.email.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Invalid email address");
    }

    // Check if already invited
    const existing = await ctx.db
      .query("teamInvites")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .filter((q) =>
        q.and(
          q.eq(q.field("email"), email),
          q.eq(q.field("status"), "pending")
        )
      )
      .first();

    if (existing) return existing.token;

    // Check if blocked
    const blocked = await ctx.db
      .query("teamInvites")
      .withIndex("by_email", (q) => q.eq("email", email))
      .filter((q) =>
        q.and(
          q.eq(q.field("teamId"), args.teamId),
          q.eq(q.field("status"), "blocked")
        )
      )
      .first();

    if (blocked) throw new Error("This user has blocked invites from your team");

    // Check if already a member by email
    const existingUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();

    if (existingUser) {
      const existingMember = await ctx.db
        .query("teamMembers")
        .withIndex("by_team_user", (q) =>
          q.eq("teamId", args.teamId).eq("userId", existingUser._id)
        )
        .first();
      if (existingMember) throw new Error("User is already a member");
    }

    const token = crypto.randomUUID();

    await ctx.db.insert("teamInvites", {
      teamId: args.teamId,
      email,
      invitedBy: userId,
      status: "pending",
      token,
    });

    return token;
  },
});

export const acceptInvite = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const invite = await ctx.db
      .query("teamInvites")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!invite) throw new Error("Invite not found");
    if (invite.status !== "pending") throw new Error("Invite already used");

    const user = await ctx.db.get(userId);
    if (!user || (user.email ?? "").toLowerCase() !== invite.email) {
      throw new Error("Invite email does not match your account");
    }

    // Insert membership BEFORE marking invite as accepted
    const existing = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_user", (q) =>
        q.eq("teamId", invite.teamId).eq("userId", userId)
      )
      .first();

    if (!existing) {
      await ctx.db.insert("teamMembers", {
        teamId: invite.teamId,
        userId,
        role: "member",
      });
    }

    // Only mark accepted after membership is confirmed
    await ctx.db.patch(invite._id, { status: "accepted" });

    return invite.teamId;
  },
});

export const removeMember = mutation({
  args: { teamId: v.id("teams"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) throw new Error("Not authenticated");

    await assertTeamOwner(ctx, args.teamId, currentUserId);

    if (args.userId === currentUserId) {
      throw new Error("Cannot remove yourself");
    }

    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_user", (q) =>
        q.eq("teamId", args.teamId).eq("userId", args.userId)
      )
      .first();

    if (!membership) throw new Error("User is not a member of this team");

    await ctx.db.delete(membership._id);
  },
});

export const listMembers = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    await assertTeamMember(ctx, args.teamId, userId);

    const memberships = await ctx.db
      .query("teamMembers")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    return Promise.all(
      memberships.map(async (m) => {
        const user = await ctx.db.get(m.userId);
        return {
          _id: m._id,
          userId: m.userId,
          role: m.role,
          name: user?.name ?? "Unknown",
          email: user?.email ?? "",
          image: user?.image ?? "",
        };
      })
    );
  },
});

export const pendingInvites = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const user = await ctx.db.get(userId);
    if (!user?.email) return [];

    const invites = await ctx.db
      .query("teamInvites")
      .withIndex("by_email", (q) => q.eq("email", user.email!.toLowerCase()))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    return Promise.all(
      invites.map(async (inv) => {
        const team = await ctx.db.get(inv.teamId);
        const inviter = await ctx.db.get(inv.invitedBy);
        return {
          _id: inv._id,
          token: inv.token,
          teamId: inv.teamId,
          teamName: team?.name ?? "Unknown Team",
          inviterName: inviter?.name ?? "Someone",
        };
      })
    );
  },
});

// Shared handler for declining/blocking invites
async function respondToInvite(
  ctx: any,
  token: string,
  newStatus: "declined" | "blocked"
) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");

  const invite = await ctx.db
    .query("teamInvites")
    .withIndex("by_token", (q: any) => q.eq("token", token))
    .first();

  if (!invite || invite.status !== "pending") throw new Error("Invite not found");

  const user = await ctx.db.get(userId);
  if (!user || (user.email ?? "").toLowerCase() !== invite.email) {
    throw new Error("Not your invite");
  }

  await ctx.db.patch(invite._id, { status: newStatus });
}

export const declineInvite = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await respondToInvite(ctx, args.token, "declined");
  },
});

export const blockInvite = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await respondToInvite(ctx, args.token, "blocked");
  },
});

export const cleanupInvites = internalMutation({
  args: {},
  handler: async (ctx) => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const oldInvites = await ctx.db
      .query("teamInvites")
      .filter((q) =>
        q.and(
          q.neq(q.field("status"), "pending"),
          q.neq(q.field("status"), "blocked"),
          q.lt(q.field("_creationTime"), thirtyDaysAgo)
        )
      )
      .collect();

    for (const invite of oldInvites) {
      await ctx.db.delete(invite._id);
    }
  },
});
