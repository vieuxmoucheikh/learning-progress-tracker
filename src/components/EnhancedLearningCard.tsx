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
    const result = await onSave({
      id,
      title,
      content,
      tags,
      category,
      mastered,
    });
    if (result) {
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Card updated successfully",
      });
      await trackLearningActivity(category);
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

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTag.trim()) {
      if (!tags.includes(newTag.trim())) {
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
    return formatDistanceToNow(new Date(date), { addSuffix: true });
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
      "relative overflow-hidden transition-all duration-300 border-2",
      "hover:shadow-lg hover:shadow-blue-100/50 dark:hover:shadow-blue-900/30",
      isZoomed ? "transform scale-105 shadow-xl z-10" : "",
      mastered 
        ? "border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-950/30" 
        : "border-transparent hover:border-blue-200 dark:hover:border-blue-800",
      isEditing && "border-blue-300 dark:border-blue-700"
    )}>
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-center justify-between">
          {isEditing ? (
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg font-semibold focus-visible:ring-blue-400"
              placeholder="Enter title..."
            />
          ) : (
            <h3 className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
              {title}
            </h3>
          )}
          <div className="flex items-center space-x-1.5">
            {mastered && (
              <Trophy className="w-4 h-4 text-yellow-500 animate-pulse" />
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowContent(!showContent)}
              className="h-8 w-8 hover:bg-blue-50 dark:hover:bg-blue-950/50"
              title={showContent ? "Hide content" : "Show content"}
            >
              {showContent ? (
                <EyeOff className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              ) : (
                <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsEditing(!isEditing)}
              className="h-8 w-8 hover:bg-blue-50 dark:hover:bg-blue-950/50"
              title={isEditing ? "Save changes" : "Edit card"}
            >
              {isEditing ? (
                <Save className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              ) : (
                <Edit className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsZoomed(!isZoomed)}
              className="h-8 w-8 hover:bg-blue-50 dark:hover:bg-blue-950/50"
            >
              {isZoomed ? (
                <ZoomOut className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              ) : (
                <ZoomIn className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              )}
            </Button>
          </div>
        </div>
        
        {/* Time and Category Info */}
        <div className="flex items-center text-sm text-muted-foreground space-x-2">
          <Clock className="w-4 h-4" />
          <span>Updated {getTimeAgo(updatedAt)}</span>
          {category && (
            <>
              <span>•</span>
              <span className="text-blue-600 dark:text-blue-400">{category}</span>
            </>
          )}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <Badge 
              key={tag} 
              variant="secondary"
              className={cn(
                "bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200/50 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/50",
                isEditing && "cursor-pointer hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-950/50 dark:hover:text-red-400"
              )}
              onClick={isEditing ? () => handleRemoveTag(tag) : undefined}
            >
              {tag}
              {isEditing && <X className="w-3 h-3 ml-1" />}
            </Badge>
          ))}
          {isEditing && (
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder="Add tag..."
              className="w-24 h-6 text-sm bg-blue-50/50 border-blue-200/50 focus-visible:ring-blue-400 dark:bg-blue-950/30 dark:border-blue-800/50"
            />
          )}
        </div>
      </CardHeader>

      <CardContent className={cn(
        "transition-all duration-300",
        isEditing ? "bg-white dark:bg-transparent" : "hover:bg-blue-50/50 dark:hover:bg-blue-950/30"
      )}>
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="title" className="text-sm font-medium text-blue-600 dark:text-blue-400">
                Title
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1.5 focus-visible:ring-blue-400"
              />
            </div>

            <div>
              <Label htmlFor="content" className="text-sm font-medium text-blue-600 dark:text-blue-400">
                Content
              </Label>
              <div className="mt-1.5 rounded-lg border border-input bg-white dark:bg-gray-950">
                <RichTextEditor
                  content={content}
                  onChange={setContent}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setTitle(initialTitle);
                  setContent(initialContent);
                  setTags(initialTags);
                  setCategory(initialCategory);
                }}
                className="border-blue-200 hover:border-blue-300 hover:bg-blue-50 dark:border-blue-800 dark:hover:border-blue-700 dark:hover:bg-blue-950/50"
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  const success = await onSave({
                    id,
                    title,
                    content,
                    tags,
                    category,
                    mastered,
                  });
                  if (success) {
                    setIsEditing(false);
                    toast({
                      title: "Success",
                      description: "Card updated successfully",
                    });
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-800"
              >
                Save Changes
              </Button>
            </div>
          </div>
        ) : (
          <div 
            className={cn(
              "space-y-3 transition-all duration-300",
              !showContent && "blur-md select-none"
            )}
          >
            <div 
              className="prose prose-sm max-w-none dark:prose-invert hover:prose-a:text-blue-600 prose-headings:text-blue-700 dark:prose-headings:text-blue-400 line-clamp-6 hover:line-clamp-none transition-all cursor-pointer"
              onClick={() => setIsZoomed(true)}
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between py-3 bg-gradient-to-b from-transparent to-blue-50/30 dark:to-blue-950/30">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "text-sm transition-colors",
              mastered 
                ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-950/50" 
                : "text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-950/50"
            )}
            onClick={() => setMastered(!mastered)}
          >
            {mastered ? (
              <>
                <BookmarkCheck className="w-4 h-4 mr-1" />
                Mastered
              </>
            ) : (
              <>
                <Bookmark className="w-4 h-4 mr-1" />
                Mark as Mastered
              </>
            )}
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-sm text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/50"
          onClick={onDelete}
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Delete
        </Button>
      </CardFooter>

      <Dialog open={isZoomed} onOpenChange={setIsZoomed}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
              {title}
            </DialogTitle>
          </DialogHeader>
          <div className="prose prose-blue max-w-none dark:prose-invert mt-4" dangerouslySetInnerHTML={{ __html: content }} />
        </DialogContent>
      </Dialog>
    </Card>
  );
};
