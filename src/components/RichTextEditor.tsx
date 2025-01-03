import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import React, { useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Bold,
  Italic,
  Code,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Link as LinkIcon,
  Image as ImageIcon,
  Heading2,
  Link2,
} from 'lucide-react';
import { Button } from './ui/button';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  editable?: boolean;
  className?: string;
}

const lowlight = createLowlight(common);

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  onChange,
  editable = true,
  className,
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
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
            class: 'border-l-4 border-blue-500 pl-4 italic my-4',
          },
        },
        code: {
          HTMLAttributes: {
            class: 'bg-gray-100 dark:bg-gray-800 rounded px-1.5 py-1 font-mono text-sm',
          },
        },
        codeBlock: {
          HTMLAttributes: {
            class: 'bg-gray-100 dark:bg-gray-800 rounded-lg p-4 font-mono text-sm my-4',
          },
        },
        heading: {
          levels: [1, 2, 3],
          HTMLAttributes: {
            class: 'font-bold my-4',
            1: { class: 'text-2xl' },
            2: { class: 'text-xl' },
            3: { class: 'text-lg' },
          },
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'rounded-lg max-w-full h-auto shadow-md hover:shadow-lg transition-shadow my-4',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 dark:text-blue-400 hover:underline',
          rel: 'noopener noreferrer',
          target: '_blank',
        },
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
        class: 'prose prose-sm sm:prose-base dark:prose-invert focus:outline-none max-w-none',
      },
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

  const addImage = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async (event) => {
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

  const addLink = useCallback(() => {
    const url = window.prompt('Enter URL');
    if (url) {
      editor?.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className={cn("relative rounded-lg border border-gray-200 dark:border-gray-800", className)}>
      <div className="sticky top-0 z-10 flex flex-wrap gap-1 p-2 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={cn(
              "p-1.5 h-8 w-8",
              editor.isActive('heading', { level: 2 }) && "bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-100"
            )}
            title="Heading"
          >
            <Heading2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={cn(
              "p-1.5 h-8 w-8",
              editor.isActive('bold') && "bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-100"
            )}
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={cn(
              "p-1.5 h-8 w-8",
              editor.isActive('italic') && "bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-100"
            )}
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={cn(
              "p-1.5 h-8 w-8",
              editor.isActive('code') && "bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-100"
            )}
            title="Code"
          >
            <Code className="h-4 w-4" />
          </Button>
        </div>

        <div className="w-px h-8 bg-gray-200 dark:bg-gray-800 mx-1" />

        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={cn(
              "p-1.5 h-8 w-8",
              editor.isActive('bulletList') && "bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-100"
            )}
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={cn(
              "p-1.5 h-8 w-8",
              editor.isActive('orderedList') && "bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-100"
            )}
            title="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={cn(
              "p-1.5 h-8 w-8",
              editor.isActive('blockquote') && "bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-100"
            )}
            title="Quote"
          >
            <Quote className="h-4 w-4" />
          </Button>
        </div>

        <div className="w-px h-8 bg-gray-200 dark:bg-gray-800 mx-1" />

        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={addImage}
            className="p-1.5 h-8 w-8"
            title="Add Image"
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={addLink}
            className={cn(
              "p-1.5 h-8 w-8",
              editor.isActive('link') && "bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-100"
            )}
            title="Add Link"
          >
            <Link2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="w-px h-8 bg-gray-200 dark:bg-gray-800 mx-1" />

        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="p-1.5 h-8 w-8"
            title="Undo"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="p-1.5 h-8 w-8"
            title="Redo"
          >
            <Redo className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className={cn(
        "p-4 bg-white dark:bg-gray-950 rounded-b-lg",
        "prose prose-sm sm:prose-base dark:prose-invert max-w-none",
        "prose-headings:text-gray-900 dark:prose-headings:text-gray-100",
        "prose-p:text-gray-700 dark:prose-p:text-gray-300",
        "prose-a:text-blue-600 dark:prose-a:text-blue-400",
        "prose-strong:text-gray-900 dark:prose-strong:text-gray-100",
        "prose-code:text-gray-900 dark:prose-code:text-gray-100",
        "prose-pre:bg-gray-100 dark:prose-pre:bg-gray-800/50",
        "prose-blockquote:text-gray-700 dark:prose-blockquote:text-gray-300",
        "prose-img:rounded-lg prose-img:shadow-md prose-img:mx-auto"
      )}>
        <EditorContent editor={editor} className="min-h-[200px]" />
      </div>
    </div>
  );
};
