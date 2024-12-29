import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import React from 'react';
import { cn } from '@/lib/utils';

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
      StarterKit,
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full rounded-lg shadow-sm hover:shadow-md transition-shadow',
        },
      }),
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          class: 'text-primary hover:underline',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
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
                view.dispatch(
                  view.state.tr.replaceSelectionWith(
                    view.state.schema.nodes.image.create({ src: dataUrl })
                  )
                );
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
                const { schema } = view.state;
                const node = schema.nodes.image.create({ src: dataUrl });
                const transaction = view.state.tr.replaceSelectionWith(node);
                view.dispatch(transaction);
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

  React.useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  return (
    <div className={cn(
      'prose prose-sm max-w-none',
      editable && 'border-2 focus-within:border-primary rounded-md p-4',
      !editable && 'bg-muted/30 rounded-lg p-4',
      className
    )}>
      <EditorContent editor={editor} />
    </div>
  );
};
