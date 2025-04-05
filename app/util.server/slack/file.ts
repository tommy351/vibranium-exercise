import { SLACK_TOKEN } from "./config";

export async function getFileContent(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      authorization: `Bearer ${SLACK_TOKEN}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch file: ${url}`);
  }

  const text = await res.text();

  return text;
}
