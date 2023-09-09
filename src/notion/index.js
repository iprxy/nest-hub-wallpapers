import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_API_KEY });

const { HABITS_DATABASE_ID, TODAY_TASKS_DATABASE_ID } = process.env;

export const getTodayHabitsData = async () => {
  const { results } = await notion.databases.query({ database_id: HABITS_DATABASE_ID });
  const todayTask = results[0];
  const propertyNames = Object.keys(todayTask?.properties);

  return propertyNames
    .filter((x) => todayTask.properties[x].type === 'checkbox')
    .map((i) => ({ name: i, checked: todayTask?.properties[i]?.checkbox }));
};

export const getTodayTasksData = async () => {
  const { results } = await notion.databases.query({
    database_id: TODAY_TASKS_DATABASE_ID,
    filter: { property: 'Tags', multi_select: { contains: 'daily' } },
  });
  const { id } = results[0];

  const pageData = await notion.blocks.children.list({ block_id: id });
  const todos = pageData.results
    .filter((x) => x.type === 'to_do' && x.to_do)
    .map(({ to_do: todo, to_do: { rich_text: text } }) => ({
      title: text[0]?.plain_text,
      checked: todo.checked,
    }));

  return todos;
};
