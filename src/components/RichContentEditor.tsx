import React, { useState, useEffect } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import TextStyle from '@tiptap/extension-text-style';
import { Extension } from '@tiptap/core';
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  List,
  ListOrdered,
  Code as CodeIcon,
  Type as TypeIcon,
  CheckSquare,
  Edit,
  Save,
  X,
  Heading1,
  Heading2,
  Heading3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { common, createLowlight } from 'lowlight';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Code from '@tiptap/extension-code';

type TextSizeOptions = 'large' | 'medium' | 'normal';

interface RichContentEditorProps {
  content: string;
  onChange: (content: string) => void;
  readOnly?: boolean;
  className?: string;
}

const MenuBar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) return null;

  const setTextSize = (size: TextSizeOptions) => {
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
    const classes = {
      large: 'text-xl',
      medium: 'text-lg',
      normal: 'text-base'
    };
    return editor.isActive('textStyle', { class: classes[size] });
  };

  return (
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
          <TypeIcon className="h-5 w-5" />
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
          <TypeIcon className="h-4 w-4" />
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
          <TypeIcon className="h-3.5 w-3.5" />
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
          <BoldIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn(editor.isActive('italic') && 'bg-muted')}
          title="Italic"
        >
          <ItalicIcon className="h-4 w-4" />
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
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export const RichContentEditor: React.FC<RichContentEditorProps> = ({
  content,
  onChange,
  readOnly: initialReadOnly = false,
  className,
}) => {
  const [isEditing, setIsEditing] = useState(!initialReadOnly);
  const [localContent, setLocalContent] = useState(content);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        code: false,
        codeBlock: false,
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
        lowlight: createLowlight(common),
        HTMLAttributes: {
          class: 'bg-gray-50 text-gray-900 p-4 rounded-md border border-gray-200 font-mono text-sm my-4',
        },
      }),
      Code.configure({
        HTMLAttributes: {
          class: 'bg-gray-50 text-gray-900 px-1 rounded font-mono text-sm',
        },
      }),
      TextStyle,
    ],
    content,
    editable: isEditing,
    onUpdate: ({ editor }) => {
      const newContent = editor.getHTML();
      setLocalContent(newContent);
      onChange(newContent);
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm max-w-none",
          "min-h-[100px] outline-none",
          "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-gray-900 [&_h1]:my-4",
          "[&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:my-3",
          "[&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-gray-900 [&_h3]:my-2",
          "[&_p]:text-gray-900 [&_p]:my-2",
          "[&_ul]:list-disc [&_ul]:ml-4",
          "[&_ol]:list-decimal [&_ol]:ml-4",
        ),
      },
    },
  });

  // Update editor content when prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
      setLocalContent(content);
    }
  }, [editor, content]);

  // Update editor editable state
  useEffect(() => {
    if (editor) {
      editor.setEditable(isEditing);
    }
  }, [editor, isEditing]);

  const handleSave = () => {
    if (localContent !== content) {
      onChange(localContent);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setLocalContent(content);
    editor?.commands.setContent(content);
  };

  const setTextSize = (size: TextSizeOptions) => {
    const classes = {
      large: 'text-xl',
      medium: 'text-lg',
      normal: 'text-base'
    };
    
    // First clear any existing text size
    editor?.commands.unsetMark('textStyle');
    
    // Set the new text size
    editor?.commands.setMark('textStyle', { class: classes[size] });
  };

  const isTextSize = (size: TextSizeOptions): boolean => {
    const classes = {
      large: 'text-xl',
      medium: 'text-lg',
      normal: 'text-base'
    };
    return editor?.isActive('textStyle', { class: classes[size] }) ?? false;
  };

  return (
    <div className={cn('border rounded-lg', className)}>
      {isEditing && editor && <MenuBar editor={editor} />}
      <div className="relative">
        <EditorContent
          editor={editor}
          className={cn(
            "prose prose-sm max-w-none p-4",
            isEditing && 'min-h-[150px] cursor-text',
            'prose-p:my-2',
            'prose-ul:my-2 prose-ul:list-disc prose-ul:pl-6',
            'prose-ol:my-2 prose-ol:list-decimal prose-ol:pl-6'
          )}
        />
        <div className="flex justify-end p-2 border-t">
          <div className="flex gap-2">
            {!isEditing && !initialReadOnly && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                title="Edit content"
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
            {isEditing && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSave}
                  title="Save changes"
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  title="Cancel editing"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
