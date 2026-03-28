import { Injectable } from '@nestjs/common';

interface RateLimitEntry {
  count: number;
  firstRequest: number;
}

@Injectable()
export class VoteRateLimiter {
  // Simple in-memory rate limiter for WebSocket events
  private readonly voteLimits = new Map<string, RateLimitEntry>();
  private readonly limits = {
    vote: { maxRequests: 5, windowMs: 10000 }, // 5 votes per 10 seconds
    reveal: { maxRequests: 3, windowMs: 5000 }, // 3 reveals per 5 seconds
    kick: { maxRequests: 3, windowMs: 60000 }, // 3 kicks per minute
  };

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.voteLimits.entries()) {
      if (now - entry.firstRequest > 60000) {
        this.voteLimits.delete(key);
      }
    }
  }

  checkLimit(playerId: string, action: 'vote' | 'reveal' | 'kick'): { allowed: boolean; retryAfter?: number } {
    this.cleanup();
    
    const key = `${playerId}:${action}`;
    const now = Date.now();
    const limit = this.limits[action];
    
    const entry = this.voteLimits.get(key);
    
    if (!entry) {
      this.voteLimits.set(key, { count: 1, firstRequest: now });
      return { allowed: true };
    }
    
    // Reset if window has passed
    if (now - entry.firstRequest > limit.windowMs) {
      this.voteLimits.set(key, { count: 1, firstRequest: now });
      return { allowed: true };
    }
    
    // Check limit
    if (entry.count >= limit.maxRequests) {
      const retryAfter = Math.ceil((entry.firstRequest + limit.windowMs - now) / 1000);
      return { allowed: false, retryAfter };
    }
    
    entry.count++;
    return { allowed: true };
  }

  reset(playerId: string) {
    for (const action of ['vote', 'reveal', 'kick'] as const) {
      this.voteLimits.delete(`${playerId}:${action}`);
    }
  }
}
