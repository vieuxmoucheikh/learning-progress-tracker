import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import Code from '@tiptap/extension-code';
import TextStyle from '@tiptap/extension-text-style';
import { Color as ColorExtension } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import { common, createLowlight } from 'lowlight';
import React, { useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  Bold,
  Italic,
  Code as CodeIcon,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Link as LinkIcon,
  Image as ImageIcon,
  Heading1,
  Heading2,
  Heading3,
  Type,
  Palette,
} from 'lucide-react';
import { Button } from './ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import DOMPurify from 'dompurify';

const lowlightInstance = createLowlight(common);

// Modification des palettes de couleurs pour une meilleure visibilité en mode sombre
const colors = [
  '#ffffff', '#f3f3f3', '#efefef', '#d9d9d9', '#cccccc', '#b7b7b7', '#999999', '#666666', '#434343', '#000000',
  '#ff8a8a', '#ff5252', '#ff7043', '#ffab40', '#ffeb3b', '#c6ff00', '#69f0ae', '#40c4ff', '#448aff', '#b388ff',
  '#f48fb1', '#e91e63', '#f44336', '#ff9800', '#ffc107', '#8bc34a', '#4caf50', '#03a9f4', '#2196f3', '#673ab7',
];

const bgColors = [
  '#ffffff', '#f8f9fa', '#e9ecef', '#dee2e6', '#ced4da', '#adb5bd', '#6c757d', '#495057', '#343a40', '#212529',
  '#ffebee', '#fce4ec', '#f3e5f5', '#ede7f6', '#e8eaf6', '#e3f2fd', '#e1f5fe', '#e0f7fa', '#e0f2f1', '#e8f5e9',
];

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  editable?: boolean;
  className?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  onChange,
  editable = true,
  className,
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
          HTMLAttributes: {
            'h1': {
              class: 'text-2xl font-bold text-gray-900 my-4',
            },
            'h2': {
              class: 'text-xl font-bold text-gray-900 my-3',
            },
            'h3': {
              class: 'text-lg font-bold text-gray-900 my-2',
            },
            class: 'font-bold text-gray-900', // Ceci s'applique à tous les niveaux de titre
          },
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
          HTMLAttributes: {
            class: 'list-disc ml-4',
          },
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
          HTMLAttributes: {
            class: 'list-decimal ml-4',
          },
        },
        blockquote: {
          HTMLAttributes: {
            class: 'border-l-4 border-blue-500 pl-4 my-4 italic text-gray-700 bg-blue-50/50',
          },
        },
        code: {
          HTMLAttributes: {
            class: 'bg-gray-50 text-gray-900 px-1 rounded font-mono text-sm',
          },
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'rounded-lg max-w-full h-auto my-4',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline underline-offset-2',
        },
      }),
      CodeBlockLowlight.configure({
        lowlight: lowlightInstance,
        HTMLAttributes: {
          class: 'bg-gray-50 text-gray-900 p-4 rounded-md border border-gray-200 font-mono text-sm my-4',
        },
      }),
      Code.configure({
        HTMLAttributes: {
          class: 'rounded bg-gray-200 px-1.5 py-0.5 font-mono text-sm',
        },
      }),
      TextStyle,
      ColorExtension,
      Highlight.configure({
        multicolor: true,
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm max-w-none",
          "min-h-[100px] outline-none",
          "[&_p]:text-gray-900 [&_p]:my-2",
          "[&_ul]:list-disc [&_ul]:ml-4",
          "[&_ol]:list-decimal [&_ol]:ml-4"
        ),
      }
      ,
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
              const base64 = e.target?.result as string;
              editor?.chain().focus().setImage({ src: base64 }).run();
            };
            reader.readAsDataURL(file);
            return true;
          }
        }
        return false;
      },
      handlePaste: (view, event) => {
        if (event.clipboardData && event.clipboardData.files && event.clipboardData.files[0]) {
          const file = event.clipboardData.files[0];
          if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
              const base64 = e.target?.result as string;
              editor?.chain().focus().setImage({ src: base64 }).run();
            };
            reader.readAsDataURL(file);
            return true;
          }
        }
        return false;
      },
    },
  });

  const handleClipboardEvent = (event: Event) => {
    const clipboardEvent = event as ClipboardEvent;
    event.preventDefault();
    const text = clipboardEvent.clipboardData?.getData('text/plain');
    const sanitizedContent = text ? DOMPurify.sanitize(text) : ''; // Sanitize the clipboard content
    editor?.chain().focus().insertContent(sanitizedContent).run();
  };

  useEffect(() => {
    const editorElement = document.querySelector('.editor');
    if (editorElement) {
      editorElement.addEventListener('paste', handleClipboardEvent);
    }
    return () => {
      if (editorElement) {
        editorElement.removeEventListener('paste', handleClipboardEvent);
      }
    };
  }, [editor]);

  const toggleLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = e.target?.result as string;
          editor?.chain().focus().setImage({ src: base64 }).run();
        };
        reader.readAsDataURL(file);
      }
    };
    
    input.click();
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className={cn(
      "rounded-lg border border-gray-200",
      "bg-white dark:bg-gray-800", // Ajout du style dark pour l'arrière-plan
      "relative flex flex-col",
      className
    )}>
      {editable && (
        <div className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex flex-wrap gap-1 p-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={cn(
                "hover:bg-gray-100",
                editor.isActive('bold') && "bg-gray-100 text-gray-900"
              )}
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={cn(
                "hover:bg-gray-100",
                editor.isActive('italic') && "bg-gray-100 text-gray-900"
              )}
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => editor.chain().focus().toggleCode().run()}
              className={cn(
                "hover:bg-gray-100",
                editor.isActive('code') && "bg-gray-100 text-gray-900"
              )}
            >
              <CodeIcon className="h-4 w-4" />
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Type className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-10 gap-1">
                  {colors.map((color) => (
                    <button
                      key={color}
                      className="w-5 h-5 rounded border border-gray-200 dark:border-gray-600 relative hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      onClick={() => editor.chain().focus().setColor(color).run()}
                      title={color}
                    >
                      {/* Indicateur de sélection */}
                      {editor.isActive('textStyle', { color }) && (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <span className="w-2 h-2 bg-gray-800 dark:bg-white rounded-full"></span>
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Palette className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-10 gap-1">
                  {bgColors.map((color) => (
                    <button
                      key={color}
                      className="w-5 h-5 rounded border border-gray-200 dark:border-gray-600 relative hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      onClick={() => editor.chain().focus().setHighlight({ color }).run()}
                      title={color}
                    >
                      {/* Indicateur de sélection */}
                      {editor.isActive('highlight', { color }) && (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <span className="w-2 h-2 bg-gray-800 dark:bg-white rounded-full"></span>
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <Button
              size="icon"
              variant="ghost"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={cn(
                "hover:bg-gray-100",
                editor.isActive('bulletList') && "bg-gray-100 text-gray-900"
              )}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={cn(
                "hover:bg-gray-100",
                editor.isActive('orderedList') && "bg-gray-100 text-gray-900"
              )}
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={cn(
                "hover:bg-gray-100",
                editor.isActive('blockquote') && "bg-gray-100 text-gray-900"
              )}
            >
              <Quote className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleLink}
              className={cn(
                "hover:bg-gray-100",
                editor.isActive('link') && "bg-gray-100 text-gray-900"
              )}
            >
              <LinkIcon className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={addImage}
              className="hover:bg-gray-100"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={cn(
                "hover:bg-gray-100",
                editor.isActive('heading', { level: 1 }) && "bg-gray-100 text-gray-900"
              )}
            >
              <Heading1 className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={cn(
                "hover:bg-gray-100",
                editor.isActive('heading', { level: 2 }) && "bg-gray-100 text-gray-900"
              )}
            >
              <Heading2 className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              className={cn(
                "hover:bg-gray-100",
                editor.isActive('heading', { level: 3 }) && "bg-gray-100 text-gray-900"
              )}
            >
              <Heading3 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      <EditorContent 
        editor={editor} 
        className={cn(
                "prose prose-sm max-w-none",
                "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
                "p-4 overflow-y-auto",
                "[&_.ProseMirror]:min-h-[100px] [&_.ProseMirror]:outline-none",
                "[&_pre]:bg-gray-50 [&_pre]:text-gray-900 [&_pre]:border [&_pre]:border-gray-200 [&_pre]:p-4 [&_pre]:rounded-md [&_pre]:my-4",
                "[&_pre]:dark:bg-gray-700 [&_pre]:dark:text-gray-100 [&_pre]:dark:border-gray-600",
                "[&_code]:bg-gray-50 [&_code]:text-gray-900 [&_code]:px-1 [&_code]:rounded [&_code]:font-mono [&_code]:text-sm",
                "[&_code]:dark:bg-gray-700 [&_code]:dark:text-gray-100",
                "[&_blockquote]:border-l-4 [&_blockquote]:border-blue-500 [&_blockquote]:pl-4 [&_blockquote]:my-4 [&_blockquote]:italic [&_blockquote]:text-gray-700 [&_blockquote]:bg-blue-50/50",
                "[&_blockquote]:dark:text-gray-300 [&_blockquote]:dark:bg-blue-900/20 [&_blockquote]:dark:border-blue-400",
                "[&_a]:text-blue-600 [&_a]:underline [&_a]:underline-offset-2",
                "[&_a]:dark:text-blue-400",
                "[&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4",
                "[&_p]:my-2 [&_p]:text-gray-900 [&_p]:dark:text-gray-100",
                "[&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-4",
                // Amélioration pour le surlignage et les couleurs en mode sombre
                "[&_mark]:dark:text-gray-100",
                "[&_[style*='color']]:dark:text-opacity-100",
              )}
        
      />
    </div>
  );
};
