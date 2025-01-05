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
      StarterKit,
      Image,
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
            onClick={() => {
              const url = window.prompt('Image URL');
              if (url) {
                editor.chain().focus().setImage({ src: url }).run();
              }
            }}
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
          "[&_blockquote]:border-l-4 [&_blockquote]:border-gray-200 [&_blockquote]:pl-4 [&_blockquote]:italic",
          "[&_a]:text-blue-600 [&_a]:underline [&_a]:underline-offset-2",
          "[&_ul]:list-disc [&_ol]:list-decimal",
          "[&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg",
          "[&_p]:my-2",
          "[&_img]:max-w-full [&_img]:rounded-lg"
        )}
      />
    </div>
  );
};
