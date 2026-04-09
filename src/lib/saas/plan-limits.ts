import type { SitePlan } from "@prisma/client";

export type PlanLimitKey = "maxPages" | "maxProducts" | "maxVectorDocuments";

export type PlanLimits = Record<PlanLimitKey, number>;

/**
 * Tier limits for SaaS plans. Tune via product; enforced in API routes (e.g. page create).
 */
export const PLAN_LIMITS: Record<SitePlan, PlanLimits> = {
  FREE: {
    maxPages: 8,
    maxProducts: 10,
    maxVectorDocuments: 20,
  },
  PRO: {
    maxPages: 50,
    maxProducts: 200,
    maxVectorDocuments: 500,
  },
  BUSINESS: {
    maxPages: 200,
    maxProducts: 2000,
    maxVectorDocuments: 5000,
  },
  ENTERPRISE: {
    maxPages: 100_000,
    maxProducts: 1_000_000,
    maxVectorDocuments: 1_000_000,
  },
};

export function limitsForPlan(plan: SitePlan): PlanLimits {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.FREE;
}
