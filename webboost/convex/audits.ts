import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Save a new audit result
export const save = mutation({
    args: {
        url: v.string(),
        mobileAdDensity: v.number(),
        hasSchema: v.boolean(),
        status: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        await ctx.db.insert("audits", {
            userId: identity.subject,
            url: args.url,
            mobileAdDensity: args.mobileAdDensity,
            hasSchema: args.hasSchema,
            status: args.status,
            timestamp: Date.now(),
        });
    },
});

// Get all audits for the logged-in user
export const list = query({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return;

        return await ctx.db
            .query("audits")
            .withIndex("by_user", (q) => q.eq("userId", identity.subject))
            .order("desc")
            .take(20);
    },
});
