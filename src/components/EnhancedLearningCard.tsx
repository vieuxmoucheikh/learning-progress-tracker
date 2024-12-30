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
      "relative w-full h-full transition-all duration-200 ease-in-out hover:shadow-lg",
      "bg-card border-2",
      mastered ? "border-green-500/50 hover:border-green-500" : "border-transparent hover:border-primary/50",
      isEditing && "border-blue-500"
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
            <h3 className="font-semibold text-lg line-clamp-2">{title}</h3>
            <div className="flex gap-1 ml-2 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsZoomed(true)}
                className="h-8 w-8 hover:bg-primary/10"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleContentVisibility}
                className="h-8 w-8 hover:bg-primary/10"
              >
                {isContentHidden ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditing(true)}
                className="h-8 w-8 hover:bg-primary/10"
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Updated {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}</span>
        </div>
      </CardHeader>

      <CardContent ref={contentRef} className={cn(
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
                "flex items-center gap-1 transition-colors",
                isEditing ? "pr-1 hover:bg-destructive/10" : "hover:bg-primary/20"
              )}
            >
              {tag}
              {isEditing && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveTag(tag)}
                  className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
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
              <Button onClick={handleSave} size="sm" className="shadow-sm hover:shadow">
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
                size="sm"
                className="shadow-sm hover:shadow"
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDelete(id)}
                className="shadow-sm hover:shadow ml-auto"
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
                className="hover:bg-primary/10"
              >
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMastered}
                className={cn(
                  "hover:bg-primary/10",
                  mastered && "text-green-500"
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
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto p-6 sm:p-8">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
          </DialogHeader>
          <div 
            className="prose prose-lg max-w-none dark:prose-invert"
            style={{ 
              maxWidth: '65ch',
              margin: '0 auto',
              padding: '0 16px',
              width: '100%',
              boxSizing: 'border-box'
            }}
          >
            <div 
              dangerouslySetInnerHTML={{ __html: content }}
              className="[&_ul]:list-none [&_ol]:list-none [&_ul>li]:ml-4 [&_ol>li]:ml-4"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setIsZoomed(false)}
            className="absolute top-4 right-4"
            size="icon"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
        </DialogContent>
      </Dialog>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Card</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this card? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
