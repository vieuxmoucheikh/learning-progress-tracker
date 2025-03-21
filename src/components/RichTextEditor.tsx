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
import React, { useCallback, useEffect } from 'react';
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
  Heading1,
  Heading2,
  Heading3,
  Type,
  Palette,
} from 'lucide-react';
import { Button } from './ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import DOMPurify from 'dompurify';

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
        heading: {
          levels: [1, 2, 3],
          HTMLAttributes: {
            'h1': {
              class: 'text-2xl font-bold text-gray-900 my-4',
            },
            'h2': {
              class: 'text-xl font-bold text-gray-900 my-3',
            },
            'h3': {
              class: 'text-lg font-bold text-gray-900 my-2',
            },
            class: 'font-bold text-gray-900', // Ceci s'applique à tous les niveaux de titre
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
            class: 'bg-gray-50 text-gray-900 px-1 rounded font-mono text-sm mobile-code', // Ajout de la classe mobile-code
          },
        },
        bold: {
          HTMLAttributes: {
            class: 'font-bold text-black mobile-bold mobile-bold-force', // Ajout de classes plus fortes
            style: 'font-weight: 900; color: black !important', // Force le style inline
          },
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
          class: 'rounded bg-gray-200 px-1.5 py-0.5 font-mono text-sm',
        },
      }),
      TextStyle, // Utiliser TextStyle sans configuration particulière (supprimer la configuration incorrecte)
      ColorExtension.configure({
        types: ['textStyle'],
      }),
      Highlight.configure({
        multicolor: true,
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
          "prose prose-sm max-w-none",
          "min-h-[100px] outline-none",
          "[&_p]:text-gray-900 [&_p]:my-2",
          "[&_ul]:list-disc [&_ul]:ml-4",
          "[&_ol]:list-decimal [&_ol]:ml-4"
        ),
      }
      ,
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
              const base64 = e.target?.result as string;
              editor?.chain().focus().setImage({ src: base64 }).run();
            };
            reader.readAsDataURL(file);
            return true;
          }
        }
        return false;
      },
      handlePaste: (view, event) => {
        if (event.clipboardData && event.clipboardData.files && event.clipboardData.files[0]) {
          const file = event.clipboardData.files[0];
          if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
              const base64 = e.target?.result as string;
              editor?.chain().focus().setImage({ src: base64 }).run();
            };
            reader.readAsDataURL(file);
            return true;
          }
        }
        return false;
      },
      handleClick: (view, pos, event) => {
        // Ajouter une gestion de clic pour forcer la mise à jour des styles
        if (event.target instanceof HTMLElement) {
          if (event.target.closest('[data-type="bold"]') || 
              event.target.closest('.ProseMirror-selectednode')) {
            // Forcer la mise à jour du style
            const currentStyles = view.state.selection.$head.marks();
            if (currentStyles.length > 0) {
              view.updateState(view.state);
            }
          }
        }
        return false; // Continuer le traitement normal
      },
      transformPastedHTML(html) {
        // Traitement spécial pour les guillemets simples et les couleurs
        return html.replace(/'/g, "'").replace(/style="color:/g, 'style="color: ');
      },
    },
  });

  const handleClipboardEvent = (event: Event) => {
    const clipboardEvent = event as ClipboardEvent;
    event.preventDefault();
    const text = clipboardEvent.clipboardData?.getData('text/plain');
    const sanitizedContent = text ? DOMPurify.sanitize(text) : ''; // Sanitize the clipboard content
    editor?.chain().focus().insertContent(sanitizedContent).run();
  };

  useEffect(() => {
    const editorElement = document.querySelector('.editor');
    if (editorElement) {
      editorElement.addEventListener('paste', handleClipboardEvent);
    }
    return () => {
      if (editorElement) {
        editorElement.removeEventListener('paste', handleClipboardEvent);
      }
    };
  }, [editor]);

  const toggleLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = (event) => {
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

  // NOUVEAU: Modifier le comportement du bouton Bold pour le rendre plus fiable sur mobile
  const toggleBold = useCallback(() => {
    if (!editor) return;
    
    // Si déjà en gras, appliquer une force supplémentaire
    if (editor.isActive('bold')) {
      editor.chain().focus()
        .unsetBold()
        .run();
        
      // Reappliquer le gras avec un style encore plus fort
      setTimeout(() => {
        editor.chain().focus()
          .setMark('textStyle', { 
            'class': 'font-extrabold mobile-bold-force',
            'style': 'font-weight: 900 !important; color: black !important;'
          })
          .run();
      }, 50);
    } else {
      editor.chain().focus().toggleBold().run();
    }
  }, [editor]);

  // Fonction pour appliquer une couleur de texte de façon plus robuste
  const applyTextColor = useCallback((color: string) => {
    if (!editor) return;
    
    editor.chain().focus()
      .setColor(color)
      .run();
    
    // Forcer la mise à jour du style pour une meilleure visibilité sur mobile
    setTimeout(() => {
      const selection = editor.state.selection;
      if (selection) {
        editor.commands.setTextSelection({
          from: selection.from,
          to: selection.to
        });
      }
    }, 50);
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className={cn("rich-text-editor", className)}>
      <div className={cn(
        "rounded-lg border border-gray-200 dark:border-gray-700",
        "bg-white dark:bg-gray-800", // Fond sombre pour le mode sombre
        "relative flex flex-col",
        className
      )}>
        {editable && (
          <div className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex flex-wrap gap-1 p-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={toggleBold} // Utiliser notre fonction personnalisée
                className={cn(
                  "hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300 mobile-bold-button", 
                  editor.isActive('bold') && "active bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white font-bold" // Ajouter la classe active
                )}
              >
                <Bold className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={cn(
                  "hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300",
                  editor.isActive('italic') && "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white"
                )}
              >
                <Italic className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => editor.chain().focus().toggleCode().run()}
                className={cn(
                  "hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300",
                  editor.isActive('code') && "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white"
                )}
              >
                <CodeIcon className="h-4 w-4" />
              </Button>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300 mobile-color-button"
                  >
                    <Type className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2 dark:bg-gray-800 dark:border-gray-700">
                  <div className="grid grid-cols-10 gap-1">
                    {colors.map((color) => (
                      <button
                        key={color}
                        className="w-5 h-5 rounded border border-gray-200 dark:border-gray-600 mobile-color-option"
                        style={{ backgroundColor: color }}
                        onClick={() => applyTextColor(color)}
                      />
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300"
                  >
                    <Palette className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2">
                  <div className="grid grid-cols-10 gap-1">
                    {bgColors.map((color) => (
                      <button
                        key={color}
                        className="w-5 h-5 rounded border border-gray-200"
                        style={{ backgroundColor: color }}
                        onClick={() => editor.chain().focus().setHighlight({ color }).run()}
                      />
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <Button
                size="icon"
                variant="ghost"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={cn(
                  "hover:bg-gray-100",
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
                  "hover:bg-gray-100",
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
                  "hover:bg-gray-100",
                  editor.isActive('blockquote') && "bg-gray-100 text-gray-900"
                )}
              >
                <Quote className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={toggleLink}
                className={cn(
                  "hover:bg-gray-100",
                  editor.isActive('link') && "bg-gray-100 text-gray-900"
                )}
              >
                <LinkIcon className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={addImage}
                className="hover:bg-gray-100"
              >
                <ImageIcon className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className={cn(
                  "hover:bg-gray-100",
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
                  "hover:bg-gray-100",
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
                  "hover:bg-gray-100",
                  editor.isActive('heading', { level: 3 }) && "bg-gray-100 text-gray-900"
                )}
              >
                <Heading3 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        <EditorContent 
          editor={editor} 
          className={cn(
                  "prose prose-sm max-w-none",
                  "bg-white dark:bg-gray-800 text-gray-900 dark:text-white", // Texte blanc en mode sombre
                  "p-4 overflow-y-auto",
                  "[&_.ProseMirror]:min-h-[100px] [&_.ProseMirror]:outline-none",
                  "[&_.ProseMirror]:dark:text-white", // Texte blanc pour l'éditeur en mode sombre
                  "[&_pre]:bg-gray-50 [&_pre]:text-gray-900 [&_pre]:border [&_pre]:border-gray-200 [&_pre]:p-4 [&_pre]:rounded-md [&_pre]:my-4",
                  "[&_pre]:dark:bg-gray-900 [&_pre]:dark:text-gray-100 [&_pre]:dark:border-gray-700",
                  "[&_code]:bg-gray-50 [&_code]:text-gray-900 [&_code]:px-1 [&_code]:rounded [&_code]:font-mono [&_code]:text-sm [&_code]:mobile-code",
                  "[&_code]:dark:bg-gray-900 [&_code]:dark:text-gray-100",
                  "[&_blockquote]:border-l-4 [&_blockquote]:border-blue-500 [&_blockquote]:pl-4 [&_blockquote]:my-4 [&_blockquote]:italic [&_blockquote]:text-gray-700 [&_blockquote]:bg-blue-50/50",
                  "[&_blockquote]:dark:text-gray-300 [&_blockquote]:dark:bg-blue-900/30 [&_blockquote]:dark:border-blue-500",
                  "[&_a]:text-blue-600 [&_a]:underline [&_a]:underline-offset-2",
                  "[&_a]:dark:text-blue-400",
                  "[&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4",
                  "[&_p]:my-2 [&_p]:text-gray-900 [&_p]:dark:text-white", // Texte blanc pour les paragraphes
                  "[&_h1]:dark:text-white [&_h2]:dark:text-white [&_h3]:dark:text-white", // Texte blanc pour les titres
                  "[&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-4",
                  "[&_.ProseMirror_strong]:font-extrabold [&_.ProseMirror_strong]:!text-black [&_.ProseMirror_strong]:dark:!text-white", // Styles plus forts avec !important
                  "[&_.ProseMirror_b]:font-extrabold [&_.ProseMirror_b]:!text-black [&_.ProseMirror_b]:dark:!text-white",
                  "[&_.mobile-bold]:font-extrabold [&_.mobile-bold]:!text-black [&_.mobile-bold]:dark:!text-white",
                  "[&_.mobile-bold-force]:font-black [&_.mobile-bold-force]:!text-black [&_.mobile-bold-force]:dark:!text-white",
                  "prose-strong:!font-black prose-strong:!text-black dark:prose-strong:!text-white",
                  "prose-b:!font-black prose-b:!text-black dark:prose-b:!text-white",
                  "[&_span[style*='color']]:mobile-colored-text", // Ajouter une classe pour le texte coloré
                  "[&_span[data-color]]:mobile-colored-text", // Ajouter une classe pour le texte coloré avec data-color
                )}
          
        />
      </div>
    </div>
  );
};
