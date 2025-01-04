import React, { useState, useRef, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Edit, 
  Save, 
  X, 
  Tag, 
  Clock, 
  Copy, 
  Eye, 
  EyeOff, 
  Bookmark, 
  BookmarkCheck, 
  ZoomIn, 
  ZoomOut, 
  Trash2, 
  Check, 
  Plus, 
  ChevronsUpDown,
  Trophy
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { EnhancedLearningCard as CardType, NewEnhancedLearningCard } from '@/types';
import { RichTextEditor } from './RichTextEditor';
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
import { getLearningItems, trackLearningActivity } from '@/lib/database';

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
  const [tags, setTags] = useState(initialTags);
  const [newTag, setNewTag] = useState('');
  const [category, setCategory] = useState(initialCategory);
  const [mastered, setMastered] = useState(initialMastered);
  const [showContent, setShowContent] = useState(true);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [updatedTime, setUpdatedTime] = useState(updatedAt);
  const contentRef = useRef<HTMLDivElement>(null);
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
    try {
      await onSave({
        id,
        title,
        content,
        tags,
        category,
        mastered,
        updatedAt: new Date().toISOString(),
      });
      return true;
    } catch (error) {
      console.error('Error saving card:', error);
      toast({
        title: 'Error',
        description: 'Failed to save changes',
        variant: 'destructive',
      });
      return false;
    }
  };

  const handleUpdateCategory = async (category: string) => {
    try {
      const success = await onSave({ ...{ id, title, content, tags, mastered }, category });
      if (success) {
        await trackLearningActivity(category);
        toast({
          title: "Success",
          description: "Card updated successfully",
        });
      }
    } catch (error) {
      console.error('Error updating card:', error);
      toast({
        title: "Error",
        description: "Failed to update card",
        variant: "destructive",
      });
    }
  };

  const handleAddTag = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedTag = newTag.trim().toLowerCase(); // Normalize tags to lowercase
    if (trimmedTag && !tags.includes(trimmedTag)) {
      const updatedTags = [...tags, trimmedTag];
      setTags(updatedTags);
      setNewTag('');
      
      // Save the updated tags
      onSave({
        id,
        title,
        content,
        tags: updatedTags,
        category,
        mastered,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    const updatedTags = tags.filter(tag => tag !== tagToRemove);
    setTags(updatedTags);
    
    // Save the updated tags
    await onSave({
      id,
      title,
      content,
      tags: updatedTags,
      category,
      mastered,
      updatedAt: new Date().toISOString(),
    });
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

  const handleMasteredToggle = async () => {
    const newMasteredState = !mastered;
    const success = await onSave({
      id,
      title,
      content,
      tags,
      category,
      mastered: newMasteredState,
      updatedAt: new Date().toISOString(),
    });

    if (success) {
      setMastered(newMasteredState);
      toast({
        title: "Success",
        description: `Card marked as ${newMasteredState ? 'mastered' : 'not mastered'}`,
      });
    }
  };

  const toggleMastered = async () => {
    try {
      const success = await onSave({
        id,
        mastered: !mastered,
        category
      });

      if (success) {
        // Track the learning activity when marking as mastered
        if (!mastered) {
          console.log('Tracking activity for category:', category);
          await trackLearningActivity(category || 'Uncategorized');
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

  const toggleContentVisibility = () => {
    setShowContent(!showContent);
  };

  const getTimeAgo = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'some time ago';
    }
  };

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
      "relative overflow-hidden transition-all duration-300 border-2 h-full",
      "hover:shadow-lg hover:shadow-blue-300/50 dark:hover:shadow-blue-900/30",
      "max-w-3xl mx-auto",
      "bg-white dark:bg-gray-900",
      "sm:rounded-xl",
      isZoomed ? "transform scale-105 shadow-xl z-10" : "",
      mastered 
        ? "border-emerald-400 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/30 dark:to-gray-900" 
        : "border-blue-400 hover:border-blue-500 dark:border-blue-500 dark:hover:border-blue-400",
      isEditing && "border-blue-500 dark:border-blue-400 shadow-lg shadow-blue-300/50 dark:shadow-blue-900/30"
    )}>
      <CardHeader className="space-y-4 pb-4 px-4 sm:px-6">
        {/* Title Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={cn(
                  "text-lg font-semibold",
                  "bg-white dark:bg-gray-800",
                  "text-gray-900 dark:text-gray-100",
                  "border-gray-200 dark:border-gray-700",
                  "focus-visible:ring-2 focus-visible:ring-blue-500",
                  "placeholder:text-gray-400 dark:placeholder:text-gray-500",
                  "w-full sm:text-xl"
                )}
                placeholder="Enter title..."
              />
            ) : (
              <h3 
                className={cn(
                  "text-xl sm:text-2xl font-semibold line-clamp-2",
                  "bg-gradient-to-r from-blue-900 via-blue-700 to-blue-800",
                  "dark:from-blue-400 dark:via-blue-300 dark:to-blue-400",
                  "bg-clip-text text-transparent",
                  "hover:from-blue-800 hover:via-blue-600 hover:to-blue-700",
                  "dark:hover:from-blue-300 dark:hover:via-blue-200 dark:hover:to-blue-300",
                  "cursor-pointer"
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
              className="h-9 w-9 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg"
              title={showContent ? "Hide content" : "Show content"}
            >
              {showContent ? (
                <EyeOff className="w-5 h-5 text-blue-900 dark:text-blue-200" />
              ) : (
                <Eye className="w-5 h-5 text-blue-900 dark:text-blue-200" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsEditing(!isEditing)}
              className="h-9 w-9 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg"
              title={isEditing ? "Save changes" : "Edit card"}
            >
              {isEditing ? (
                <Save className="w-5 h-5 text-blue-900 dark:text-blue-200" />
              ) : (
                <Edit className="w-5 h-5 text-blue-900 dark:text-blue-200" />
              )}
            </Button>
          </div>
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
              <RichTextEditor
                content={content}
                onChange={setContent}
                className={cn(
                  "min-h-[150px] p-4 rounded-lg",
                  "bg-white dark:bg-gray-800/50",
                  "text-gray-900 dark:text-gray-100",
                  "border border-gray-200 dark:border-gray-700/50",
                  "focus-within:ring-2 focus-within:ring-blue-500",
                  "prose dark:prose-invert prose-sm sm:prose-base max-w-none",
                  "prose-img:my-4 prose-img:rounded-lg prose-img:max-w-full prose-img:mx-auto",
                  "prose-headings:text-gray-900 dark:prose-headings:text-gray-100",
                  "prose-p:text-gray-700 dark:prose-p:text-gray-300",
                  "prose-a:text-blue-600 dark:prose-a:text-blue-400",
                  "prose-blockquote:border-l-blue-500",
                  "prose-pre:bg-gray-100 dark:prose-pre:bg-gray-800"
                )}
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setContent(initialContent);
                    setTitle(initialTitle);
                  }}
                  className="bg-white hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-800"
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    try {
                      const saved = await handleSave();
                      if (saved) {
                        setIsEditing(false);
                        toast({
                          title: "Success",
                          description: "Card updated successfully",
                        });
                      }
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
                  "prose prose-sm sm:prose-base max-w-none dark:prose-invert",
                  "prose-img:my-4 prose-img:rounded-lg prose-img:max-w-full prose-img:mx-auto prose-img:shadow-md",
                  "prose-headings:text-gray-900 dark:prose-headings:text-gray-100",
                  "prose-p:text-gray-700 dark:prose-p:text-gray-300",
                  "prose-a:text-blue-600 dark:prose-a:text-blue-400",
                  "prose-blockquote:border-l-blue-500",
                  "prose-pre:bg-gray-100 dark:prose-pre:bg-gray-800",
                  !isZoomed && "max-h-[300px] overflow-hidden cursor-pointer"
                )}
                dangerouslySetInnerHTML={{ __html: content }}
              />
              {!isZoomed && content.length > 300 && (
                <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white dark:from-gray-900 to-transparent pointer-events-none" />
              )}
            </div>
          )}
        </div>

        {/* Meta Section */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between text-sm">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Clock className="w-4 h-4" />
            <span>Updated {getTimeAgo(updatedAt)}</span>
            {category && (
              <span>•</span>
            )}
            {category && (
              <span className="font-medium">{category}</span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {tags.map((tag, index) => (
              <Badge
                key={`${tag}-${index}`}
                variant={isEditing ? "secondary" : "default"}
                className={cn(
                  "text-sm px-2.5 py-0.5 rounded-full transition-all duration-200",
                  isEditing 
                    ? "cursor-pointer hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900 dark:hover:text-red-300"
                    : "bg-blue-100 text-blue-900 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-100 dark:hover:bg-blue-800/50"
                )}
                onClick={() => isEditing && handleRemoveTag(tag)}
              >
                {tag}
                {isEditing && (
                  <X className="w-3 h-3 ml-1.5 inline-block" />
                )}
              </Badge>
            ))}
            {isEditing && (
              <form onSubmit={handleAddTag} className="inline-flex">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add tag..."
                  className={cn(
                    "h-7 text-sm w-24 sm:w-32",
                    "bg-white dark:bg-gray-800",
                    "text-gray-900 dark:text-gray-100",
                    "border-gray-200 dark:border-gray-700",
                    "focus-visible:ring-2 focus-visible:ring-blue-500",
                    "placeholder:text-gray-400 dark:placeholder:text-gray-500",
                    "rounded-full"
                  )}
                />
              </form>
            )}
          </div>
        </div>
      </CardHeader>

      <CardFooter className={cn(
        "flex justify-between p-4 sm:p-6 gap-4",
        "bg-gradient-to-b from-transparent via-gray-50/50 to-gray-100/50",
        "dark:from-transparent dark:via-gray-800/30 dark:to-gray-800/50"
      )}>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "text-sm transition-colors flex-1 sm:flex-none justify-start sm:justify-center",
            mastered 
              ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-950/50" 
              : "text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-950/50"
          )}
          onClick={handleMasteredToggle}
        >
          {mastered ? (
            <BookmarkCheck className="w-4 h-4 mr-2" />
          ) : (
            <Bookmark className="w-4 h-4 mr-2" />
          )}
          <span>{mastered ? 'Mastered' : 'Mark as Mastered'}</span>
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "text-sm transition-colors",
            "text-red-600 hover:text-red-700 hover:bg-red-50",
            "dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/50"
          )}
          onClick={onDelete}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          <span>Delete</span>
        </Button>
      </CardFooter>

      {/* Zoomed View Dialog */}
      <Dialog open={isZoomed} onOpenChange={setIsZoomed}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto p-6 sm:p-8 bg-white dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className={cn(
              "text-2xl font-semibold",
              "bg-gradient-to-r from-blue-600 to-blue-400",
              "bg-clip-text text-transparent"
            )}>
              {title}
            </DialogTitle>
          </DialogHeader>
          <div className={cn(
            "prose prose-lg max-w-none dark:prose-invert mt-6",
            "prose-img:rounded-lg prose-img:shadow-lg prose-img:mx-auto",
            "prose-headings:text-gray-900 dark:prose-headings:text-gray-100",
            "prose-p:text-gray-700 dark:prose-p:text-gray-300",
            "prose-a:text-blue-600 dark:prose-a:text-blue-400"
          )} 
          dangerouslySetInnerHTML={{ __html: content }} 
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
};
