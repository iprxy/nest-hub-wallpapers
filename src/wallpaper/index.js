import fs from 'node:fs/promises';
import puppeteer from 'puppeteer';
import { getTodayHabitsData, getTodayTasksData } from '../notion';

const getPath = (fileOrFolder) => new URL(fileOrFolder, import.meta.url).pathname;

const getFile = async () => {
  const habits = await getTodayHabitsData();
  const tasks = await getTodayTasksData();

  const habitsBody = `<h1>💪 Habits</h1>${habits
    .map(({ name, checked }) => `<p>${checked ? '✅' : '❌'} ${name}</p>`)
    .join('')}`;
  const tasksBody = `<h1>🙅‍♂️ Tasks</h1>${tasks
    .map(({ title, checked }) => `<p>${checked ? '✅' : '❌'} ${title}</p>`)
    .join('')}`;

  const template = await fs.readFile('./template.html', 'utf-8');

  const values = { habitsBody, tasksBody };

  return template.replace(
    /{{(.*?)}}/g,
    (match, placeholder) => values[placeholder.trim()] ?? match,
  );
};

export default async function shotPage() {
  const file = await getFile();
  await fs.writeFile(getPath('../../temp/index.html'), file);
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: './chromium',
    args: ['--disable-web-security', '--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36',
  );

  await page.setViewport({ width: 1536, height: 900 });

  await page.goto(`file://${getPath('../../temp/index.html')}`, { waitUntil: 'networkidle0' });
  const screenshot = await page.screenshot();

  await browser.close();

  return screenshot;
}
