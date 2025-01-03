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
  const [showContent, setShowContent] = useState(false);
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
      "relative overflow-hidden transition-all duration-200",
      isZoomed ? "transform scale-105 shadow-xl z-10" : "",
      mastered ? "border-green-200 bg-green-50/30" : ""
    )}>
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between">
          {isEditing ? (
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg font-semibold"
            />
          ) : (
            <h3 className="text-lg font-semibold">{title}</h3>
          )}
          <div className="flex items-center space-x-2">
            {mastered && (
              <Trophy className="w-4 h-4 text-yellow-500" />
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowContent(!showContent)}
              title={showContent ? "Hide content" : "Show content"}
            >
              {showContent ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsEditing(!isEditing)}
              title={isEditing ? "Save changes" : "Edit card"}
            >
              {isEditing ? (
                <Save className="w-4 h-4" />
              ) : (
                <Edit className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsZoomed(!isZoomed)}
            >
              {isZoomed ? (
                <ZoomOut className="w-4 h-4" />
              ) : (
                <ZoomIn className="w-4 h-4" />
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
              <span>{category}</span>
            </>
          )}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge 
              key={tag} 
              variant="secondary"
              className={isEditing ? "cursor-pointer hover:bg-destructive/20" : ""}
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
              placeholder="Add tag (press Enter)"
              className="w-32 h-6 text-sm"
            />
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="content">Content</Label>
              <div className="mt-1.5">
                <RichTextEditor
                  content={content}
                  onChange={setContent}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setTitle(initialTitle);
                  setContent(initialContent);
                  setTags(initialTags);
                  setCategory(initialCategory);
                }}
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
              >
                Save Changes
              </Button>
            </div>
          </div>
        ) : (
          <div 
            className={cn(
              "space-y-3 transition-all duration-200",
              !showContent && "blur-md select-none"
            )}
          >
            <div 
              className="prose prose-sm max-w-none dark:prose-invert line-clamp-6 hover:line-clamp-none transition-all cursor-pointer"
              onClick={() => setIsZoomed(true)}
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
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
          className="text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Delete
        </Button>
      </CardFooter>

      <Dialog open={isZoomed} onOpenChange={setIsZoomed}>
        <DialogContent className="fixed z-50 left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-[95vw] sm:w-[90vw] max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 sm:rounded-lg">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-xl sm:text-2xl font-semibold text-center bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">
              {title}
            </DialogTitle>
          </DialogHeader>
          <div className="w-full max-w-[65ch] mx-auto px-2 sm:px-4">
            <div 
              className={cn(
                "prose prose-lg dark:prose-invert",
                "prose-headings:text-blue-900 dark:prose-headings:text-blue-300",
                "prose-a:text-blue-700 dark:prose-a:text-blue-400",
                "prose-strong:text-blue-900 dark:prose-strong:text-blue-300",
                "[&_ul]:list-disc [&_ol]:list-decimal",
                "[&_ul>li]:pl-0 [&_ol>li]:pl-0",
                "[&_ul>li]:my-0 [&_ol>li]:my-0",
                "[&_ul]:pl-5 [&_ol]:pl-5",
                "[&_ul]:my-1 [&_ol]:my-1"
              )}
            >
              <div dangerouslySetInnerHTML={{ __html: content }} />
            </div>
          </div>
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="fixed z-50 left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-[95vw] sm:w-[90vw] max-w-md p-4 sm:p-6 sm:rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl text-center text-red-600 dark:text-red-400">
              Delete Card
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Are you sure you want to delete this card? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={() => {
                onDelete();
                setIsDeleteDialogOpen(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
