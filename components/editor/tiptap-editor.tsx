"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import type { SingleCommands, CommandProps } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Color from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { common, createLowlight } from "lowlight";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
  Undo,
  Redo,
  Palette,
  Highlighter,
  FileText,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import "./tiptap-editor.css";

const lowlight = createLowlight(common);

// Type augmentation for the custom image commands added below via
// addCommands() — lets TypeScript know editor.chain().setImageAlign(...)
// etc. exist, so call sites don't need `as any`.
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    customImage: {
      setImageWidth: (width: number | null) => ReturnType;
      setImageHeight: (height: number | null) => ReturnType;
      setImageAlign: (align: "left" | "right" | "center") => ReturnType;
      setImageCaption: (caption: string) => ReturnType;
    };
  }
}

interface TiptapEditorProps {
  content?: string | object;
  onChange?: (content: string) => void;
  placeholder?: string;
  editable?: boolean;
}

export function TiptapEditor({
  content,
  onChange,
  placeholder,
  editable = true,
}: TiptapEditorProps) {
  console.log("🎯 TiptapEditor component rendering");
  const t = useTranslations("editor");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableColumns, setTableColumns] = useState(3);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const highlightPickerRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const savedSelectionRef = useRef<any>(null);

  const imageResizeStateRef = useRef<{
    image: HTMLImageElement | null;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    aspectRatio: number;
  }>({
    image: null,
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0,
    aspectRatio: 1,
  });

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        link: false,
      }),
      Underline,
      TextStyle.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            backgroundColor: {
              default: null,
              parseHTML: element => ({
                backgroundColor: element.style.backgroundColor || null,
              }),
              renderHTML: attributes => {
                if (!attributes.backgroundColor) {
                  return {}
                }

                return {
                  style: `background-color: ${attributes.backgroundColor}`,
                }
              },
            },
          }
        },
        addCommands() {
          return {
            ...this.parent?.(),
            setBackgroundColor: (color: string) => ({ commands }) => {
              return commands.setMark('textStyle', { backgroundColor: color })
            },
            unsetBackgroundColor: () => ({ commands }) => {
              return commands.unsetMark('textStyle')
            },
          }
        },
      }),
      Color,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-primary underline cursor-pointer" },
      }),
      Image.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            width: {
              default: null,
              parseHTML: element => {
                const widthStr = element.style.width || element.getAttribute('data-width');
                return widthStr ? parseInt(widthStr) : null;
              },
              renderHTML: attributes => {
                if (!attributes.width) return {};
                return { style: `width: ${attributes.width}px`, 'data-width': attributes.width };
              },
            },
            height: {
              default: null,
              parseHTML: element => {
                const heightStr = element.style.height || element.getAttribute('data-height');
                return heightStr ? parseInt(heightStr) : null;
              },
              renderHTML: attributes => {
                if (!attributes.height) return {};
                return { style: `height: ${attributes.height}px`, 'data-height': attributes.height };
              },
            },
            align: {
              default: 'center',
              parseHTML: element => element.getAttribute('data-align') || 'center',
              renderHTML: attributes => ({ 'data-align': attributes.align || 'center' }),
            },
            caption: {
              default: '',
              parseHTML: element => element.getAttribute('data-caption') || '',
              renderHTML: attributes => ({ 'data-caption': attributes.caption || '' }),
            },
          };
        },
        addCommands() {
          return {
            ...this.parent?.(),
            setImageWidth: (width: number | null) => ({ commands }: { commands: SingleCommands }) => {
              return commands.updateAttributes('image', { width });
            },
            setImageHeight: (height: number | null) => ({ commands }: { commands: SingleCommands }) => {
              return commands.updateAttributes('image', { height });
            },
            setImageAlign: (align: 'left' | 'right' | 'center') => ({ commands }: { commands: SingleCommands }) => {
              return commands.updateAttributes('image', { align });
            },
            setImageCaption: (caption: string) => ({ commands }: { commands: SingleCommands }) => {
              return commands.updateAttributes('image', { caption });
            },
          };
        },
      }).configure({
        HTMLAttributes: { class: "rounded-lg" },
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: "bg-slate-900 text-slate-50 rounded-lg",
        },
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell.configure({
        HTMLAttributes: {
          class: "border border-border px-4 py-2",
        },
      }),
      Placeholder.configure({ placeholder: placeholder || t("startWriting") }),
    ],
    content: (() => {
      if (!content) return "";
      if (typeof content === "object") return content;
      try {
        return JSON.parse(content);
      } catch {
        return content;
      }
    })(),
    onUpdate: ({ editor }) => {
      onChange?.(JSON.stringify(editor.getJSON()));
    },
    editable: editable,
  });

  const editorRef = useRef(editor);
  const onChangeRef = useRef(onChange);

  // Keep refs updated
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!editor) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        colorPickerRef.current &&
        !colorPickerRef.current.contains(e.target as Node)
      ) {
        setShowColorPicker(false);
      }
      if (
        highlightPickerRef.current &&
        !highlightPickerRef.current.contains(e.target as Node)
      ) {
        setShowHighlightPicker(false);
      }
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(e.target as Node)
      ) {
        setContextMenu(null);
      }
    };

    const handleAnyClick = () => {
      setContextMenu(null);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("click", handleAnyClick, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("click", handleAnyClick, true);
    };
  }, [editor]);

  // Image Resizer and Delete Handler
  useEffect(() => {
    if (!editor || !editable) return;

    const setupImageHandles = () => {
      try {
        const editorElement = document.querySelector('[contenteditable="true"]');
        if (!editorElement) return;

        const images = editorElement.querySelectorAll("img");
        
        images.forEach((img: Element) => {
          const htmlImg = img as HTMLImageElement;
          
          // Skip if already setup
          if (htmlImg.dataset.resizable === "true") return;
          
          // Mark as resizable (triggers ::after pseudo-element in CSS)
          htmlImg.dataset.resizable = "true";
          
          // Critical: Ensure inline-block display so ::after is positioned relative to image size only
          htmlImg.style.display = "inline-block";
          htmlImg.style.position = "relative";
          htmlImg.style.maxWidth = "100%";
          htmlImg.style.height = "auto";
          
          // Attach mousedown listener directly to image for resize
          htmlImg.addEventListener("mousedown", (e: MouseEvent) => {
            // Check if click is on the resize handle area (bottom-right corner)
            const rect = htmlImg.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;
            
            // Handle area is in bottom-right (approximately 30x30 px area)
            const isOnHandle = clickX > rect.width - 30 && clickY > rect.height - 30;
            
            if (!isOnHandle) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            const state = imageResizeStateRef.current;
            state.image = htmlImg;
            state.startX = e.clientX;
            state.startY = e.clientY;
            state.startWidth = htmlImg.offsetWidth;
            state.startHeight = htmlImg.offsetHeight;
            state.aspectRatio = state.startWidth / state.startHeight;
            
            htmlImg.style.userSelect = "none";
          });
        });
      } catch (err) {
        console.error("❌ Error in setupImageHandles:", err);
      }
    };
    
    // Check for new images periodically
    const checkInterval = setInterval(setupImageHandles, 500);
    
    setupImageHandles();
    
    return () => {
      clearInterval(checkInterval);
    };
  }, [editor, editable, onChange]);

  // Handle image resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const state = imageResizeStateRef.current;
      if (!state.image) return;

      const deltaX = e.clientX - state.startX;
      const deltaY = e.clientY - state.startY;

      // Always maintain aspect ratio - use the larger delta to determine resize direction
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);
      
      // Use the direction with the most movement
      let newWidth: number;
      if (absDeltaX >= absDeltaY) {
        // Resizing primarily by width
        newWidth = Math.max(50, state.startWidth + deltaX);
      } else {
        // Resizing primarily by height
        const newHeight = Math.max(50, state.startHeight + deltaY);
        newWidth = newHeight * state.aspectRatio;
      }
      
      // Always calculate height from width to maintain aspect ratio
      const newHeight = newWidth / state.aspectRatio;

      state.image.style.width = `${newWidth}px`;
      state.image.style.height = `${newHeight}px`;
    };

    const handleMouseUp = () => {
      const state = imageResizeStateRef.current;
      if (!state.image || !editorRef.current) return;

      const newWidth = Math.round(state.image.offsetWidth);
      const newHeight = Math.round(state.image.offsetHeight);

      editorRef.current.chain().focus().command(({ tr, state: editorState }: CommandProps) => {
        if (!state.image) return true;
        editorState.doc.descendants((node: ProseMirrorNode, pos: number) => {
          if (node.type.name === 'image' && node.attrs.src === state.image!.src) {
            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              width: newWidth,
              height: newHeight,
            });
          }
        });
        return true;
      }).run();

      if (onChangeRef.current && editorRef.current) {
        onChangeRef.current(JSON.stringify(editorRef.current.getJSON()));
      }

      const wrapper = state.image.parentElement;
      if (wrapper) {
        wrapper.style.userSelect = "auto";
      }
      state.image = null;
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [onChange]);

  // Handle keyboard delete for images
  useEffect(() => {
    if (!editor || !editable) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        const selection = editor.state.selection;
        editor.state.doc.nodesBetween(selection.from, selection.to, (node: ProseMirrorNode, pos: number) => {
          if (node.type.name === "image") {
            editor.chain().deleteRange({ from: pos, to: pos + node.nodeSize }).run();
            return false;
          }
        });
      }
    };

    const editorElement = document.querySelector("[contenteditable='true']");
    if (editorElement) {
      editorElement.addEventListener("keydown", handleKeyDown as EventListener);
      return () => {
        editorElement.removeEventListener("keydown", handleKeyDown as EventListener);
      };
    }
  }, [editor, editable]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;

    setLinkUrl(previousUrl || "");
    setShowLinkDialog(true);
  }, [editor]);

  const applyLink = useCallback(() => {
    if (!editor) return;

    if (linkUrl === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: linkUrl })
        .run();
    }

    setShowLinkDialog(false);
    setLinkUrl("");
  }, [editor, linkUrl]);

  const addImage = useCallback(() => {
    if (!editor) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      if (file.size > 10 * 1024 * 1024) {
        alert(t("imageTypes"));
        return;
      }

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/image-upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Upload failed");
        }

        const data = await response.json();
        editor.chain().focus().setImage({ src: data.url }).run();
      } catch (error) {
        console.error("Image upload error:", error);
        alert("Failed to upload image. Please try again.");
      }
    };
    input.click();
  }, [editor, t]);

  const clearFormatting = useCallback(() => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .clearNodes()
      .unsetAllMarks()
      .run();
  }, [editor]);

  const addFile = useCallback(() => {
    if (!editor) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.doc,.docx,.xls,.xlsx";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      if (file.size > 20 * 1024 * 1024) {
        alert("File size must be less than 20MB");
        return;
      }

      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ];

      if (!allowedTypes.includes(file.type)) {
        alert("Only PDF, DOC, DOCX, XLS, XLSX files are allowed");
        return;
      }

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/file-upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Upload failed");
        }

        const data = await response.json();
        editor
          .chain()
          .focus()
          .insertContent(
            `<a href="${data.url}" download="${data.originalName}" class="text-primary underline">${data.originalName}</a>`
          )
          .run();
      } catch (error) {
        console.error("File upload error:", error);
        alert("Failed to upload file. Please try again.");
      }
    };
    input.click();
  }, [editor]);

  const insertTable = useCallback(() => {
    if (!editor) return;
    setShowTableDialog(false);
    editor
      .chain()
      .focus()
      .insertTable({ rows: tableRows, cols: tableColumns, withHeaderRow: true })
      .run();
  }, [editor, tableRows, tableColumns]);

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!editable) return;
    e.preventDefault();
    // Save selection before showing context menu
    if (editor) {
      savedSelectionRef.current = editor.state.selection;
    }
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const applyFormatting = (command: () => any) => {
    if (!editor) return;
    // Using onMouseDown with preventDefault ensures selection is preserved
    command();
  };

  if (!editor) return null;

  const PRESET_COLORS = [
    "#000000",
    "#374151",
    "#DC2626",
    "#EA580C",
    "#D97706",
    "#16A34A",
    "#2563EB",
    "#7C3AED",
    "#DB2777",
    "#ffffff",
  ];

  const HIGHLIGHT_COLORS = [
    "#FEF08A",
    "#FED7AA",
    "#FBCA99",
    "#FBCFE8",
    "#F0ABFC",
    "#E9D5FF",
    "#DDD6FE",
    "#BFDBFE",
    "#A7F3D0",
    "#BBFB9F",
  ];

  return (
    <div className="rounded-lg border border-border">
      {editable && (
        <TooltipProvider>
          <div className="flex flex-wrap items-center gap-0.5 border-b border-border p-1">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={editor.isActive("bold") ? "bg-muted" : ""}
                  >
                    <Bold className="h-4 w-4" />
                  </Button>
                }
              />
              <TooltipContent>{t("bold")}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={editor.isActive("italic") ? "bg-muted" : ""}
                  >
                    <Italic className="h-4 w-4" />
                  </Button>
                }
              />
              <TooltipContent>{t("italic")}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    className={editor.isActive("underline") ? "bg-muted" : ""}
                  >
                    <UnderlineIcon className="h-4 w-4" />
                  </Button>
                }
              />
              <TooltipContent>{t("underline")}</TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="mx-1 h-6" />

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() =>
                      editor.chain().focus().toggleHeading({ level: 1 }).run()
                    }
                    className={
                      editor.isActive("heading", { level: 1 }) ? "bg-muted" : ""
                    }
                  >
                    <Heading1 className="h-4 w-4" />
                  </Button>
                }
              />
              <TooltipContent>{t("heading1")}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() =>
                      editor.chain().focus().toggleHeading({ level: 2 }).run()
                    }
                    className={
                      editor.isActive("heading", { level: 2 }) ? "bg-muted" : ""
                    }
                  >
                    <Heading2 className="h-4 w-4" />
                  </Button>
                }
              />
              <TooltipContent>{t("heading2")}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() =>
                      editor.chain().focus().toggleHeading({ level: 3 }).run()
                    }
                    className={
                      editor.isActive("heading", { level: 3 }) ? "bg-muted" : ""
                    }
                  >
                    <Heading3 className="h-4 w-4" />
                  </Button>
                }
              />
              <TooltipContent>{t("heading3")}</TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="mx-1 h-6" />

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => {
                      editor.chain().focus().toggleBulletList().run();
                    }}
                    className={editor.isActive("bulletList") ? "bg-muted" : ""}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                }
              />
              <TooltipContent>{t("bulletList")}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() =>
                      editor.chain().focus().toggleOrderedList().run()
                    }
                    className={editor.isActive("orderedList") ? "bg-muted" : ""}
                  >
                    <ListOrdered className="h-4 w-4" />
                  </Button>
                }
              />
              <TooltipContent>{t("orderedList")}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() =>
                      editor.chain().focus().toggleBlockquote().run()
                    }
                    className={editor.isActive("blockquote") ? "bg-muted" : ""}
                  >
                    <Quote className="h-4 w-4" />
                  </Button>
                }
              />
              <TooltipContent>{t("blockquote")}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() =>
                      editor.chain().focus().toggleCodeBlock().run()
                    }
                    className={editor.isActive("codeBlock") ? "bg-muted" : ""}
                  >
                    <Code className="h-4 w-4" />
                  </Button>
                }
              />
              <TooltipContent>{t("codeBlock")}</TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="mx-1 h-6" />

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={setLink}
                    className={editor.isActive("link") ? "bg-muted" : ""}
                  >
                    <LinkIcon className="h-4 w-4" />
                  </Button>
                }
              />
              <TooltipContent>{t("insertLink")}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={addImage}
                  >
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                }
              />
              <TooltipContent>{t("insertImage")}</TooltipContent>
            </Tooltip>

            {/* Image Alignment Buttons */}
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => editor.chain().focus().setImageAlign('left').run()}
                    className={editor.getAttributes('image').align === 'left' ? "bg-muted" : ""}
                  >
                    <AlignLeft className="h-4 w-4" />
                  </Button>
                }
              />
              <TooltipContent>Align Left</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => editor.chain().focus().setImageAlign('center').run()}
                    className={editor.getAttributes('image').align === 'center' ? "bg-muted" : ""}
                  >
                    <AlignCenter className="h-4 w-4" />
                  </Button>
                }
              />
              <TooltipContent>Align Center</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => editor.chain().focus().setImageAlign('right').run()}
                    className={editor.getAttributes('image').align === 'right' ? "bg-muted" : ""}
                  >
                    <AlignRight className="h-4 w-4" />
                  </Button>
                }
              />
              <TooltipContent>Align Right</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => setShowTableDialog(true)}
                  >
                    <TableIcon className="h-4 w-4" />
                  </Button>
                }
              />
              <TooltipContent>{t("insertTable")}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={addFile}
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                }
              />
              <TooltipContent>{t("insertFile")}</TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="mx-1 h-6" />

            {/* Color Picker */}
            <div className="relative" ref={colorPickerRef}>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => setShowColorPicker(!showColorPicker)}
                    >
                      <Palette className="h-4 w-4" />
                    </Button>
                  }
                />
                <TooltipContent>{t("textColor")}</TooltipContent>
              </Tooltip>

              {showColorPicker && (
                <div className="absolute top-full left-0 z-50 mt-1 min-w-56 rounded-lg border border-border bg-popover p-3 shadow-md">
                  <div className="mb-3 grid grid-cols-5 gap-2">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className="h-8 w-8 rounded border-2 border-border transition-all hover:border-primary hover:scale-110"
                        style={{ backgroundColor: color }}
                        onClick={() => {
                          editor.chain().focus().setColor(color).run();
                          setShowColorPicker(false);
                        }}
                        title={color}
                      />
                    ))}
                  </div>

                  <div className="mb-2 flex items-center gap-2">
                    <input
                      type="color"
                      className="h-8 w-12 cursor-pointer rounded border border-border"
                      value={editor.getAttributes("textStyle").color || "#000000"}
                      onChange={(e) => {
                        editor.chain().focus().setColor(e.target.value).run();
                      }}
                    />
                    <span className="text-xs text-muted-foreground flex-1">{t("custom")}</span>
                  </div>

                  <button
                    type="button"
                    className="w-full rounded px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted"
                    onClick={() => {
                      editor.chain().focus().unsetColor().run();
                      setShowColorPicker(false);
                    }}
                  >
                    {t("cancel")}
                  </button>
                </div>
              )}
            </div>

            {/* Highlight/Mark Picker */}
            <div className="relative" ref={highlightPickerRef}>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => setShowHighlightPicker(!showHighlightPicker)}
                    >
                      <Highlighter className="h-4 w-4" />
                    </Button>
                  }
                />
                <TooltipContent>{t("mark")}</TooltipContent>
              </Tooltip>

              {showHighlightPicker && (
                <div className="absolute top-full left-0 z-50 mt-1 min-w-56 rounded-lg border border-border bg-popover p-3 shadow-md">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Select text to highlight</p>
                  <div className="mb-2 grid grid-cols-5 gap-2">
                    {HIGHLIGHT_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className="h-8 w-8 rounded border-2 border-border transition-all hover:border-primary hover:scale-110"
                        style={{ backgroundColor: color }}
                        onClick={() => {
                          const { from, to } = editor.state.selection;
                          if (from !== to) {
                            // Create mark with background color
                            editor
                              .chain()
                              .focus()
                              .command(({ tr, state }) => {
                                const { from: selFrom, to: selTo } = state.selection;
                                // Apply the text style mark with background color
                                tr.addMark(
                                  selFrom,
                                  selTo,
                                  state.schema.marks.textStyle.create({
                                    backgroundColor: color
                                  })
                                );
                                return true;
                              })
                              .run();
                          }
                          setShowHighlightPicker(false);
                        }}
                        title={color}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    className="mb-2 w-full rounded px-2 py-1.5 text-xs bg-destructive/10 text-destructive hover:bg-destructive/20"
                    onClick={() => {
                      editor
                        .chain()
                        .focus()
                        .command(({ tr, state }) => {
                          const { from, to } = state.selection;
                          if (from !== to) {
                            tr.removeMark(from, to, state.schema.marks.textStyle);
                          }
                          return true;
                        })
                        .run();
                      setShowHighlightPicker(false);
                    }}
                  >
                    Remove Highlight
                  </button>

                  <button
                    type="button"
                    className="w-full rounded px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted"
                    onClick={() => {
                      setShowHighlightPicker(false);
                    }}
                  >
                    {t("cancel")}
                  </button>
                </div>
              )}
            </div>

            <Separator orientation="vertical" className="mx-1 h-6" />

            {/* Undo/Redo */}
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                  >
                    <Undo className="h-4 w-4" />
                  </Button>
                }
              />
              <TooltipContent>{t("undo")}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                  >
                    <Redo className="h-4 w-4" />
                  </Button>
                }
              />
              <TooltipContent>{t("redo")}</TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="mx-1 h-6" />

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={clearFormatting}
                  >
                    <span className="text-xs font-bold">Clear</span>
                  </Button>
                }
              />
              <TooltipContent>Remove all styles</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      )}

      <div className="relative p-4" onContextMenu={handleContextMenu} onClick={() => setContextMenu(null)}>
        <EditorContent editor={editor} className="prose dark:prose-invert max-w-none" />

        {/* Context Menu */}
        {contextMenu && editable && (
          <div
            ref={contextMenuRef}
            className="fixed z-50 min-w-40 rounded-md border border-border bg-popover p-1 shadow-md"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={() => setContextMenu(null)}
          >
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                applyFormatting(() => editor.chain().focus().toggleBold().run());
                setContextMenu(null);
              }}
            >
              <Bold className="h-3.5 w-3.5" />
              {t("bold")}
            </button>

            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                applyFormatting(() => editor.chain().focus().toggleItalic().run());
                setContextMenu(null);
              }}
            >
              <Italic className="h-3.5 w-3.5" />
              {t("italic")}
            </button>

            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                applyFormatting(() => editor.chain().focus().toggleUnderline().run());
                setContextMenu(null);
              }}
            >
              <UnderlineIcon className="h-3.5 w-3.5" />
              {t("underline")}
            </button>

            <div className="my-1 h-px bg-border" />

            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setContextMenu(null);
                setLink();
              }}
            >
              <LinkIcon className="h-3.5 w-3.5" />
              {t("insertLink")}
            </button>

            <div className="my-1 h-px bg-border" />

            <div className="px-2 py-1.5">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Palette className="h-3.5 w-3.5" />
                {t("textColor")}
              </span>
              <div className="mt-1 grid grid-cols-5 gap-1">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="h-5 w-5 rounded border border-border transition-transform hover:scale-110"
                    style={{ backgroundColor: color }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      applyFormatting(() => editor.chain().focus().setColor(color).run());
                      setContextMenu(null);
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("insertLink")}</DialogTitle>
            <DialogDescription>{t("insertLink")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="link-url">URL</Label>
              <Input
                id="link-url"
                type="url"
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowLinkDialog(false)}
            >
              {t("cancel")}
            </Button>
            <Button type="button" onClick={applyLink}>
              {t("apply")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Table Dialog */}
      <Dialog open={showTableDialog} onOpenChange={setShowTableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("tableConfig")}</DialogTitle>
            <DialogDescription>{t("tableConfig")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="table-rows">{t("rows")}</Label>
              <Input
                id="table-rows"
                type="number"
                min="1"
                max="20"
                value={tableRows}
                onChange={(e) => setTableRows(parseInt(e.target.value) || 3)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="table-cols">{t("columns")}</Label>
              <Input
                id="table-cols"
                type="number"
                min="1"
                max="20"
                value={tableColumns}
                onChange={(e) => setTableColumns(parseInt(e.target.value) || 3)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowTableDialog(false)}
            >
              {t("cancel")}
            </Button>
            <Button type="button" onClick={insertTable}>
              {t("apply")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
