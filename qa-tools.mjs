// Verify the four new AI tools render in the homepage "أدوات ذكية" section.
export default async function run(page) {
  // Scroll the whole page so every Reveal fires.
  const height = await page.evaluate(() => document.body.scrollHeight);
  const viewport = await page.evaluate(() => window.innerHeight);
  for (let y = 0; y < height; y += Math.round(viewport * 0.7)) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(800);

  return page.evaluate(() => {
    const wanted = [
      'مصمم صندوق الهدايا بالذكاء',
      'مصمم الهدية الغامضة',
      'باني عالم الهدية',
      'مصنع الهدايا بالذكاء',
    ];
    const headings = [...document.querySelectorAll('h3')].map((h) => h.innerText.trim());
    const section = [...document.querySelectorAll('section')].find((s) =>
      s.querySelector('h2')?.innerText.includes('مزايا بتفرق'),
    );
    const cards = section ? [...section.querySelectorAll('a')] : [];

    return {
      toolsRendered: headings.length,
      newToolsPresent: wanted.map((w) => ({ name: w, found: headings.includes(w) })),
      toolCardCount: cards.length,
      allToolTitles: headings,
      imgs: document.querySelectorAll('img').length,
    };
  });
}