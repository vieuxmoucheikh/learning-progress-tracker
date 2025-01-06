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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const lowlightInstance = createLowlight(common);

const colors = [
  '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
  '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
  '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc',
];

const bgColors = [
  '#ffffff', '#f3f3f3', '#efefef', '#d9d9d9', '#cccccc', '#b7b7b7', '#999999', '#666666', '#434343', '#000000',
  '#ffebee', '#fce4ec', '#f3e5f5', '#ede7f6', '#e8eaf6', '#e3f2fd', '#e1f5fe', '#e0f7fa', '#e0f2f1', '#e8f5e9',
];

type TextSizeOptions = 'large' | 'medium' | 'normal';

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
        heading: false,
        code: false,
        codeBlock: false,
      }),
      TextStyle.configure({
        HTMLAttributes: {
          class: 'text-base',
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

  const setTextSize = (size: TextSizeOptions) => {
    if (!editor) return;
    
    const classes = {
      large: 'text-xl',
      medium: 'text-lg',
      normal: 'text-base'
    };
    
    // First clear any existing text size
    editor.commands.unsetMark('textStyle');
    
    // Set the new text size
    editor.commands.setMark('textStyle', { class: classes[size] });
  };

  const isTextSize = (size: TextSizeOptions): boolean => {
    if (!editor) return false;
    
    const classes = {
      large: 'text-xl',
      medium: 'text-lg',
      normal: 'text-base'
    };
    return editor.isActive('textStyle', { class: classes[size] });
  };

  if (!editor) {
    return null;
  }

  return (
    <div className={cn('border rounded-lg', className)}>
      <div className="flex flex-wrap gap-2 p-2 border-b">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTextSize('large')}
            className={cn(
              "hover:bg-gray-100",
              isTextSize('large') && "bg-gray-100 text-gray-900"
            )}
          >
            <Type className="h-5 w-5" />
            <span className="ml-2">Large</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTextSize('medium')}
            className={cn(
              "hover:bg-gray-100",
              isTextSize('medium') && "bg-gray-100 text-gray-900"
            )}
          >
            <Type className="h-4 w-4" />
            <span className="ml-2">Medium</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTextSize('normal')}
            className={cn(
              "hover:bg-gray-100",
              isTextSize('normal') && "bg-gray-100 text-gray-900"
            )}
          >
            <Type className="h-3.5 w-3.5" />
            <span className="ml-2">Normal</span>
          </Button>
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
