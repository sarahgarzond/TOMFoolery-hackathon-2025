import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    audits: defineTable({
        userId: v.string(),       // Clerk User ID
        url: v.string(),
        mobileAdDensity: v.number(), // 0-100
        hasSchema: v.boolean(),
        status: v.string(),       // "success" | "failed"
        timestamp: v.number(),
    }).index("by_user", ["userId"]),
});