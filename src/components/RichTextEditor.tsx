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
  const addImage = useCallback(() => {
    const url = window.prompt('Enter image URL');
    if (url) {
      editor?.chain().focus().setImage({ src: url }).run();
    }
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
          HTMLAttributes: {
            class: 'pl-0 my-0 space-y-0',
          },
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
          HTMLAttributes: {
            class: 'pl-0 my-0 space-y-0',
          },
        },
        listItem: {
          HTMLAttributes: {
            class: 'my-0 pl-0',
          },
        },
        blockquote: {
          HTMLAttributes: {
            class: 'border-l-4 border-primary/50 pl-4 italic',
          },
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'rounded-lg max-w-full h-auto my-4 shadow-md hover:shadow-lg transition-shadow',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline decoration-primary/30 hover:decoration-primary transition-colors',
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: 'rounded-md bg-muted p-4 my-2 overflow-x-auto font-mono text-sm',
          'data-language': 'typescript',
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
        class: cn(
          'prose prose-sm dark:prose-invert focus:outline-none max-w-none min-h-[150px] px-3 py-2',
          '[&_ul]:pl-5 [&_ol]:pl-5',
          '[&_ul>li]:pl-0 [&_ol>li]:pl-0',
          '[&_ul>li]:my-0 [&_ol>li]:my-0',
          '[&_ul]:my-1 [&_ol]:my-1',
          '[&_ul]:list-disc [&_ol]:list-decimal',
          '[&_ul>li]:marker:text-foreground/80 [&_ol>li]:marker:text-foreground/80',
          '[&_p]:my-0'
        ),
      },
      handlePaste: (view, event) => {
        const items = Array.from(event.clipboardData?.items || []);
        const imageItems = items.filter(item => item.type.startsWith('image'));

        if (imageItems.length > 0) {
          event.preventDefault();
          imageItems.forEach(item => {
            const file = item.getAsFile();
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
              const dataUrl = e.target?.result as string;
              if (dataUrl) {
                editor?.chain().focus().setImage({ src: dataUrl }).run();
              }
            };
            reader.readAsDataURL(file);
          });
          return true;
        }
        return false;
      },
      handleDrop: (view, event) => {
        const hasFiles = event.dataTransfer?.files?.length;
        
        if (hasFiles) {
          event.preventDefault();
          const images = Array.from(event.dataTransfer.files).filter(file => 
            file.type.startsWith('image/')
          );

          images.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const dataUrl = e.target?.result as string;
              if (dataUrl) {
                editor?.chain().focus().setImage({ src: dataUrl }).run();
              }
            };
            reader.readAsDataURL(file);
          });
          return true;
        }
        return false;
      },
    },
  });

  if (!editor) {
    return null;
  }

  return (
    <div className={cn("rounded-md border overflow-hidden", className)}>
      {editable && (
        <div className="flex flex-wrap gap-1 p-1 border-b bg-muted/50">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={cn("h-8 w-8", editor.isActive('bold') && "bg-muted")}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={cn("h-8 w-8", editor.isActive('italic') && "bg-muted")}
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={cn("h-8 w-8", editor.isActive('codeBlock') && "bg-muted")}
          >
            <Code className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={cn("h-8 w-8", editor.isActive('bulletList') && "bg-muted")}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={cn("h-8 w-8", editor.isActive('orderedList') && "bg-muted")}
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={cn("h-8 w-8", editor.isActive('blockquote') && "bg-muted")}
          >
            <Quote className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={addImage}
            className="h-8 w-8"
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
          <div className="w-px h-8 bg-border mx-1" />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="h-8 w-8"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="h-8 w-8"
          >
            <Redo className="h-4 w-4" />
          </Button>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
};
