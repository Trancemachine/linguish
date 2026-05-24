export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function waitForElements(
  selector: string,
  timeout: number = 15000
): Promise<Element[]> {
  const existing = document.querySelectorAll(selector);
  if (existing.length > 0) return Promise.resolve(Array.from(existing));

  return new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      const els = document.querySelectorAll(selector);
      if (els.length > 0) {
        observer.disconnect();
        resolve(Array.from(els));
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => {
      observer.disconnect();
      resolve([]);
    }, timeout);
  });
}
