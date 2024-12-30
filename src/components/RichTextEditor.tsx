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
        inline: true,
        allowBase64: true,
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
    content: content || '',
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm max-w-none focus:outline-none h-full',
          'prose-img:my-2 prose-img:rounded-lg prose-img:shadow-sm',
          'prose-a:text-primary prose-a:no-underline hover:prose-a:underline'
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
                const image = document.createElement('img');
                image.src = dataUrl;
                image.onload = () => {
                  const maxWidth = 800;
                  const maxHeight = 600;
                  let width = image.width;
                  let height = image.height;

                  if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                  }
                  if (height > maxHeight) {
                    width = (width * maxHeight) / height;
                    height = maxHeight;
                  }

                  const canvas = document.createElement('canvas');
                  canvas.width = width;
                  canvas.height = height;
                  const ctx = canvas.getContext('2d');
                  ctx?.drawImage(image, 0, 0, width, height);

                  const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
                  view.dispatch(
                    view.state.tr.replaceSelectionWith(
                      view.state.schema.nodes.image.create({ src: optimizedDataUrl })
                    )
                  );
                };
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
                const image = document.createElement('img');
                image.src = dataUrl;
                image.onload = () => {
                  const maxWidth = 800;
                  const maxHeight = 600;
                  let width = image.width;
                  let height = image.height;

                  if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                  }
                  if (height > maxHeight) {
                    width = (width * maxHeight) / height;
                    height = maxHeight;
                  }

                  const canvas = document.createElement('canvas');
                  canvas.width = width;
                  canvas.height = height;
                  const ctx = canvas.getContext('2d');
                  ctx?.drawImage(image, 0, 0, width, height);

                  const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
                  view.dispatch(
                    view.state.tr.replaceSelectionWith(
                      view.state.schema.nodes.image.create({ src: optimizedDataUrl })
                    )
                  );
                };
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
    if (editor && editor.isEditable !== editable) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  if (!editor) {
    return null;
  }

  return (
    <div 
      className={cn(
        'h-full flex flex-col overflow-hidden rounded-md transition-colors',
        editable && 'border-2 border-input hover:border-primary focus-within:border-primary',
        !editable && 'bg-muted/30',
        className
      )}
    >
      <EditorContent 
        editor={editor} 
        className="p-3 flex-1 overflow-y-auto"
      />
    </div>
  );
};
