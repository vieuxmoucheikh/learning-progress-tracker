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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTextSize('large')}
          className={cn(isTextSize('large') && 'bg-muted')}
          title="Large Text"
        >
          <TypeIcon className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTextSize('medium')}
          className={cn(isTextSize('medium') && 'bg-muted')}
          title="Medium Text"
        >
          <TypeIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTextSize('normal')}
          className={cn(isTextSize('normal') && 'bg-muted')}
          title="Normal Text"
        >
          <TypeIcon className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={cn(editor.isActive('heading', { level: 1 }) && 'bg-muted')}
          title="Heading 1"
        >
          H1
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={cn(editor.isActive('heading', { level: 2 }) && 'bg-muted')}
          title="Heading 2"
        >
          H2
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={cn(editor.isActive('heading', { level: 3 }) && 'bg-muted')}
          title="Heading 3"
        >
          H3
        </Button>
      </div>
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
        title="Numbered List"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        className={cn(editor.isActive('taskList') && 'bg-muted')}
        title="Task List"
      >
        <CheckSquare className="h-4 w-4" />
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
    </div>
  );
};

export const RichContentEditor: React.FC<RichContentEditorProps> = ({
  content,
  onChange,
  readOnly: initialReadOnly = false,
  className,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localContent, setLocalContent] = useState(content);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        code: false,
        codeBlock: false
      }),
      Highlight,
      TaskList,
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'flex items-start gap-2',
        },
      }),
      TextStyle,
    ],
    content,
    editable: isEditing,
    onUpdate: ({ editor }) => {
      const newContent = editor.getHTML();
      setLocalContent(newContent);
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

  return (
    <div className={cn('border rounded-lg', className)}>
      {isEditing && editor && <MenuBar editor={editor} />}
      <div className="relative">
        <EditorContent
          editor={editor}
          className={cn(
            'prose prose-sm max-w-none p-4',
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
