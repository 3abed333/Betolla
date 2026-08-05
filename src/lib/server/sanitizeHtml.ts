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
  "details",
  "summary",
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

// `style` values are still restricted below (SAFE_STYLE_VALUE) - this only gates *which* CSS
// properties may appear at all, not what the values contain.
const STYLE_PROPERTIES = [
  "color",
  "background",
  "background-color",
  "border",
  "border-color",
  "border-width",
  "border-style",
  "border-radius",
  "border-top",
  "border-right",
  "border-bottom",
  "border-left",
  "padding",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "margin",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "font-size",
  "font-weight",
  "font-style",
  "text-align",
  "text-decoration",
  "line-height",
  "width",
  "max-width",
  "min-width",
  "display",
  "gap",
  "letter-spacing",
];

// Blocks the known CSS-injection vectors (remote/script URLs, legacy IE `expression()`,
// `@import`, stray markup) while still allowing ordinary values like colors, units and keywords.
const SAFE_STYLE_VALUE = /^(?!.*(?:url\(|expression\(|javascript:|import\b|[<>;])).{1,300}$/i;

const ALLOWED_STYLES = {
  "*": Object.fromEntries(STYLE_PROPERTIES.map((property) => [property, [SAFE_STYLE_VALUE]])),
};

/**
 * Rich content is always sanitized on the server before it reaches the database.
 * Scripts, event handlers, forms, iframes, embedded media and unsafe URL schemes are removed.
 */
export function sanitizeRichHtml(value: string) {
  return sanitizeHtmlLibrary(value, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      details: ["open"],
      "*": ["class", "dir", "lang", "style"],
    },
    allowedStyles: ALLOWED_STYLES,
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
