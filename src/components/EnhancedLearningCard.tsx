import React, { useState } from 'react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Edit, Save, X, Tag, Clock, Copy, Eye, EyeOff, Bookmark, BookmarkCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { EnhancedLearningCard as CardType, NewEnhancedLearningCard } from '@/types';
import { RichTextEditor } from './RichTextEditor';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';

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

  return (
    <Card className={cn(
      "w-full h-full flex flex-col bg-card hover:shadow-lg transition-all duration-200",
      mastered && "border-primary/50"
    )}>
      <CardHeader className="space-y-0 pb-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex-1 mr-4">
            {isEditing ? (
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-xl font-semibold focus-visible:ring-2 ring-offset-2 ring-primary"
                placeholder="Enter title..."
              />
            ) : (
              <h3 className="text-xl font-semibold text-primary">{title}</h3>
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {!isEditing && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsContentHidden(!isContentHidden)}
                  className="hover:scale-105 transition-transform"
                  title={isContentHidden ? "Show content" : "Hide content"}
                >
                  {isContentHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyContent}
                  className="hover:scale-105 transition-transform"
                  title="Copy content"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleMastered}
                  className={cn(
                    "hover:scale-105 transition-transform",
                    mastered && "text-primary"
                  )}
                  title={mastered ? "Mark as not mastered" : "Mark as mastered"}
                >
                  {mastered ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                </Button>
              </>
            )}
            <Button
              variant={isEditing ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                if (isEditing) {
                  handleSave();
                } else {
                  setIsEditing(true);
                }
              }}
              className="hover:scale-105 transition-transform"
            >
              {isEditing ? (
                <>
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </>
              )}
            </Button>
            {isEditing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTitle(initialTitle);
                  setContent(initialContent);
                  setMedia(initialMedia);
                  setTags(initialTags);
                  setIsEditing(false);
                }}
                className="hover:scale-105 transition-transform hover:text-destructive"
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            )}
          </div>
        </div>
        {updatedAt && (
          <div className="flex items-center text-sm text-muted-foreground mt-1">
            <Clock className="h-3 w-3 mr-1" />
            Last updated {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col min-h-0">
        <div className={cn(
          "flex-1 min-h-0 transition-opacity duration-200",
          isContentHidden && !isEditing && "opacity-0"
        )}>
          <RichTextEditor
            content={content}
            onChange={setContent}
            editable={isEditing}
            className="h-full"
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center mt-4 flex-shrink-0">
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="px-2 py-1 text-sm hover:bg-primary/10 transition-colors"
            >
              <Tag className="h-3 w-3 mr-1 inline-block" />
              {tag}
              {isEditing && (
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-2 hover:text-destructive inline-flex items-center"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
          {isEditing && (
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder="Add tag..."
              className="w-28 h-7 text-sm focus-visible:ring-2 ring-offset-2 ring-primary"
            />
          )}
        </div>
      </CardContent>

      {isEditing && (
        <CardFooter className="flex justify-end pt-2 flex-shrink-0">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete(id)}
            className="hover:scale-105 transition-transform"
          >
            <X className="h-4 w-4 mr-1" />
            Delete Card
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};
