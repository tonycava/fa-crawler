import puppeteer from 'puppeteer';
import fs from 'fs';

export const launchFaBot = async () => {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox'],
    headless: false,
    defaultViewport: { width: 600, height: 800 }
  });

  for (let i = 5; i <= 12; i++) {
    console.log('Page:', i);
    const page = await browser.newPage();
    await page.goto(`https://fontawesome.com/search?o=r&m=free&f=classic%2Cbrands&p=${i}`, { waitUntil: 'networkidle2' });
    const context = await browser.defaultBrowserContext();
    await context.overridePermissions('https://fontawesome.com/', ['clipboard-read']);

    const articles = await page.$$eval('article:not(.card.roomy)', (elements) => {
      return elements.map((element) => element.getAttribute('id'));
    });

    const regex = /^(icon)-(\w+)-(\w+(-\w+)*)-(\w+)$/;
    const separatedSVG = articles.map((item) => item?.match(regex));

    for (let i = 0; i < separatedSVG.length; i++) {
      const svg = separatedSVG[i];

      let icon = svg?.at(3);
      const format = svg?.at(2);
      const style = svg?.at(-1);

      let destination = `https://fontawesome.com/icons/${icon}?s=${style}&f=${format}`;
      if (!format || !icon || !style) {
        const newRegex = /^(icon)-(\w+)-(\w+(-\w+)*)-$/;
        const match = articles[i]?.match(newRegex);
        destination = `https://fontawesome.com/icons/${match?.at(3)}?s=&f=brands`;
        const start = destination.lastIndexOf('/');
        const end = destination.indexOf('?');
        icon = destination.slice(start + 1, end);
      }
      console.log(destination);
      const newPage = await browser.newPage();
      await newPage.goto(destination, { waitUntil: 'networkidle2' });

      await newPage.waitForSelector('button[aria-label="Copy SVG code"]')
      await newPage.click('button[aria-label="Copy SVG code"]');

      const svgCode = await newPage.evaluate(() => navigator.clipboard.readText());
      const fileContent = '<script lang=\'ts\'>\n export let color = "white";\n</script>\n\n' + svgCode.replace('<path', '<path fill="{color}"');

      fs.writeFile(`./svg/Icon${kebabToPascal(icon)}.svelte`, fileContent, (err) => console.log(err, 'At:', i));
      await newPage.close();
    }
  }
  await browser.close();
};

const kebabToPascal = (str: string) => {
  return str.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join('');
};

launchFaBot();