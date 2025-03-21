import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from './RichTextEditor';
import { Badge } from '@/components/ui/badge';
import { 
  Edit, 
  Save, 
  Trash2, 
  X, 
  Tag as TagIcon, 
  Image as ImageIcon, 
  Link as LinkIcon,
  Check, 
  Plus, 
  ChevronsUpDown,
  Trophy,
  Download,
  Eye,
  EyeOff,
  Clock,
  Bookmark,
  BookmarkCheck,
  AlertCircle,
  Copy
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { EnhancedLearningCard as CardType, NewEnhancedLearningCard } from '@/types';
import type { Options as Html2PdfOptions } from 'html2pdf.js';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getLearningItems, trackLearningActivity, updateLearningItem } from '@/lib/database';
import { Calendar } from '@/components/ui/calendar';
import './LearningItemCard.css'; // Nous réutilisons le même fichier CSS

interface EnhancedLearningCardProps extends CardType {
  onSave: (data: Partial<CardType>) => Promise<boolean>;
  onDelete: () => void;
}

export const EnhancedLearningCard: React.FC<EnhancedLearningCardProps> = ({
  id,
  title: initialTitle,
  content: initialContent,
  media: initialMedia = [],
  tags: initialTags = [],
  category: initialCategory = '',
  mastered: initialMastered = false,
  createdAt,
  updatedAt,
  onSave,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [media, setMedia] = useState<CardType['media']>(initialMedia);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [newTag, setNewTag] = useState('');
  const [isContentHidden, setIsContentHidden] = useState(false);
  const [mastered, setMastered] = useState(initialMastered);
  const [isZoomed, setIsZoomed] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemCategory, setItemCategory] = useState(initialCategory);
  const [categories, setCategories] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [showContent, setShowContent] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const items = await getLearningItems();
        const uniqueCategories = Array.from(
          new Set(items.map(item => item.category).filter(Boolean))
        ).sort();
        setCategories(uniqueCategories);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };

    if (isEditing) {
      fetchCategories();
    }
  }, [isEditing]);

  const handleSave = async () => {
    const result = await onSave({
      id,
      title,
      content,
      media,
      tags,
      category: itemCategory,
      mastered,
    });
    setIsEditing(false);
    toast({
      title: "Success",
      description: "Card updated successfully",
    });
    await trackLearningActivity(itemCategory);
  };

  const handleUpdateCategory = async (category: string) => {
    setItemCategory(category);
    try {
      await onSave({
        category,
        title,
        content,
        tags,
        mastered,
      });
      toast({
        title: "Success",
        description: "Category updated successfully",
      });
    } catch (error) {
      console.error('Error updating category:', error);
      toast({
        title: "Error",
        description: "Failed to update category",
        variant: "destructive",
      });
    }
  };

  const handleAddTag = (e: React.KeyboardEvent | React.FormEvent) => {
    if (e.type === 'submit' || (e as React.KeyboardEvent).key === 'Enter') {
      e.preventDefault();
      if (newTag.trim() && !tags.includes(newTag.trim())) {
        setTags([...tags, newTag.trim()]);
      }
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleCopyContent = async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: "Copied!",
        description: "Card content copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy content",
        variant: "destructive",
      });
    }
  };

  const toggleMastered = async () => {
    try {
      const success = await onSave({
        id,
        mastered: !mastered,
        category: itemCategory
      });

      if (success) {
        // Track the learning activity when marking as mastered
        if (!mastered) {
          console.log('Tracking activity for category:', itemCategory);
          await trackLearningActivity(itemCategory || 'Uncategorized');
        }
        setMastered(!mastered);
        toast({
          title: !mastered ? "Marked as mastered" : "Marked as not mastered",
          description: `Successfully ${!mastered ? 'mastered' : 'unmastered'} the card`,
        });
      }
    } catch (error) {
      console.error('Error toggling mastered state:', error);
      toast({
        title: "Error",
        description: "Failed to update mastered state",
        variant: "destructive",
      });
    }
  };

  const handleComplete = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      console.log('Completing item:', id);
      
      // Track the learning activity first
      const activityResult = await trackLearningActivity(itemCategory || 'Uncategorized');
      console.log('Activity tracking result:', activityResult);
      
      if (!activityResult) {
        throw new Error('Failed to track activity');
      }

      // Then update the learning item
      const updatedItem = await updateLearningItem(id, {
        completed: true,
        status: 'completed' as const // Utiliser status au lieu de completed_at
      });

      if (!updatedItem) {
        throw new Error('Failed to update item');
      }

      console.log('Item completed successfully');
      toast({
        title: "Success!",
        description: "Learning item marked as complete",
      });
      
      onSave(updatedItem);
    } catch (error) {
      console.error('Error completing item:', error);
      toast({
        title: "Error",
        description: "Failed to complete the learning item. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleContentVisibility = () => {
    setIsContentHidden(!isContentHidden);
  };

  const exportToPdf = useCallback(() => {
    const element = document.createElement('div');
    element.className = 'pdf-container p-8';
    
    // Add title
    const titleElement = document.createElement('h1');
    titleElement.textContent = title;
    titleElement.className = 'text-4xl font-bold mb-6';
    element.appendChild(titleElement);
    
    // Add content
    const contentElement = document.createElement('div');
    contentElement.className = 'prose max-w-none mb-6';
    contentElement.innerHTML = content;
    element.appendChild(contentElement);
    
    // Add metadata
    const metadata = document.createElement('div');
    metadata.className = 'text-sm text-gray-600 mb-6';
    
    if (itemCategory) {
      const categoryElement = document.createElement('div');
      categoryElement.className = 'mb-2';
      categoryElement.innerHTML = `<strong>Category:</strong> ${itemCategory}`;
      metadata.appendChild(categoryElement);
    }
    
    if (updatedAt) {
      const lastStudiedElement = document.createElement('div');
      lastStudiedElement.className = 'mb-2';
      lastStudiedElement.innerHTML = `<strong>Last Studied:</strong> ${new Date(updatedAt).toLocaleDateString()}`;
      metadata.appendChild(lastStudiedElement);
    }
    
    if (tags && tags.length > 0) {
      const tagsElement = document.createElement('div');
      tagsElement.className = 'mb-2';
      tagsElement.innerHTML = `<strong>Tags:</strong> ${tags.join(', ')}`;
      metadata.appendChild(tagsElement);
    }
    
    element.appendChild(metadata);
    
    // Add media if present
    if (media && media.length > 0) {
      const mediaSection = document.createElement('div');
      mediaSection.className = 'mb-6';
      mediaSection.innerHTML = '<h2 class="text-2xl font-bold mb-4">Media</h2>';
      
      media.forEach(item => {
        const mediaItem = document.createElement('div');
        mediaItem.className = 'mb-4';
        if (item.type === 'image') {
          mediaItem.innerHTML = `
            <img src="${item.url}" alt="${item.description || ''}" class="max-w-full rounded-lg" />
            ${item.description ? `<p class="mt-2 text-sm text-gray-600">${item.description}</p>` : ''}
          `;
        } else {
          mediaItem.innerHTML = `
            <div class="text-blue-500">${item.url}</div>
            ${item.description ? `<p class="mt-1 text-sm text-gray-600">${item.description}</p>` : ''}
          `;
        }
        mediaSection.appendChild(mediaItem);
      });
      
      element.appendChild(mediaSection);
    }
    
    // Configure PDF options
    const opt: Html2PdfOptions = {
      margin: [15, 15],
      filename: `${title.toLowerCase().replace(/\s+/g, '-')}.pdf`,
      image: { 
        type: 'jpeg', 
        quality: 0.98 
      },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        letterRendering: true
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait'
      }
    };
    
    // Generate PDF
    html2pdf()
      .set(opt)
      .from(element)
      .save()
      .catch(error => {
        console.error('Error generating PDF:', error);
      });
  }, [title, content, itemCategory, updatedAt, tags, media]);

  // Fix for mobile input focus
  useEffect(() => {
    if (isEditing) {
      const handleFocus = () => {
        // Small delay to ensure the viewport has adjusted
        setTimeout(() => {
          window.scrollTo(0, window.scrollY);
        }, 100);
      };

      document.addEventListener('focusin', handleFocus);
      return () => document.removeEventListener('focusin', handleFocus);
    }
  }, [isEditing]);

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300 border-2",
      "hover:shadow-xl",
      "max-w-3xl mx-auto",
      "transform-gpu",
      mastered 
        ? "bg-gradient-to-br from-emerald-50 to-white border-emerald-200" 
        : "bg-white border-gray-200 hover:border-blue-300",
      "sm:rounded-xl",
      isZoomed ? "transform scale-105 shadow-xl z-10" : "",
      mastered 
        ? "border-emerald-300 shadow-emerald-100" 
        : isEditing 
          ? "border-blue-400 shadow-md shadow-blue-100"
          : "border-gray-200 hover:border-blue-300 shadow-md shadow-gray-100/50",
    )}>
      <CardHeader className="space-y-4 pb-4 px-4 sm:px-6">
        {/* Title Section */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={cn(
                    "text-lg font-semibold",
                    "bg-gray-50",
                    "text-gray-900",
                    "border-gray-200 focus:border-blue-300",
                    "focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1",
                    "placeholder:text-gray-400",
                    "w-full sm:text-xl",
                    "transition-all duration-200"
                  )}
                  placeholder="Enter title..."
                />
              ) : (
                <h3 
                  className={cn(
                    "text-xl sm:text-2xl font-semibold line-clamp-2 card-title",
                    "text-gray-900",
                    "transition-colors",
                    mastered ? "text-emerald-800" : "text-gray-900",
                  )}
                  onClick={() => setShowContent(!showContent)}
                >
                  {title}
                </h3>
              )}
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              {mastered && (
                <Trophy className="w-5 h-5 text-yellow-500 animate-pulse" />
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowContent(!showContent)}
                className="h-9 w-9 hover:bg-blue-100 rounded-lg text-blue-700"
                title={showContent ? "Hide content" : "Show content"}
              >
                {showContent ? (
                  <EyeOff className="w-5 h-5 text-blue-600" />
                ) : (
                  <Eye className="w-5 h-5 text-blue-600" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (isEditing) {
                    handleSave();
                  } else {
                    setIsEditing(true);
                  }
                }}
                className="h-9 w-9 hover:bg-blue-100 rounded-lg text-blue-700"
                title={isEditing ? "Save changes" : "Edit card"}
              >
                {isEditing ? (
                  <Save className="w-5 h-5 text-blue-600" />
                ) : (
                  <Edit className="w-5 h-5 text-blue-600" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopyContent}
                className="h-9 w-9 hover:bg-blue-100 rounded-lg text-blue-700"
                title="Copy content"
              >
                <Copy className="w-5 h-5 text-blue-600" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={exportToPdf}
                className="h-9 w-9 hover:bg-blue-100 rounded-lg text-blue-700"
                title="Export to PDF"
              >
                <Download className="w-5 h-5 text-blue-600" />
              </Button>
            </div>
          </div>

          {/* Category Section */}
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Select
                value={itemCategory}
                onValueChange={handleUpdateCategory}
              >
                <SelectTrigger className={cn(
                  "w-full max-w-xs",
                  "bg-gray-50 dark:bg-gray-700",
                  "border-gray-200 focus:border-blue-300 dark:border-gray-600 dark:focus:border-blue-500",
                  "text-gray-900 dark:text-gray-100",
                  "focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-gray-800",
                  "h-9",
                  "transition-all duration-200"
                )}>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
                  <SelectGroup>
                    <div className="px-2 py-1.5 text-sm font-medium text-gray-500 dark:text-gray-400">
                      Categories
                    </div>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat} className="focus:bg-blue-50 focus:text-blue-600 dark:focus:bg-blue-900/30 dark:focus:text-blue-300">
                        {cat}
                      </SelectItem>
                    ))}
                    {itemCategory && !categories.includes(itemCategory) && (
                      <SelectItem value={itemCategory} className="focus:bg-blue-50 focus:text-blue-600 dark:focus:bg-blue-900/30 dark:focus:text-blue-300">
                        {itemCategory} <span className="text-gray-500 dark:text-gray-400">(New)</span>
                      </SelectItem>
                    )}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          ) : itemCategory ? (
            <Badge 
              variant="secondary" 
              className={cn(
                "font-medium px-3 py-1",
                "bg-blue-50 text-blue-700 hover:bg-blue-100",
                "dark:bg-blue-800/70 dark:text-blue-200 dark:hover:bg-blue-700",
                "border border-blue-200 dark:border-blue-700",
                "rounded-full",
                "shadow-sm"
              )}
            >
              {itemCategory}
            </Badge>
          ) : null}
        </div>

        {/* Content Section */}
        <div 
          className={cn(
            "transition-all duration-300",
            !showContent && "hidden"
          )}
        >
          {isEditing ? (
            <div className="space-y-4">
              <div className="space-y-2 relative">
                <RichTextEditor
                  content={content}
                  onChange={setContent}
                  className={cn(
                    "min-h-[200px] rounded-lg",
                    "bg-gray-50 dark:bg-gray-800",
                    "text-gray-900 dark:text-gray-100",
                    "border border-gray-200 dark:border-gray-700",
                    "focus-within:ring-2 focus-within:ring-blue-500 dark:focus-within:ring-blue-400",
                    "prose prose-sm sm:prose-base max-w-none dark:prose-invert",
                    "overflow-y-auto max-h-[60vh]",
                    "prose-headings:font-semibold prose-headings:text-gray-900 dark:prose-headings:text-gray-100",
                    "prose-p:text-gray-700 prose-p:leading-relaxed dark:prose-p:text-gray-300",
                    "prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline dark:prose-a:text-blue-400",
                    "prose-strong:font-semibold prose-strong:text-gray-900 dark:prose-strong:text-gray-100",
                    "prose-code:text-blue-600 prose-code:bg-blue-50 prose-code:px-1 prose-code:rounded dark:prose-code:bg-gray-700 dark:prose-code:text-blue-300",
                    "prose-pre:bg-gray-50 prose-pre:border prose-pre:border-gray-200 dark:prose-pre:bg-gray-700 dark:prose-pre:border-gray-600",
                    "prose-img:rounded-lg prose-img:shadow-md prose-img:mx-auto",
                    "prose-ul:list-disc prose-ol:list-decimal",
                    "prose-li:marker:text-gray-400 dark:prose-li:marker:text-gray-500",
                    "[&_.tiptap]:min-h-[150px] [&_.tiptap]:p-4",
                    "[&_.tiptap.ProseMirror-focused]:outline-none",
                    "[&_.tiptap]:prose-sm [&_.tiptap]:sm:prose-base",
                    "[&_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)] [&_p.is-editor-empty:first-child]:before:text-gray-400",
                    "[&_.tiptap_p]:my-3 [&_.tiptap_h1]:my-4 [&_.tiptap_h2]:my-4 [&_.tiptap_h3]:my-3",
                    "[&_.tiptap_ul]:my-3 [&_.tiptap_ol]:my-3 [&_.tiptap_blockquote]:my-3",
                    "[&_.tiptap_pre]:my-3 [&_.tiptap_hr]:my-4",
                    // Amélioration pour les textes colorés et surlignés en mode sombre
                    "[&_[style*='color']]:dark:text-opacity-100 [&_[style*='color']]:dark:!important",
                    "[&_mark]:dark:!text-gray-100 [&_mark]:dark:contrast-125"
                  )}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setContent(initialContent);
                    setTitle(initialTitle);
                  }}
                  className="bg-white hover:bg-gray-50"
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    try {
                      await handleSave();
                      setIsEditing(false);
                      toast({
                        title: "Success",
                        description: "Card updated successfully",
                      });
                    } catch (error) {
                      console.error('Error saving:', error);
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          ) : (
            <div 
              className="relative"
              onClick={() => !isZoomed && setIsZoomed(true)}
            >
              <div 
                className={cn(
                  "prose prose-sm sm:prose-base max-w-none",
                  "dark:prose-invert", // Utiliser prose-invert pour le mode sombre
                  "prose-headings:font-semibold prose-headings:text-gray-900 dark:prose-headings:text-white",
                  "prose-p:text-gray-700 dark:prose-p:text-gray-200", 
                  "prose-a:text-blue-600 dark:prose-a:text-blue-300",
                  "prose-strong:font-semibold prose-strong:text-gray-900 dark:prose-strong:text-white",
                  "prose-code:text-blue-600 dark:prose-code:text-blue-300",
                  "prose-pre:bg-gray-50 dark:prose-pre:bg-gray-800",
                  "prose-img:rounded-lg prose-img:shadow-md prose-img:mx-auto",
                  "prose-ul:list-disc prose-ol:list-decimal",
                  "prose-li:marker:text-gray-400 dark:prose-li:marker:text-gray-400",
                  // Ajout de classes spécifiques pour le contrôle du contenu des cartes maîtrisées
                  mastered && "mastered-content dark:prose-p:text-gray-900",
                  !isZoomed && "max-h-[300px] overflow-hidden cursor-pointer"
                )}
                dangerouslySetInnerHTML={{ __html: content }}
              />
              {!isZoomed && content.length > 300 && (
                <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white dark:from-gray-800 to-transparent pointer-events-none" />
              )}
            </div>
          )}
        </div>

        {/* Meta Section */}
        <div className={cn(
          "flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between text-sm",
          // Ajout d'une classe spécifique pour la section meta
          mastered && "mastered-meta"
        )}>
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
            <Clock className="w-4 h-4" />
            <span className="updated-text">Updated {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className={cn(
                  "px-2 py-0.5",
                  "bg-white dark:bg-gray-700",
                  "border border-gray-200 dark:border-gray-600",
                  "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                )}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardFooter className={cn(
        "flex justify-between p-4 sm:p-6 gap-4",
        "bg-gradient-to-b from-transparent via-gray-50/50 to-gray-100/50 dark:from-transparent dark:via-gray-800/30 dark:to-gray-900/30"
      )}>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "text-sm transition-colors flex-1 sm:flex-none justify-start sm:justify-center",
            mastered 
              ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/30" 
              : "text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:text-green-400 dark:hover:bg-green-900/30"
          )}
          onClick={toggleMastered}
        >
          {mastered ? (
            <BookmarkCheck className="w-4 h-4 mr-2 text-emerald-500 dark:text-emerald-400" />
          ) : (
            <Bookmark className="w-4 h-4 mr-2 text-emerald-500 dark:text-green-400" />
          )}
          <span className="mastered-text">{mastered ? 'Mastered' : 'Mark as Mastered'}</span>
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "text-sm transition-colors",
            "text-red-600 hover:text-red-700 hover:bg-red-50"
          )}
          onClick={() => setShowDeleteDialog(true)}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          <span>Delete</span>
        </Button>
      </CardFooter>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-background">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold text-foreground">
              Delete Card
            </AlertDialogTitle>
            <AlertDialogDescription className="mt-3 text-muted-foreground">
              <div className="space-y-3">
                <p>
                  Are you sure you want to delete <span className="font-medium text-foreground">"{title}"</span>?
                </p>
                <div className="flex items-center gap-2 p-3 bg-amber-50 text-amber-800 rounded-lg border border-amber-200">
                  <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                  <p className="text-sm">
                    This action cannot be undone. The card will be permanently deleted.
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Card
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Zoomed View Dialog */}
      <Dialog open={isZoomed} onOpenChange={setIsZoomed}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto p-6 sm:p-8 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
          <DialogHeader>
            <DialogTitle className={cn(
              "text-2xl font-semibold",
              "text-gray-800 dark:text-white",
            )}>
              {title}
            </DialogTitle>
          </DialogHeader>
          <div className={cn(
            "prose prose-lg max-w-none mt-6",
            "dark:prose-invert",
            "prose-headings:font-semibold prose-headings:text-gray-900 dark:prose-headings:text-white",
            "prose-p:text-gray-700 dark:prose-p:text-gray-200",
            "prose-a:text-blue-600 dark:prose-a:text-blue-300",
            "prose-strong:font-semibold prose-strong:text-gray-900 dark:prose-strong:text-white",
            "prose-code:text-blue-600 dark:prose-code:text-blue-300 dark:prose-code:bg-gray-700",
            "prose-pre:bg-gray-50 dark:prose-pre:bg-gray-700 prose-pre:border dark:prose-pre:border-gray-600",
            "prose-img:rounded-lg prose-img:shadow-lg prose-img:mx-auto",
            "prose-ul:list-disc prose-ol:list-decimal",
            "prose-li:marker:text-gray-400 dark:prose-li:marker:text-gray-400"
          )} 
          dangerouslySetInnerHTML={{ __html: content }} 
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
};
