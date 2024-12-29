import React, { useState } from 'react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Edit, Save, X, Tag, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { CardMedia } from '@/types';
import { RichTextEditor } from './RichTextEditor';

interface EnhancedLearningCardProps {
  id: string;
  title: string;
  content: string;
  media?: CardMedia[];
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
  onSave: (data: {
    id: string;
    title: string;
    content: string;
    media?: CardMedia[];
    tags: string[];
  }) => Promise<boolean>;
  onDelete: (id: string) => void;
}

export const EnhancedLearningCard: React.FC<EnhancedLearningCardProps> = ({
  id,
  title: initialTitle,
  content: initialContent,
  media: initialMedia = [],
  tags: initialTags,
  updatedAt,
  onSave,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [media, setMedia] = useState<CardMedia[]>(initialMedia);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [newTag, setNewTag] = useState('');

  const handleSave = async () => {
    const result = await onSave({
      id,
      title,
      content,
      media,
      tags,
    });
    if (result) {
      setIsEditing(false);
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

  return (
    <Card className="w-full h-full bg-card hover:shadow-lg transition-shadow duration-200 flex flex-col">
      <CardHeader className="space-y-0 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex-1 mr-4">
            {isEditing ? (
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-xl font-semibold border-2 focus:border-primary"
                placeholder="Enter title..."
              />
            ) : (
              <h3 className="text-xl font-semibold text-primary">{title}</h3>
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0">
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

      <CardContent className="flex-1 space-y-4">
        <div className="min-h-[150px] relative">
          <RichTextEditor
            content={content}
            onChange={setContent}
            editable={isEditing}
            className="min-h-[150px]"
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="px-2 py-1 text-sm hover:bg-secondary/80 transition-colors"
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
              className="w-24 h-7 text-sm"
            />
          )}
        </div>
      </CardContent>

      {isEditing && (
        <CardFooter className="flex justify-end pt-2">
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
