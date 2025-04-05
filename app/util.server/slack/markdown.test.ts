import { describe, expect, it } from "vitest";
import { generateBlocksFromMarkdown } from "./markdown";
import type { HeaderBlock, RichTextBlock } from "@slack/web-api";

describe("generateBlocksFromMarkdown", () => {
  it("one sentence with some inline elements", () => {
    const actual = generateBlocksFromMarkdown(
      "This is a **bold** and _italic_ text.",
    );
    const expected: RichTextBlock[] = [
      {
        type: "rich_text",
        elements: [
          {
            type: "rich_text_section",
            elements: [
              {
                type: "text",
                text: "This is a ",
              },
              {
                type: "text",
                text: "bold",
                style: {
                  bold: true,
                },
              },
              {
                type: "text",
                text: " and ",
              },
              {
                type: "text",
                text: "italic",
                style: {
                  italic: true,
                },
              },
              {
                type: "text",
                text: " text.",
              },
            ],
          },
        ],
      },
    ];

    expect(actual).toEqual(expected);
  });

  it("bold", () => {
    const actual = generateBlocksFromMarkdown("**bold**");
    const expected: RichTextBlock[] = [
      {
        type: "rich_text",
        elements: [
          {
            type: "rich_text_section",
            elements: [
              {
                type: "text",
                text: "bold",
                style: {
                  bold: true,
                },
              },
            ],
          },
        ],
      },
    ];

    expect(actual).toEqual(expected);
  });

  it("italic", () => {
    const actual = generateBlocksFromMarkdown("_italic_");
    const expected: RichTextBlock[] = [
      {
        type: "rich_text",
        elements: [
          {
            type: "rich_text_section",
            elements: [
              {
                type: "text",
                text: "italic",
                style: {
                  italic: true,
                },
              },
            ],
          },
        ],
      },
    ];

    expect(actual).toEqual(expected);
  });

  it("strike", () => {
    const actual = generateBlocksFromMarkdown("~~strike~~");
    const expected: RichTextBlock[] = [
      {
        type: "rich_text",
        elements: [
          {
            type: "rich_text_section",
            elements: [
              {
                type: "text",
                text: "strike",
                style: {
                  strike: true,
                },
              },
            ],
          },
        ],
      },
    ];

    expect(actual).toEqual(expected);
  });

  it("inline code", () => {
    const actual = generateBlocksFromMarkdown("`inline code`");
    const expected: RichTextBlock[] = [
      {
        type: "rich_text",
        elements: [
          {
            type: "rich_text_section",
            elements: [
              {
                type: "text",
                text: "inline code",
                style: {
                  code: true,
                },
              },
            ],
          },
        ],
      },
    ];

    expect(actual).toEqual(expected);
  });

  it("multiple paragraphs", () => {
    const actual = generateBlocksFromMarkdown(
      ["Paragraph 1", "Paragraph 2", "Paragraph 3"].join("\n\n"),
    );
    const expected: RichTextBlock[] = [
      {
        type: "rich_text",
        elements: [
          {
            type: "rich_text_section",
            elements: [{ type: "text", text: "Paragraph 1" }],
          },
        ],
      },
      {
        type: "rich_text",
        elements: [
          {
            type: "rich_text_section",
            elements: [{ type: "text", text: "Paragraph 2" }],
          },
        ],
      },
      {
        type: "rich_text",
        elements: [
          {
            type: "rich_text_section",
            elements: [{ type: "text", text: "Paragraph 3" }],
          },
        ],
      },
    ];

    expect(actual).toEqual(expected);
  });

  it("heading", () => {
    const actual = generateBlocksFromMarkdown(
      [
        "# Heading 1",
        "## Heading 2",
        "### Heading 3",
        "#### Heading 4",
        "##### Heading 5",
        "###### Heading 6",
      ].join("\n\n"),
    );
    const expected: HeaderBlock[] = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "Heading 1",
        },
      },
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "Heading 2",
        },
      },
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "Heading 3",
        },
      },
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "Heading 4",
        },
      },
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "Heading 5",
        },
      },
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "Heading 6",
        },
      },
    ];

    expect(actual).toEqual(expected);
  });

  it("heading contains styled text", () => {
    const actual = generateBlocksFromMarkdown("# A **bold** heading");
    const expected = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "A bold heading",
        },
      },
    ];

    expect(actual).toEqual(expected);
  });

  it("quote", () => {
    const actual = generateBlocksFromMarkdown("> A **bold** quote");
    const expected: RichTextBlock[] = [
      {
        type: "rich_text",
        elements: [
          {
            type: "rich_text_quote",
            elements: [
              {
                type: "text",
                text: "A ",
                style: {},
              },
              {
                type: "text",
                text: "bold",
                style: { bold: true },
              },
              {
                type: "text",
                text: " quote",
                style: {},
              },
            ],
          },
        ],
      },
    ];

    expect(actual).toEqual(expected);
  });

  it("nested inline elements", () => {
    const actual = generateBlocksFromMarkdown("**Bold `code`**");
    const expected: RichTextBlock[] = [
      {
        type: "rich_text",
        elements: [
          {
            type: "rich_text_section",
            elements: [
              {
                type: "text",
                text: "Bold ",
                style: { bold: true },
              },
              {
                type: "text",
                text: "code",
                style: { bold: true, code: true },
              },
            ],
          },
        ],
      },
    ];

    expect(actual).toEqual(expected);
  });

  it("code block", () => {
    const actual = generateBlocksFromMarkdown(
      ["```", `console.log("Hello world")`, "```"].join("\n"),
    );
    const expected: RichTextBlock[] = [
      {
        type: "rich_text",
        elements: [
          {
            type: "rich_text_preformatted",
            elements: [
              {
                type: "text",
                text: `console.log("Hello world")`,
              },
            ],
          },
        ],
      },
    ];

    expect(actual).toEqual(expected);
  });

  it("ordered list", () => {
    const actual = generateBlocksFromMarkdown(
      ["1. One", "2. Two", "3. Three"].join("\n"),
    );
    const expected: RichTextBlock[] = [
      {
        type: "rich_text",
        elements: [
          {
            type: "rich_text_list",
            style: "ordered",
            elements: [
              {
                type: "rich_text_section",
                elements: [
                  {
                    type: "text",
                    text: "One",
                    style: {},
                  },
                ],
              },
              {
                type: "rich_text_section",
                elements: [
                  {
                    type: "text",
                    text: "Two",
                    style: {},
                  },
                ],
              },
              {
                type: "rich_text_section",
                elements: [
                  {
                    type: "text",
                    text: "Three",
                    style: {},
                  },
                ],
              },
            ],
          },
        ],
      },
    ];

    expect(actual).toEqual(expected);
  });

  it("unordered list", () => {
    const actual = generateBlocksFromMarkdown(
      ["- One", "- Two", "- Three"].join("\n"),
    );
    const expected: RichTextBlock[] = [
      {
        type: "rich_text",
        elements: [
          {
            type: "rich_text_list",
            style: "bullet",
            elements: [
              {
                type: "rich_text_section",
                elements: [
                  {
                    type: "text",
                    text: "One",
                    style: {},
                  },
                ],
              },
              {
                type: "rich_text_section",
                elements: [
                  {
                    type: "text",
                    text: "Two",
                    style: {},
                  },
                ],
              },
              {
                type: "rich_text_section",
                elements: [
                  {
                    type: "text",
                    text: "Three",
                    style: {},
                  },
                ],
              },
            ],
          },
        ],
      },
    ];

    expect(actual).toEqual(expected);
  });

  it("text style in list", () => {
    const actual = generateBlocksFromMarkdown("- **Bold**");
    const expected: RichTextBlock[] = [
      {
        type: "rich_text",
        elements: [
          {
            type: "rich_text_list",
            style: "bullet",
            elements: [
              {
                type: "rich_text_section",
                elements: [
                  {
                    type: "text",
                    text: "Bold",
                    style: {
                      bold: true,
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    ];

    expect(actual).toEqual(expected);
  });
});
