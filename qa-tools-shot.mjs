// Screenshot the homepage "أدوات ذكية" (AI tools) section at desktop width.
export default async function run(page) {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('http://localhost:3213/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // Scroll the whole page first so every Reveal has fired.
  const height = await page.evaluate(() => document.body.scrollHeight);
  const viewport = await page.evaluate(() => window.innerHeight);
  for (let y = 0; y < height; y += Math.round(viewport * 0.7)) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(600);

  // Park at the tools grid.
  const info = await page.evaluate(() => {
    const section = [...document.querySelectorAll('section')].find((s) =>
      s.querySelector('h2')?.innerText.includes('مزايا بتفرق'),
    );
    if (!section) return { found: false };
    const top = section.getBoundingClientRect().top + window.scrollY - 90;
    window.scrollTo({ top, behavior: 'instant' });
    return { found: true, scrollY: Math.round(window.scrollY) };
  });

  await page.waitForTimeout(1200);
  return info;
}