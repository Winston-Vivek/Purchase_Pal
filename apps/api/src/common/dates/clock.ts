/**
 * The source of "now", behind a token so tests can pin it.
 *
 * di-use-interfaces-tokens: a TypeScript interface is erased at compile time
 * and cannot be an injection token, so the symbol below is what Nest resolves.
 *
 * Why this exists at all: every deadline in Proofly is relative to today. With
 * `new Date()` called inline, the 24 date cases would start failing on their
 * own in a few weeks, and the leap-day case (UT-DATE-03) could only ever be
 * tested by waiting four years.
 */
export const CLOCK = Symbol('CLOCK');

export interface Clock {
  now(): Date;
}

/** The real clock. Tests swap in a fixed one (docs/test-plan.md §5). */
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
