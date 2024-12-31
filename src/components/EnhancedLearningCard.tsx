import React, { useState, useRef, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Edit, Save, X, Tag, Clock, Copy, Eye, EyeOff, Bookmark, BookmarkCheck, ZoomIn, ZoomOut, Trash2 } from 'lucide-react';
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

type EnhancedLearningCardProps = CardType & {
  onSave: (data: Partial<CardType>) => Promise<boolean>;
  onDelete: (id: string) => void;
  mastered?: boolean;
};

export const EnhancedLearningCard: React.FC<EnhancedLearningCardProps> = ({
  id,
  title: initialTitle,
  content: initialContent,
  media: initialMedia = [],
  tags: initialTags,
  createdAt,
  updatedAt,
  onSave,
  onDelete,
  mastered: initialMastered = false,
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
  const contentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handleSave = async () => {
    const result = await onSave({
      id,
      title,
      content,
      media,
      tags,
      mastered,
    });
    if (result) {
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Card updated successfully",
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
    const newMasteredState = !mastered;
    const result = await onSave({
      id,
      mastered: newMasteredState,
    });
    if (result) {
      setMastered(newMasteredState);
      toast({
        title: newMasteredState ? "Mastered!" : "Unmastered",
        description: newMasteredState ? "Card marked as mastered" : "Card marked as not mastered",
      });
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
                "border-transparent hover:border-blue-500/50 hover:shadow-blue-50",
      isEditing && "border-blue-500 shadow-blue-100"
    )}>
      <CardHeader className="relative pb-3 space-y-2">
        {isEditing ? (
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="font-semibold text-lg"
            placeholder="Card Title"
          />
        ) : (
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg line-clamp-2 text-foreground/90">{title}</h3>
            <div className="flex gap-1 ml-2 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsZoomed(true)}
                className="h-8 w-8 hover:bg-blue-50 dark:hover:bg-blue-950/50"
              >
                <ZoomIn className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleContentVisibility}
                className="h-8 w-8 hover:bg-blue-50 dark:hover:bg-blue-950/50"
              >
                {isContentHidden ? (
                  <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                ) : (
                  <EyeOff className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditing(true)}
                className="h-8 w-8 hover:bg-blue-50 dark:hover:bg-blue-950/50"
              >
                <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </Button>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Updated {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}</span>
        </div>
      </CardHeader>

      <CardContent className={cn(
        "space-y-3 transition-all duration-200",
        isContentHidden && "blur-md select-none"
      )}>
        {isEditing ? (
          <RichTextEditor
            content={content}
            onChange={setContent}
            className="min-h-[150px]"
          />
        ) : (
          <div 
            className="prose prose-sm max-w-none dark:prose-invert line-clamp-6 hover:line-clamp-none transition-all cursor-pointer"
            onClick={() => setIsZoomed(true)}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        )}
        
        <div className="flex flex-wrap gap-1.5 pt-2">
          {tags.map((tag, index) => (
            <Badge
              key={index}
              variant={isEditing ? "outline" : "secondary"}
              className={cn(
                "flex items-center gap-1 transition-colors bg-blue-50 text-blue-700 hover:bg-blue-100",
                "dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-950",
                isEditing && "pr-1 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 dark:hover:text-red-400"
              )}
            >
              {tag}
              {isEditing && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveTag(tag)}
                  className="h-4 w-4 p-0 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </Badge>
          ))}
          {isEditing && (
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder="Add tag..."
              className="w-24 h-6 text-xs"
            />
          )}
        </div>
      </CardContent>

      <CardFooter className="flex justify-between pt-3 pb-4">
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button 
                onClick={handleSave} 
                size="sm" 
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow dark:bg-blue-700 dark:hover:bg-blue-800"
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
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyContent}
                className="hover:bg-blue-50 text-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/50"
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
                  mastered ? "text-emerald-600 dark:text-emerald-400" : "text-blue-600 dark:text-blue-400"
                )}
              >
                {mastered ? (
                  <BookmarkCheck className="h-4 w-4 mr-1" />
                ) : (
                  <Bookmark className="h-4 w-4 mr-1" />
                )}
                {mastered ? "Mastered" : "Mark as Mastered"}
              </Button>
            </>
          )}
        </div>
      </CardFooter>

      <Dialog open={isZoomed} onOpenChange={setIsZoomed}>
        <DialogContent className="w-[95vw] sm:w-[90vw] max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-xl sm:text-2xl font-semibold text-center bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
              {title}
            </DialogTitle>
          </DialogHeader>
          <div className="w-full max-w-[65ch] mx-auto px-2 sm:px-4">
            <div 
              className={cn(
                "prose prose-lg dark:prose-invert",
                "prose-headings:text-blue-800 dark:prose-headings:text-blue-300",
                "prose-a:text-blue-600 dark:prose-a:text-blue-400",
                "prose-strong:text-blue-800 dark:prose-strong:text-blue-300",
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
        </DialogContent>
      </Dialog>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 dark:hover:text-red-400"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="w-[95vw] sm:w-[90vw] max-w-md p-4 sm:p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl text-center text-red-600 dark:text-red-400">
              Delete Card
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Are you sure you want to delete this card? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col space-y-2 sm:flex-row sm:space-x-2 sm:space-y-0">
            <AlertDialogCancel className="flex-1">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(id)}
              className="flex-1 bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
