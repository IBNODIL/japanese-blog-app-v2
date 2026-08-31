"use client";

import { TiptapEditor } from "@/components/editor/tiptap-editor";

interface PostContentProps {
  content: unknown;
}

export function PostContent({ content }: PostContentProps) {
  // Pass content directly as object if it's a TipTap JSON doc, or as string
  const editorContent = typeof content === "object" && content !== null
    ? content
    : typeof content === "string"
    ? content
    : "";

  return <TiptapEditor content={editorContent} editable={false} />;
}
