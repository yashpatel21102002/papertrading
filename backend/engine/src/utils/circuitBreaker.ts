import logger from './logger';

const log = logger.child({ module: 'circuit-breaker' });

type State = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitBreaker {
    private state: State = 'CLOSED';
    private failures = 0;
    private openedAt: number | null = null;

    constructor(
        private readonly name: string,
        private readonly threshold: number = 5,       // consecutive failures before OPEN
        private readonly cooldownMs: number = 60_000, // ms before retrying after OPEN
    ) {}

    /** Returns true when calls should be blocked. */
    isOpen(): boolean {
        if (this.state === 'CLOSED') return false;

        if (this.state === 'OPEN') {
            if (Date.now() - this.openedAt! >= this.cooldownMs) {
                this.state = 'HALF_OPEN';
                log.warn({ name: this.name }, 'Circuit breaker entering HALF_OPEN — probing');
                return false; // allow one probe call through
            }
            return true; // still cooling down
        }

        // HALF_OPEN: let the call through
        return false;
    }

    onSuccess(): void {
        if (this.state !== 'CLOSED') {
            log.info({ name: this.name, previousState: this.state }, 'Circuit breaker CLOSED — service recovered');
        }
        this.failures = 0;
        this.state = 'CLOSED';
        this.openedAt = null;
    }

    onFailure(): void {
        this.failures++;

        if (this.state === 'HALF_OPEN' || this.failures >= this.threshold) {
            this.state = 'OPEN';
            this.openedAt = Date.now();
            log.error(
                { name: this.name, failures: this.failures, cooldownMs: this.cooldownMs },
                'Circuit breaker OPEN — calls suspended until cooldown expires',
            );
        } else {
            log.warn({ name: this.name, failures: this.failures, threshold: this.threshold }, 'Circuit breaker failure recorded');
        }
    }

    getState(): State {
        return this.state;
    }
}
