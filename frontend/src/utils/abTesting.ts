// utils/abTesting.ts
/**
 * A/B Testing utilities for recommendation strategies
 * Routes users to different strategies based on consistent hashing
 */

// Strategy definitions
export type StrategyVariant = 'A' | 'B' | 'C';

export interface StrategyConfig {
  variant: StrategyVariant;
  name: string;
  description: string;
  alpha: number; // embedding similarity weight
  beta: number;  // popularity weight
  gamma: number; // user affinity weight
}

// Define A/B test strategies
export const STRATEGIES: Record<StrategyVariant, StrategyConfig> = {
  A: {
    variant: 'A',
    name: 'Content-Focused',
    description: 'Ưu tiên similarity (α=0.6, β=0.3, γ=0.1)',
    alpha: 0.6,
    beta: 0.3,
    gamma: 0.1
  },
  B: {
    variant: 'B',
    name: 'Trending-Focused',
    description: 'Ưu tiên popularity (α=0.3, β=0.6, γ=0.1)',
    alpha: 0.3,
    beta: 0.6,
    gamma: 0.1
  },
  C: {
    variant: 'C',
    name: 'Personalization-Focused',
    description: 'Ưu tiên user affinity (α=0.3, β=0.2, γ=0.5)',
    alpha: 0.3,
    beta: 0.2,
    gamma: 0.5
  }
};

/**
 * Get strategy for a user based on consistent hashing
 * This ensures the same user always gets the same strategy
 */
export function getUserStrategy(userId: string | null, sessionId: string): StrategyVariant {
  // Use userId if available, otherwise use sessionId for consistent assignment
  const identifier = userId || sessionId;
  
  // Simple hash function for consistent assignment
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    const char = identifier.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Map hash to strategy (A, B, or C)
  // Default: 20% A, 30% B, 50% C (can be adjusted)
  const normalizedHash = Math.abs(hash) % 100;
  
  if (normalizedHash < 20) {
    return 'A'; // 20% of users
  } else if (normalizedHash < 50) {
    return 'B'; // 50% of users
  } else {
    return 'C'; // 30% of users
  }
}

/**
 * Get strategy configuration for a user
 */
export function getStrategyConfig(userId: string | null, sessionId: string): StrategyConfig {
  const variant = getUserStrategy(userId, sessionId);
  return STRATEGIES[variant];
}

/**
 * Generate strategy identifier string for tracking
 */
export function getStrategyIdentifier(config: StrategyConfig): string {
  return `hybrid-alpha${config.alpha}-beta${config.beta}-gamma${config.gamma}`;
}

/**
 * Check if A/B testing is enabled (can be controlled via env or feature flag)
 */
export function isABTestingEnabled(): boolean {
  // Can be controlled via environment variable or feature flag service
  return true; // Default: enabled
}

