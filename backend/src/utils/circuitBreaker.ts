import { logger } from './logger';

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Too many failures, reject requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

interface CircuitBreakerOptions {
  failureThreshold: number;      // Number of failures before opening
  successThreshold: number;       // Number of successes to close from half-open
  timeout: number;                // Time in ms before trying again (half-open)
  monitoringPeriod: number;       // Time window for counting failures
}

interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime?: number;
  nextAttemptTime?: number;
}

/**
 * Circuit Breaker implementation for external API calls
 * Prevents cascading failures by stopping requests to failing services
 *
 * States:
 * - CLOSED: Normal operation, requests go through
 * - OPEN: Service is failing, reject all requests immediately
 * - HALF_OPEN: Testing if service recovered, allow one request
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures = 0;
  private successes = 0;
  private lastFailureTime?: number;
  private nextAttemptTime?: number;
  private failureTimes: number[] = [];

  constructor(
    private name: string,
    private options: CircuitBreakerOptions = {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000, // 1 minute
      monitoringPeriod: 120000, // 2 minutes
    }
  ) {
    logger.info(`Circuit breaker initialized: ${name}`, { options });
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check circuit state before executing
    if (this.state === CircuitState.OPEN) {
      if (this.nextAttemptTime && Date.now() < this.nextAttemptTime) {
        const waitTime = Math.ceil((this.nextAttemptTime - Date.now()) / 1000);
        logger.warn(`Circuit breaker OPEN for ${this.name}`, {
          waitTime: `${waitTime}s`,
          failures: this.failures,
        });
        throw new Error(
          `Circuit breaker OPEN for ${this.name}. Service temporarily unavailable. Retry in ${waitTime}s.`
        );
      }
      // Timeout expired, move to half-open
      this.state = CircuitState.HALF_OPEN;
      logger.info(`Circuit breaker transitioning to HALF_OPEN: ${this.name}`);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Record a successful execution
   */
  private onSuccess(): void {
    this.failures = 0;
    this.failureTimes = [];

    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++;
      if (this.successes >= this.options.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.successes = 0;
        logger.info(`Circuit breaker CLOSED: ${this.name} - service recovered`);
      }
    }
  }

  /**
   * Record a failed execution
   */
  private onFailure(): void {
    const now = Date.now();
    this.lastFailureTime = now;
    this.failureTimes.push(now);

    // Remove failures outside monitoring period
    this.failureTimes = this.failureTimes.filter(
      time => now - time < this.options.monitoringPeriod
    );

    this.failures = this.failureTimes.length;

    if (this.state === CircuitState.HALF_OPEN) {
      // Failed during half-open, go back to open
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = now + this.options.timeout;
      this.successes = 0;
      logger.warn(`Circuit breaker back to OPEN: ${this.name}`, {
        nextAttempt: new Date(this.nextAttemptTime).toISOString(),
      });
    } else if (this.failures >= this.options.failureThreshold) {
      // Too many failures, open the circuit
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = now + this.options.timeout;
      logger.error(`Circuit breaker OPENED: ${this.name}`, {
        failures: this.failures,
        threshold: this.options.failureThreshold,
        nextAttempt: new Date(this.nextAttemptTime).toISOString(),
      });
    }
  }

  /**
   * Get current circuit breaker stats
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
    };
  }

  /**
   * Reset circuit breaker (useful for testing or manual recovery)
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.failureTimes = [];
    this.lastFailureTime = undefined;
    this.nextAttemptTime = undefined;
    logger.info(`Circuit breaker manually reset: ${this.name}`);
  }

  /**
   * Check if circuit is allowing requests
   */
  isOpen(): boolean {
    return this.state === CircuitState.OPEN;
  }
}

// Pre-configured circuit breakers for external services
export const circuitBreakers = {
  gemini: new CircuitBreaker('Gemini API', {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000,      // 1 minute
    monitoringPeriod: 120000, // 2 minutes
  }),
  removeBackground: new CircuitBreaker('Remove.bg API', {
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 300000,     // 5 minutes (they might have rate limits)
    monitoringPeriod: 600000, // 10 minutes
  }),
  supabase: new CircuitBreaker('Supabase Storage', {
    failureThreshold: 10,
    successThreshold: 3,
    timeout: 30000,      // 30 seconds
    monitoringPeriod: 60000,  // 1 minute
  }),
};
