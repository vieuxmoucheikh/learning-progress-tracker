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
import { getLearningItems, updateLearningItem } from '@/lib/database';
import { incrementLearningActivity } from '@/lib/learningActivity';

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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemCategory, setItemCategory] = useState(initialCategory);
  const [categories, setCategories] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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
      const success = await onSave({ id, title, content, media, tags });
      if (success) {
        const currentDate = new Date('2025-01-03T08:21:21+01:00').toISOString().split('T')[0];
        await incrementLearningActivity(itemCategory || 'Uncategorized', currentDate);
        toast({
          title: "Success",
          description: "Card updated successfully",
        });
      }
    } catch (error) {
      console.error('Error saving card:', error);
      toast({
        title: "Error",
        description: "Failed to save card",
        variant: "destructive",
      });
    }
  };

  const handleUpdateCategory = async (category: string) => {
    try {
      const success = await onSave({ ...{ id, title, content, media, tags, mastered }, category });
      if (success) {
        const currentDate = new Date('2025-01-03T08:21:21+01:00').toISOString().split('T')[0];
        await incrementLearningActivity(category, currentDate);
        toast({
          title: "Success",
          description: "Card updated successfully",
        });
      }
    } catch (error) {
      console.error('Error updating category:', error);
      toast({
        title: "Error",
        description: "Failed to update category",
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
      const success = await onSave({ ...{ id, title, content, media, tags }, mastered: !mastered });
      if (success) {
        // Track the learning activity when marking as mastered
        if (!mastered) {
          console.log('Tracking activity for category:', itemCategory);
          const currentDate = new Date('2025-01-03T08:21:21+01:00').toISOString().split('T')[0];
          await incrementLearningActivity(itemCategory || 'Uncategorized', currentDate);
        }
        setMastered(!mastered);
        toast({
          title: "Success",
          description: `Card marked as ${!mastered ? 'mastered' : 'not mastered'}`,
        });
      }
    } catch (error) {
      console.error('Error toggling mastered:', error);
      toast({
        title: "Error",
        description: "Failed to update mastered status",
        variant: "destructive",
      });
    }
  };

  const handleComplete = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      console.log('Completing item:', id);
      const currentCategory = itemCategory || 'Uncategorized';
      const currentDate = new Date('2025-01-03T08:21:21+01:00').toISOString().split('T')[0];
      
      // Track the learning activity first
      console.log('Tracking activity:', { category: currentCategory, date: currentDate });
      await incrementLearningActivity(currentCategory, currentDate);
      
      // Then update the learning item
      const updatedItem = await updateLearningItem(id, {
        completed: true,
        completed_at: new Date('2025-01-03T08:21:21+01:00').toISOString(),
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
      "relative w-full h-full transition-all duration-200 ease-in-out",
      "bg-card border-2 shadow-sm hover:shadow-md",
      mastered ? "border-emerald-500/50 hover:border-emerald-500 hover:shadow-emerald-100" : 
                "border-transparent hover:border-blue-600/50 hover:shadow-blue-100",
      isEditing && "border-blue-600 shadow-blue-100"
    )}>
      <CardHeader className="relative pb-3 space-y-2">
        {isEditing ? (
          <div className="flex flex-col gap-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1.5"
              />
            </div>

            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="category">Category</Label>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="justify-between"
                  >
                    {itemCategory || "Select category..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                  <Command>
                    <CommandInput 
                      placeholder="Search category..."
                      value={itemCategory}
                      onValueChange={(value) => {
                        setItemCategory(value);
                      }}
                    />
                    <CommandEmpty>
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No category found. Type to create new.
                      </div>
                    </CommandEmpty>
                    <CommandGroup>
                      {categories
                        .filter(cat => !itemCategory || cat.toLowerCase().includes(itemCategory.toLowerCase()))
                        .map((cat) => (
                          <CommandItem
                            key={cat}
                            value={cat}
                            className="cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
                            onSelect={() => {
                              handleUpdateCategory(cat);
                              setOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                itemCategory === cat ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {cat}
                          </CommandItem>
                        ))}
                      {itemCategory && !categories.includes(itemCategory) && (
                        <CommandItem
                          value={itemCategory}
                          className="cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
                          onSelect={() => {
                            // Keep the typed category and close
                            setOpen(false);
                          }}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Create "{itemCategory}"
                        </CommandItem>
                      )}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
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
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-lg line-clamp-2 bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">
                  {title}
                </h3>
                {itemCategory && (
                  <div className="mt-1 text-sm text-blue-600 dark:text-blue-400">
                    {itemCategory}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsZoomed(true)}
                  className="h-8 w-8 hover:bg-blue-100 dark:hover:bg-blue-950/50"
                >
                  <ZoomIn className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleContentVisibility}
                  className="h-8 w-8 hover:bg-blue-100 dark:hover:bg-blue-950/50"
                >
                  {isContentHidden ? (
                    <Eye className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditing(true)}
                  className="h-8 w-8 hover:bg-blue-100 dark:hover:bg-blue-950/50"
                >
                  <Edit className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                </Button>
              </div>
            </div>
            <div 
              className={cn(
                "space-y-3 transition-all duration-200",
                isContentHidden && "blur-md select-none"
              )}
            >
              <div 
                className="prose prose-sm max-w-none dark:prose-invert line-clamp-6 hover:line-clamp-none transition-all cursor-pointer"
                onClick={() => setIsZoomed(true)}
                dangerouslySetInnerHTML={{ __html: content }}
              />
              
              <div className="flex flex-wrap gap-1.5 pt-2">
                {tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-xs text-muted-foreground">
          Updated {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}
        </div>
      </CardContent>

      <CardFooter className="flex justify-between pt-3 pb-4">
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button 
                onClick={handleSave} 
                size="sm" 
                className="bg-blue-700 hover:bg-blue-800 text-white shadow-sm hover:shadow dark:bg-blue-800 dark:hover:bg-blue-900"
              >
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
                size="sm"
                className="shadow-sm hover:shadow border-blue-200 hover:border-blue-300 dark:border-blue-800 dark:hover:border-blue-700"
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="shadow-sm hover:shadow text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/50"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyContent}
                className="hover:bg-blue-100 text-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/50"
              >
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMastered}
                className={cn(
                  "hover:bg-emerald-50 dark:hover:bg-emerald-950/50",
                  mastered ? "text-emerald-600 dark:text-emerald-400" : "text-gray-500 dark:text-gray-400"
                )}
              >
                <Trophy className="h-4 w-4 mr-1" />
                {mastered ? "Mastered" : "Mark as Mastered"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleComplete}
                className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-950/50"
              >
                <Check className="h-4 w-4 mr-1" />
                Complete
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/50"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </>
          )}
        </div>
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
