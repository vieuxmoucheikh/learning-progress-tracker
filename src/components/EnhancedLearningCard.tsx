import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { RichContentEditor } from './RichContentEditor';
import {
  Edit,
  Save,
  X,
  Tag,
  Bookmark,
} from 'lucide-react';

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
    createdAt?: string;
    updatedAt?: string;
  }) => void;
  onDelete: (id: string) => void;
}

export const EnhancedLearningCard: React.FC<EnhancedLearningCardProps> = ({
  id,
  title: initialTitle,
  content: initialContent,
  tags: initialTags,
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
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <Card className="w-full max-w-2xl p-4 space-y-4 bg-card">
      <div className="flex items-center justify-between">
        {isEditing ? (
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-lg font-semibold"
            placeholder="Enter title..."
          />
        ) : (
          <h3 className="text-lg font-semibold">{title}</h3>
        )}
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (isEditing) {
                handleSave();
              } else {
                setIsEditing(true);
              }
            }}
          >
            {isEditing ? <Save className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
          </Button>
          {isEditing && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setTitle(initialTitle);
                setContent(initialContent);
                setTags(initialTags);
                setIsEditing(false);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <RichContentEditor
          content={content}
          onChange={setContent}
          readOnly={!isEditing}
          className="min-h-[200px]"
        />
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="flex items-center gap-1"
            >
              <Tag className="h-3 w-3" />
              {tag}
              {isEditing && (
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1 hover:text-destructive"
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
              className="w-24 h-6"
            />
          )}
        </div>
      </div>

      {isEditing && (
        <div className="flex justify-end pt-4">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete(id)}
            className="ml-2"
          >
            Delete Card
          </Button>
        </div>
      )}
    </Card>
  );
};
