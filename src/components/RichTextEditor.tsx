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
        codeBlock: false,
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'rounded-lg max-w-full h-auto shadow-md',
        },
      }),
      Link.configure({
        openOnClick: false,
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
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

  if (!editor) {
    return null;
  }

  return (
    <div className={cn("relative", className)}>
      <div className="sticky top-0 z-10 flex gap-1 p-1 mb-1 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn(
            "p-1 h-8 w-8",
            editor.isActive('bold') && "bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-100"
          )}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn(
            "p-1 h-8 w-8",
            editor.isActive('italic') && "bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-100"
          )}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={addImage}
          className="p-1 h-8 w-8"
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn(
            "p-1 h-8 w-8",
            editor.isActive('bulletList') && "bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-100"
          )}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={cn(
            "p-1 h-8 w-8",
            editor.isActive('orderedList') && "bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-100"
          )}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
};
