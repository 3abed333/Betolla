import { cn } from "@/lib/cn";

export function RichContent({ html, className }: { html: string; className?: string }) {
  return (
    <div
      className={cn(
        "text-ink [&_a]:font-medium [&_a]:text-cta [&_a]:underline [&_blockquote]:border-s-4 [&_blockquote]:border-cta [&_blockquote]:ps-4",
        "[&_h2]:mt-8 [&_h2]:font-heading [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:font-heading [&_h3]:text-xl [&_h3]:font-semibold",
        "[&_li]:ms-6 [&_ol]:my-4 [&_ol]:list-decimal [&_p]:my-4 [&_table]:my-5 [&_table]:w-full [&_table]:border-collapse",
        "[&_td]:border [&_td]:border-border [&_td]:p-3 [&_th]:border [&_th]:border-border [&_th]:bg-surface-secondary [&_th]:p-3",
        "[&_ul]:my-4 [&_ul]:list-disc",
        className,
      )}
      // Only server-sanitized database HTML is passed to this component.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
