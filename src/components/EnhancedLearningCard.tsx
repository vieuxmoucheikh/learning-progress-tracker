import React, { useState, useRef, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Edit, Save, X, Tag, Clock, Copy, Eye, EyeOff, Bookmark, BookmarkCheck, ZoomIn, ZoomOut } from 'lucide-react';
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
      "relative w-full transition-all duration-200 ease-in-out",
      mastered && "border-green-500",
      isEditing && "border-blue-500"
    )}>
      <CardHeader className="relative pb-2">
        {isEditing ? (
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="font-semibold"
            placeholder="Card Title"
          />
        ) : (
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{title}</h3>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsZoomed(true)}
                className="h-8 w-8"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleContentVisibility}
                className="h-8 w-8"
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
                className="h-8 w-8"
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
        "space-y-2 transition-all duration-200",
        isContentHidden && "blur-md select-none"
      )}>
        {isEditing ? (
          <RichTextEditor
            content={content}
            onChange={setContent}
            className="min-h-[100px] border rounded-md p-2"
          />
        ) : (
          <div 
            className="prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        )}
        
        <div className="flex flex-wrap gap-1 mt-2">
          {tags.map((tag, index) => (
            <Badge
              key={index}
              variant={isEditing ? "outline" : "secondary"}
              className={cn(
                "flex items-center gap-1",
                isEditing && "pr-1"
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

      <CardFooter className="flex justify-between pt-2">
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button onClick={handleSave} size="sm">
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
                size="sm"
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
              >
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMastered}
                className={cn(
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
        <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="prose prose-lg max-w-none dark:prose-invert mt-4">
            <div dangerouslySetInnerHTML={{ __html: content }} />
          </div>
          <Button
            variant="outline"
            onClick={() => setIsZoomed(false)}
            className="absolute top-2 right-2"
            size="icon"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
