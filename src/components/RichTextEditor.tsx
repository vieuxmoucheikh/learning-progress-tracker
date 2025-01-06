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
  Type,
  Palette,
} from 'lucide-react';
import { Button } from './ui/button';

const lowlightInstance = createLowlight(common);

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  editable?: boolean;
  className?: string;
}

const TEXT_SIZES = {
  large: {
    label: 'Large',
    class: 'text-2xl leading-relaxed',
    icon: <Type className="h-5 w-5" />,
  },
  medium: {
    label: 'Medium',
    class: 'text-lg leading-relaxed',
    icon: <Type className="h-4 w-4" />,
  },
  normal: {
    label: 'Normal',
    class: 'text-base leading-relaxed',
    icon: <Type className="h-3.5 w-3.5" />,
  },
} as const;

type TextSizeKey = keyof typeof TEXT_SIZES;

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  onChange,
  editable = true,
  className,
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        code: false,
        codeBlock: false,
      }),
      TextStyle.configure({}),
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
          class: 'bg-gray-50 text-gray-900 px-1 rounded font-mono text-sm',
        },
      }),
      ColorExtension,
      Highlight,
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  const setTextSize = (size: TextSizeKey) => {
    if (!editor) return;
    
    // Clear any existing text styles first
    editor.chain().focus().unsetMark('textStyle').run();
    
    // Apply the new text size
    editor.chain().focus().setMark('textStyle', { class: TEXT_SIZES[size].class }).run();
  };

  const isTextSize = (size: TextSizeKey): boolean => {
    if (!editor) return false;
    return editor.isActive('textStyle', { class: TEXT_SIZES[size].class });
  };

  if (!editor) {
    return null;
  }

  return (
    <div className={cn('border rounded-lg', className)}>
      <div className="flex flex-wrap gap-2 p-2 border-b">
        <div className="flex flex-wrap gap-2 border-r pr-2">
          {(Object.keys(TEXT_SIZES) as TextSizeKey[]).map((size) => (
            <Button
              key={size}
              variant="ghost"
              size="sm"
              onClick={() => setTextSize(size)}
              className={cn(
                "hover:bg-gray-100 min-w-[80px]",
                isTextSize(size) && "bg-gray-100 text-gray-900"
              )}
            >
              {TEXT_SIZES[size].icon}
              <span className="ml-2">{TEXT_SIZES[size].label}</span>
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={cn(editor.isActive('bold') && 'bg-muted')}
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={cn(editor.isActive('italic') && 'bg-muted')}
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={cn(editor.isActive('strike') && 'bg-muted')}
            title="Strike"
          >
            <CodeIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={cn(editor.isActive('code') && 'bg-muted')}
            title="Code"
          >
            <CodeIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={cn(editor.isActive('bulletList') && 'bg-muted')}
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={cn(editor.isActive('orderedList') && 'bg-muted')}
            title="Ordered List"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().unsetAllMarks().run()}
            className="hover:bg-gray-100"
            title="Clear Format"
          >
            <Type className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <EditorContent 
        editor={editor} 
        className={cn(
          'prose max-w-none w-full focus:outline-none p-4',
          'prose-img:my-0',
          'prose-p:my-0 prose-p:leading-normal',
          'prose-headings:my-3 prose-headings:first:mt-0',
          'prose-li:my-0',
          'prose-code:px-1 prose-code:py-0.5 prose-code:bg-gray-100 prose-code:rounded prose-code:before:content-none prose-code:after:content-none',
        )}
      />
    </div>
  );
};
