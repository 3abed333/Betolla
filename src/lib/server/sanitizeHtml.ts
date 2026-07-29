import sanitizeHtmlLibrary from "sanitize-html";

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "blockquote",
  "ul",
  "ol",
  "li",
  "h2",
  "h3",
  "h4",
  "a",
  "span",
  "div",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "hr",
  "code",
  "pre",
];

/**
 * Rich content is always sanitized on the server before it reaches the database.
 * Scripts, event handlers, forms, iframes, embedded media and unsafe URL schemes are removed.
 */
export function sanitizeRichHtml(value: string) {
  return sanitizeHtmlLibrary(value, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      "*": ["class", "dir", "lang"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowProtocolRelative: false,
    transformTags: {
      a: (_tagName, attribs) => ({
        tagName: "a",
        attribs: {
          ...attribs,
          ...(attribs.target === "_blank" ? { rel: "noopener noreferrer" } : {}),
        },
      }),
    },
    disallowedTagsMode: "discard",
  }).trim();
}
