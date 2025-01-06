import React, { useState, useEffect } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  List,
  ListOrdered,
  Code as CodeIcon,
  Heading1,
  Heading2,
  CheckSquare,
  Edit,
  Save,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RichContentEditorProps {
  content: string;
  onChange: (content: string) => void;
  readOnly?: boolean;
  className?: string;
}

const MenuBar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap gap-2 p-2 border-b">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={cn(editor.isActive('bold') && 'bg-muted')}
      >
        <BoldIcon className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={cn(editor.isActive('italic') && 'bg-muted')}
      >
        <ItalicIcon className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={cn(editor.isActive('heading', { level: 1 }) && 'bg-muted')}
        title="Heading 1"
      >
        <Heading1 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={cn(editor.isActive('heading', { level: 2 }) && 'bg-muted')}
        title="Heading 2"
      >
        <Heading2 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={cn(editor.isActive('heading', { level: 3 }) && 'bg-muted')}
        title="Heading 3"
      >
        <Heading2 className="h-4 w-4 scale-75" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={cn(editor.isActive('bulletList') && 'bg-muted')}
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={cn(editor.isActive('orderedList') && 'bg-muted')}
      >
        <ListOrdered className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        className={cn(editor.isActive('taskList') && 'bg-muted')}
      >
        <CheckSquare className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleCode().run()}
        className={cn(editor.isActive('code') && 'bg-muted')}
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

  const handleSave = () => {
    setIsEditing(false);
    onChange(localContent);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setLocalContent(content);
    editor?.commands.setContent(content);
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
          HTMLAttributes: {
            class: 'prose-heading',
          },
        },
        codeBlock: false,
      }),
      Highlight,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
    ],
    content: localContent,
    editable: isEditing,
    onUpdate: ({ editor }) => {
      const newContent = editor.getHTML();
      setLocalContent(newContent);
      onChange(newContent);
    },
  });

  useEffect(() => {
    if (editor && !isEditing) {
      editor.setEditable(false);
    }
  }, [isEditing, editor]);

  return (
    <div className={cn('border rounded-lg', className)}>
      {isEditing && editor && <MenuBar editor={editor} />}
      <div className="relative">
        <EditorContent
          editor={editor}
          className={cn(
            'prose max-w-none p-4',
            isEditing && 'min-h-[150px] cursor-text'
          )}
        />
        <div className="flex justify-end mt-2">
          <div className="flex gap-2">
            {!isEditing && !initialReadOnly && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit Content
              </Button>
            )}
            {isEditing && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSave}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
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
