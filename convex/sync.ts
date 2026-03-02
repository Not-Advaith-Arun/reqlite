import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { assertTeamMember } from "./lib";

const collectionValidator = v.object({
  clientId: v.string(),
  parentClientId: v.optional(v.string()),
  name: v.string(),
  sortOrder: v.number(),
  deleted: v.boolean(),
  updatedAt: v.number(),
});

const requestValidator = v.object({
  clientId: v.string(),
  collectionClientId: v.string(),
  name: v.string(),
  method: v.string(),
  url: v.string(),
  headers: v.string(),
  params: v.string(),
  body: v.string(),
  auth: v.string(),
  preScript: v.string(),
  postScript: v.string(),
  sortOrder: v.number(),
  deleted: v.boolean(),
  updatedAt: v.number(),
});

const environmentValidator = v.object({
  clientId: v.string(),
  name: v.string(),
  variables: v.string(),
  deleted: v.boolean(),
  updatedAt: v.number(),
});

const historyValidator = v.object({
  clientId: v.string(),
  method: v.string(),
  url: v.string(),
  status: v.number(),
  durationMs: v.number(),
  responseSize: v.number(),
  timestamp: v.string(),
  requestData: v.string(),
  responseHeaders: v.string(),
  responseBodyPreview: v.string(),
});

const deletionValidator = v.object({
  entityType: v.union(
    v.literal("collections"),
    v.literal("requests"),
    v.literal("environments")
  ),
  clientId: v.string(),
});

export const push = mutation({
  args: {
    teamId: v.id("teams"),
    collections: v.array(collectionValidator),
    requests: v.array(requestValidator),
    environments: v.array(environmentValidator),
    history: v.array(historyValidator),
    deletions: v.array(deletionValidator),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await assertTeamMember(ctx, args.teamId, userId);

    // Upsert collections — team-scoped lookup
    for (const col of args.collections) {
      const existing = await ctx.db
        .query("collections")
        .withIndex("by_team_clientId", (q) =>
          q.eq("teamId", args.teamId).eq("clientId", col.clientId)
        )
        .first();

      if (existing) {
        if (existing.updatedAt >= col.updatedAt) continue; // LWW
        await ctx.db.patch(existing._id, { ...col, teamId: args.teamId });
      } else {
        await ctx.db.insert("collections", { ...col, teamId: args.teamId });
      }
    }

    // Upsert requests — team-scoped lookup
    for (const req of args.requests) {
      const existing = await ctx.db
        .query("requests")
        .withIndex("by_team_clientId", (q) =>
          q.eq("teamId", args.teamId).eq("clientId", req.clientId)
        )
        .first();

      if (existing) {
        if (existing.updatedAt >= req.updatedAt) continue;
        await ctx.db.patch(existing._id, { ...req, teamId: args.teamId });
      } else {
        await ctx.db.insert("requests", { ...req, teamId: args.teamId });
      }
    }

    // Upsert environments — team-scoped lookup
    for (const env of args.environments) {
      const existing = await ctx.db
        .query("environments")
        .withIndex("by_team_clientId", (q) =>
          q.eq("teamId", args.teamId).eq("clientId", env.clientId)
        )
        .first();

      if (existing) {
        if (existing.updatedAt >= env.updatedAt) continue;
        await ctx.db.patch(existing._id, { ...env, teamId: args.teamId });
      } else {
        await ctx.db.insert("environments", { ...env, teamId: args.teamId });
      }
    }

    // Append history (insert only, no upsert) — team-scoped lookup
    for (const h of args.history) {
      const existing = await ctx.db
        .query("history")
        .withIndex("by_team_clientId", (q) =>
          q.eq("teamId", args.teamId).eq("clientId", h.clientId)
        )
        .first();

      if (!existing) {
        await ctx.db.insert("history", { ...h, teamId: args.teamId, userId });
      }
    }

    // Process deletions (soft-delete) — team-scoped lookup
    for (const del of args.deletions) {
      const existing = await ctx.db
        .query(del.entityType)
        .withIndex("by_team_clientId", (q) =>
          q.eq("teamId", args.teamId).eq("clientId", del.clientId)
        )
        .first();

      if (existing && !existing.deleted) {
        await ctx.db.patch(existing._id, { deleted: true, updatedAt: Date.now() });
      }
    }
  },
});

export const pull = query({
  args: {
    teamId: v.id("teams"),
    since: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await assertTeamMember(ctx, args.teamId, userId);

    const collections = await ctx.db
      .query("collections")
      .withIndex("by_team_updated", (q) =>
        q.eq("teamId", args.teamId).gt("updatedAt", args.since)
      )
      .collect();

    const requests = await ctx.db
      .query("requests")
      .withIndex("by_team_updated", (q) =>
        q.eq("teamId", args.teamId).gt("updatedAt", args.since)
      )
      .collect();

    const environments = await ctx.db
      .query("environments")
      .withIndex("by_team_updated", (q) =>
        q.eq("teamId", args.teamId).gt("updatedAt", args.since)
      )
      .collect();

    // _creationTime is the automatic tiebreaker on by_team index, so this is an index range scan
    const history = await ctx.db
      .query("history")
      .withIndex("by_team", (q) =>
        q.eq("teamId", args.teamId).gt("_creationTime", args.since)
      )
      .collect();

    return { collections, requests, environments, history };
  },
});

export const pullInitial = query({
  args: {
    teamId: v.id("teams"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await assertTeamMember(ctx, args.teamId, userId);

    const collections = await ctx.db
      .query("collections")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .filter((q) => q.eq(q.field("deleted"), false))
      .collect();

    const requests = await ctx.db
      .query("requests")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .filter((q) => q.eq(q.field("deleted"), false))
      .collect();

    const environments = await ctx.db
      .query("environments")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .filter((q) => q.eq(q.field("deleted"), false))
      .collect();

    const history = await ctx.db
      .query("history")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .order("desc")
      .take(500);

    return { collections, requests, environments, history };
  },
});

export const pruneHistory = internalMutation({
  args: {},
  handler: async (ctx) => {
    const teams = await ctx.db.query("teams").collect();

    for (const team of teams) {
      // Only fetch what we need: 501 to check if pruning is needed
      const history = await ctx.db
        .query("history")
        .withIndex("by_team", (q) => q.eq("teamId", team._id))
        .order("desc")
        .take(501);

      if (history.length > 500) {
        // Need to delete excess — fetch IDs beyond the 500 limit
        const allHistory = await ctx.db
          .query("history")
          .withIndex("by_team", (q) => q.eq("teamId", team._id))
          .order("desc")
          .collect();

        const toDelete = allHistory.slice(500);
        for (const entry of toDelete) {
          await ctx.db.delete(entry._id);
        }
      }
    }
  },
});
