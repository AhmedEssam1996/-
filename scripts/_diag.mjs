export default async function run(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.waitForTimeout(7000);

  const state = await page.evaluate(() => {
    const main = document.querySelector('main');
    const canvas = document.querySelector('canvas');

    const sections = main
      ? Array.from(main.children).map((el) => ({
          h: Math.round(el.getBoundingClientRect().height),
          opacity: getComputedStyle(el).opacity,
        }))
      : [];

    return {
      canvasCount: document.querySelectorAll('canvas').length,
      canvasEngine: canvas?.dataset.engine ?? null,
      canvasBox: canvas
        ? {
            w: Math.round(canvas.getBoundingClientRect().width),
            h: Math.round(canvas.getBoundingClientRect().height),
          }
        : null,
      svgFallback: !!document.querySelector('svg[aria-label*="صندوق"]'),
      threeRequested: performance
        .getEntriesByType('resource')
        .some((r) => /gift-scene|three/i.test(r.name)),
      hiddenSections: sections.filter((s) => s.opacity === '0').length,
      totalSections: sections.length,
      docHeight: document.documentElement.scrollHeight,
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
    };
  });

  await page.screenshot({ path: './.verify.png', fullPage: true });
  return { state, errors };
}