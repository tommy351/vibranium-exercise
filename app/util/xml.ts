import escapeRegex from "escape-string-regexp";

const escapeChars = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};
const unescapeChars = Object.fromEntries(
  Object.entries(escapeChars).map(([k, v]) => [v, k]),
);
export const escapeXml = createReplacer(escapeChars);
export const unescapeXml = createReplacer(unescapeChars);

function createReplacer(chars: Record<string, string>) {
  const pattern = new RegExp(
    `[${Object.keys(chars).map(escapeRegex).join("")}]`,
    "g",
  );

  return (input: string) =>
    input.replace(pattern, (match) => chars[match] || match);
}
