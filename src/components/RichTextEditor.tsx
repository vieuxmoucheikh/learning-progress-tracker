import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import Code from '@tiptap/extension-code';
import { common, createLowlight } from 'lowlight';
import React, { useCallback } from 'react';
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
} from 'lucide-react';
import { Button } from './ui/button';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  editable?: boolean;
  className?: string;
}

const lowlightInstance = createLowlight(common);

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  onChange,
  editable = true,
  className,
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        blockquote: {
          HTMLAttributes: {
            class: 'border-l-4 border-blue-500 pl-4 my-4 italic text-gray-700',
          },
        },
        heading: {
          levels: [1, 2, 3],
          HTMLAttributes: {
            1: {
              class: 'text-2xl font-bold text-gray-900 mt-6 mb-4',
            },
            2: {
              class: 'text-xl font-bold text-gray-900 mt-5 mb-3',
            },
            3: {
              class: 'text-lg font-bold text-gray-900 mt-4 mb-2',
            },
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
      }),
      CodeBlockLowlight.configure({
        lowlight: lowlightInstance,
      }),
      Code,
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
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
      "bg-white",
      className
    )}>
      {editable && (
        <div className="flex flex-wrap gap-1 p-2 border-b border-gray-200 bg-white">
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
      )}
      <EditorContent 
        editor={editor} 
        className={cn(
          "prose prose-sm max-w-none",
          "bg-white text-gray-900",
          "p-4",
          "[&_.ProseMirror]:min-h-[100px] [&_.ProseMirror]:outline-none",
          "[&_pre]:bg-gray-50 [&_pre]:text-gray-900 [&_pre]:border [&_pre]:border-gray-200",
          "[&_code]:bg-gray-50 [&_code]:text-gray-900 [&_code]:px-1 [&_code]:rounded",
          "[&_blockquote]:border-l-4 [&_blockquote]:border-blue-500 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-700 [&_blockquote]:bg-blue-50/50",
          "[&_a]:text-blue-600 [&_a]:underline [&_a]:underline-offset-2",
          "[&_ul]:list-disc [&_ol]:list-decimal [&_ul]:ml-4 [&_ol]:ml-4",
          "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-gray-900 [&_h1]:mt-6 [&_h1]:mb-4",
          "[&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:mt-5 [&_h2]:mb-3",
          "[&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-gray-900 [&_h3]:mt-4 [&_h3]:mb-2",
          "[&_p]:my-2 [&_p]:text-gray-900",
          "[&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-4"
        )}
      />
    </div>
  );
};
