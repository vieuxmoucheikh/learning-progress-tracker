import React, { useState } from 'react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Edit,
  Save,
  X,
  Tag,
  Clock,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface EnhancedLearningCardProps {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
  onSave: (data: {
    id: string;
    title: string;
    content: string;
    tags: string[];
  }) => void;
  onDelete: (id: string) => void;
}

export const EnhancedLearningCard: React.FC<EnhancedLearningCardProps> = ({
  id,
  title: initialTitle,
  content: initialContent,
  tags: initialTags,
  updatedAt,
  onSave,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [newTag, setNewTag] = useState('');

  const handleSave = () => {
    onSave({
      id,
      title,
      content,
      tags,
    });
    setIsEditing(false);
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
    <Card className="w-full max-w-2xl bg-card hover:shadow-lg transition-shadow duration-200">
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

      <CardContent className="space-y-4">
        <div className="min-h-[200px] relative">
          {isEditing ? (
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[200px] w-full resize-none p-4 text-base leading-relaxed border-2 focus:border-primary"
              placeholder="Enter your learning notes here..."
            />
          ) : (
            <div className="prose prose-sm max-w-none whitespace-pre-wrap p-4 bg-muted/30 rounded-lg text-base leading-relaxed">
              {content || "No content yet. Click edit to add some notes!"}
            </div>
          )}
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
