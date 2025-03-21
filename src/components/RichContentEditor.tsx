import React, { useState, useEffect } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit'; 
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import TextStyle from '@tiptap/extension-text-style';
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
  Undo2,
  Redo2,
  Quote,
} from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { Separator } from './ui/separator';

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
   
    editor.chain().focus().unsetMark('textStyle').run();
    editor.chain().focus().setMark('textStyle', { class: classes[size] }).run();
  };

  const isTextSize = (size: TextSizeOptions): boolean => {
    const classes = {
      large: 'text-xl',
      medium: 'text-lg',
      normal: 'text-base'
    };
    return editor.isActive('textStyle', { class: classes[size] });
  };

  // Fonction améliorée pour le gras
  const toggleBoldEnhanced = () => {
    editor.chain().focus().toggleBold().run();
    
    // Forcer une mise à jour du style si en mode gras
    if (editor.isActive('bold')) {
      editor.chain().focus()
        .setMark('textStyle', { 
          'class': 'font-extrabold mobile-bold-force',
          'style': 'font-weight: 900 !important; color: black !important;'
        })
        .run();
    }
  };

  return (
    <div className="flex items-center flex-wrap gap-1 p-2 bg-white/95">
      {/* History Controls */}
      <div className="flex items-center gap-0.5 mr-2">
        <Button
          variant={'ghost'}
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="h-8 w-8"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="h-8 w-8"
        >
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-8" />

      {/* Headings Group */}
      <div className="flex items-center gap-0.5 mr-2">
        <Button
          size="icon"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={cn(
            "h-8 w-8 hover:bg-gray-100",
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
            "h-8 w-8 hover:bg-gray-100",
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
            "h-8 w-8 hover:bg-gray-100",
            editor.isActive('heading', { level: 3 }) && "bg-gray-100 text-gray-900"
          )}
        >
          <Heading3 className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-8" />

      {/* Text Formatting Group */}
      <div className="flex items-center gap-0.5 mr-2">
        <Button
          size="icon"
          variant="ghost"
          onClick={toggleBoldEnhanced} // Utiliser notre fonction améliorée
          className={cn(
            "h-8 w-8 hover:bg-gray-100 mobile-bold-button",
            editor.isActive('bold') && "active bg-gray-100 text-gray-900 font-extrabold" // Ajouter active
          )}
        >
          <BoldIcon className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn(
            "h-8 w-8 hover:bg-gray-100",
            editor.isActive('italic') && "bg-gray-100 text-gray-900"
          )}
        >
          <ItalicIcon className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={cn(
            "h-8 w-8 hover:bg-gray-100",
            editor.isActive('code') && "bg-gray-100 text-gray-900"
          )}
        >
          <CodeIcon className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-8" />

      {/* Text Size Group */}
      <div className="flex items-center gap-0.5 mr-2">
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setTextSize('large')}
          className={cn(
            "h-8 w-8 hover:bg-gray-100",
            isTextSize('large') && "bg-gray-100 text-gray-900"
          )}
        >
          <TypeIcon className="h-5 w-5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setTextSize('medium')}
          className={cn(
            "h-8 w-8 hover:bg-gray-100",
            isTextSize('medium') && "bg-gray-100 text-gray-900"
          )}
        >
          <TypeIcon className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setTextSize('normal')}
          className={cn(
            "h-8 w-8 hover:bg-gray-100",
            isTextSize('normal') && "bg-gray-100 text-gray-900"
          )}
        >
          <TypeIcon className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-8" />

      {/* Lists and Quote Group */}
      <div className="flex items-center gap-0.5">
        <Button
          size="icon"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn(
            "h-8 w-8 hover:bg-gray-100",
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
            "h-8 w-8 hover:bg-gray-100",
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
            "h-8 w-8 hover:bg-gray-100",
            editor.isActive('blockquote') && "bg-gray-100 text-gray-900"
          )}
        >
          <Quote className="h-4 w-4" />
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
        heading: {
          levels: [1, 2, 3],
          HTMLAttributes: {
            class: 'font-bold text-gray-900',
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
        codeBlock: false,
        bold: {
          HTMLAttributes: {
            class: 'font-extrabold mobile-bold mobile-bold-force', // Classes plus fortes
            style: 'font-weight: 900 !important; color: black !important;', // Style inline forcé
          },
        },
      }),
      Highlight,
      TaskList,
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'flex items-start gap-2',
        },
      }),
      TextStyle, // Utiliser TextStyle sans configuration particulière
    ],
    content,
    editable: isEditing,
    onUpdate: ({ editor }) => {
      const newContent = editor.getHTML();
      if (newContent !== localContent) {
        setLocalContent(newContent);
        onChange(newContent);
      }
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
          "prose-strong:font-bold prose-strong:text-black", // Assurer que strong est bien en gras
          "prose-b:font-bold prose-b:text-black", // Assurer que b est bien en gras
          "[&_strong]:font-bold [&_strong]:text-black", // Sélecteur direct pour strong
          "[&_b]:font-bold [&_b]:text-black", // Sélecteur direct pour b
          "prose-strong:!font-extrabold prose-strong:!text-black", // Force avec !important
          "prose-b:!font-extrabold prose-b:!text-black",
          "[&_strong]:!font-extrabold [&_strong]:!text-black",
          "[&_b]:!font-extrabold [&_b]:!text-black",
          "[&_.mobile-bold]:!font-extrabold [&_.mobile-bold]:!text-black",
          "[&_.mobile-bold-force]:!font-black [&_.mobile-bold-force]:!text-black",
        ),
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
      setLocalContent(content);
    }
  }, [editor, content]);

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
      <div className={cn('border rounded-lg shadow-sm flex flex-col relative', className)} style={{ height: '500px' }}>
        <div className="flex-1 overflow-y-auto relative">
          {isEditing && editor && (
            <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b shadow-sm">
              <MenuBar editor={editor} />
            </div>
          )}
          <div className="relative">
            <EditorContent
              editor={editor}
              className={cn(
                "prose prose-sm max-w-none p-4",
                isEditing && 'min-h-[150px] cursor-text',
                'prose-p:my-2',
                'prose-ul:my-2 prose-ul:list-disc prose-ul:pl-6',
                'prose-ol:my-2 prose-ol:list-decimal prose-ol:pl-6',
                'prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:pl-4 prose-blockquote:my-4 prose-blockquote:italic prose-blockquote:text-gray-700 prose-blockquote:bg-blue-50/50',
                'prose-code:bg-gray-50 prose-code:text-gray-900 prose-code:px-1 prose-code:rounded prose-code:font-mono prose-code:text-sm',
                'prose-strong:font-bold prose-strong:text-black', // Assurer que les balises strong sont en gras
                'prose-b:font-bold prose-b:text-black', // Assurer que les balises b sont en gras
                '[&_strong]:font-bold [&_strong]:text-black', // Sélecteur direct pour strong
                '[&_b]:font-bold [&_b]:text-black', // Sélecteur direct pour b
                'prose-strong:!font-extrabold prose-strong:!text-black',
                'prose-b:!font-extrabold prose-b:!text-black',
                '[&_strong]:!font-extrabold [&_strong]:!text-black',
                '[&_b]:!font-extrabold [&_b]:!text-black',
                '[&_.mobile-bold]:!font-extrabold [&_.mobile-bold]:!text-black',
                '[&_.mobile-bold-force]:!font-black [&_.mobile-bold-force]:!text-black',
              )}
            />
          </div>
        </div>
        <div className={cn("flex justify-end p-2 border-t mt-auto bg-white")}>
          <div className="flex gap-2">
            {!isEditing && !initialReadOnly && (
              <Button
                variant="ghost"
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
                  onClick={handleSave}
                  title="Save changes"
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>
                <Button
                  variant="ghost"
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
  );
};