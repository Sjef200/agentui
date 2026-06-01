import '@testing-library/jest-dom/vitest';

/**
 * jsdom has no layout engine: every element reports a zero-sized
 * `getBoundingClientRect`, which would make `@tanstack/react-virtual` measure a
 * 0px viewport and render no rows. We provide just enough fake layout for the
 * virtualizer to work deterministically in tests:
 *
 *  - the timeline scroll container reports a tall viewport,
 *  - virtualized rows report a realistic per-row height,
 *  - a no-op ResizeObserver so the virtualizer's observer setup doesn't throw.
 *
 * This affects only the jsdom test environment; the real browser uses native layout.
 */

const VIEWPORT_HEIGHT = 800;
const VIEWPORT_WIDTH = 1000;
const ROW_HEIGHT = 56;

if (typeof globalThis.ResizeObserver === 'undefined') {
  class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}

/** Pick a fake size for an element based on its role in the timeline. */
function sizeFor(el: HTMLElement): { width: number; height: number } | null {
  if (el.dataset?.testid === 'timeline-scroll') {
    return { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT };
  }
  if (el.dataset?.index !== undefined) {
    return { width: VIEWPORT_WIDTH, height: ROW_HEIGHT };
  }
  return null;
}

const realGetRect = Element.prototype.getBoundingClientRect;
Element.prototype.getBoundingClientRect = function getBoundingClientRect(this: Element): DOMRect {
  const size = sizeFor(this as HTMLElement);
  return size ? makeRect(size.width, size.height) : realGetRect.call(this);
};

// `@tanstack/virtual-core` measures the scroll container via `offsetWidth` /
// `offsetHeight` (not getBoundingClientRect), so override those too. jsdom
// defines them as getters returning 0; redefine to honor our fake sizes.
for (const prop of ['offsetWidth', 'offsetHeight', 'clientWidth', 'clientHeight'] as const) {
  Object.defineProperty(HTMLElement.prototype, prop, {
    configurable: true,
    get(this: HTMLElement): number {
      const size = sizeFor(this);
      if (size) return prop.toLowerCase().includes('width') ? size.width : size.height;
      return 0;
    },
  });
}

function makeRect(width: number, height: number): DOMRect {
  return {
    width,
    height,
    top: 0,
    left: 0,
    right: width,
    bottom: height,
    x: 0,
    y: 0,
    toJSON() {
      return this;
    },
  } as DOMRect;
}
