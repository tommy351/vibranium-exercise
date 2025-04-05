import type {
  HeaderBlock,
  RichTextBlock,
  RichTextElement,
  RichTextSection,
  RichTextStyleable,
  SectionBlock,
} from "@slack/web-api";
import { fromMarkdown } from "mdast-util-from-markdown";
import type {
  BlockContent,
  DefinitionContent,
  ListItem,
  PhrasingContent,
  RootContent,
} from "mdast";
import { gfmStrikethrough } from "micromark-extension-gfm-strikethrough";
import { gfmStrikethroughFromMarkdown } from "mdast-util-gfm-strikethrough";
import { toString } from "mdast-util-to-string";

type TextStyle = Required<RichTextStyleable>["style"];

function transformPhrasingContentChildren(
  children: PhrasingContent[],
  style: TextStyle,
): RichTextElement[] {
  return children.flatMap(transformPhrasingContent).map((node) => ({
    ...node,
    style: { ...node.style, ...style },
  }));
}

function transformPhrasingContent(content: PhrasingContent): RichTextElement[] {
  switch (content.type) {
    case "text":
      return [{ type: "text", text: content.value }];

    case "emphasis":
      return transformPhrasingContentChildren(content.children, {
        italic: true,
      });

    case "strong":
      return transformPhrasingContentChildren(content.children, {
        bold: true,
      });

    case "inlineCode":
      return [{ type: "text", text: content.value, style: { code: true } }];

    case "delete":
      return transformPhrasingContentChildren(content.children, {
        strike: true,
      });

    default:
      // Fallback to plain text
      return [{ type: "text", text: toString(content) }];
  }
}

function transformBlockContent(
  content: BlockContent | DefinitionContent,
): RichTextElement[] {
  // TODO: Handle heading & list
  switch (content.type) {
    case "paragraph":
      return transformPhrasingContentChildren(content.children, {});

    default:
      // Fallback to plain text
      return [{ type: "text", text: toString(content) }];
  }
}

function transformListItem(item: ListItem): RichTextSection {
  return {
    type: "rich_text_section",
    elements: item.children.flatMap(transformBlockContent),
  };
}

function transformRootContent(
  content: RootContent,
): (HeaderBlock | RichTextBlock | SectionBlock)[] {
  switch (content.type) {
    case "paragraph":
      return [
        {
          type: "rich_text",
          elements: [
            {
              type: "rich_text_section",
              elements: content.children.flatMap(transformPhrasingContent),
            },
          ],
        },
      ];

    case "heading": {
      const text = toString(content);

      // Maximum length is 150 characters
      if (text.length <= 150) {
        return [
          {
            type: "header",
            text: {
              type: "plain_text",
              text,
            },
          },
        ];
      }

      // Fallback to bold text
      return [
        {
          type: "rich_text",
          elements: [
            {
              type: "rich_text_section",
              elements: [
                {
                  type: "text",
                  text: text,
                  style: { bold: true },
                },
              ],
            },
          ],
        },
      ];
    }

    case "blockquote":
      return [
        {
          type: "rich_text",
          elements: [
            {
              type: "rich_text_quote",
              elements: content.children.flatMap(transformBlockContent),
            },
          ],
        },
      ];

    case "code":
      return [
        {
          type: "rich_text",
          elements: [
            {
              type: "rich_text_preformatted",
              elements: [
                {
                  type: "text",
                  text: content.value,
                },
              ],
            },
          ],
        },
      ];

    case "list":
      return [
        {
          type: "rich_text",
          elements: [
            {
              type: "rich_text_list",
              style: content.ordered ? "ordered" : "bullet",
              elements: content.children.map(transformListItem),
            },
          ],
        },
      ];

    default:
      // Fallback to plain text
      return [
        {
          type: "section",
          text: {
            type: "plain_text",
            text: toString(content),
          },
        },
      ];
  }
}

export function generateBlocksFromMarkdown(input: string) {
  const root = fromMarkdown(input, {
    extensions: [gfmStrikethrough()],
    mdastExtensions: [gfmStrikethroughFromMarkdown()],
  });

  return root.children.flatMap(transformRootContent);
}
