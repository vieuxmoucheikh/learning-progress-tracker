import React, { useState, useRef } from 'react';
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
  Image as ImageIcon,
  Link as LinkIcon,
  FileText,
  Plus,
  Trash,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface CardMedia {
  type: 'image' | 'link';
  url: string;
  description?: string;
}

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
  }) => void;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    onSave({
      id,
      title,
      content,
      media,
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

  const handleAddImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // In a real app, you would upload this to your storage service
      // For now, we'll create a local URL
      const url = URL.createObjectURL(file);
      setMedia([...media, { type: 'image', url, description: file.name }]);
    }
  };

  const handleAddLink = () => {
    const url = window.prompt('Enter the URL:');
    if (url) {
      setMedia([...media, { type: 'link', url }]);
    }
  };

  const handleRemoveMedia = (index: number) => {
    setMedia(media.filter((_, i) => i !== index));
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
          {isEditing ? (
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[150px] w-full resize-none p-4 text-base leading-relaxed border-2 focus:border-primary"
              placeholder="Enter your learning notes here..."
            />
          ) : (
            <div className="prose prose-sm max-w-none whitespace-pre-wrap p-4 bg-muted/30 rounded-lg text-base leading-relaxed">
              {content || "No content yet. Click edit to add some notes!"}
            </div>
          )}
        </div>

        {(media.length > 0 || isEditing) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Attachments</h4>
              {isEditing && (
                <div className="flex gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleAddImage}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImageIcon className="h-4 w-4 mr-1" />
                    Add Image
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddLink}
                  >
                    <LinkIcon className="h-4 w-4 mr-1" />
                    Add Link
                  </Button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {media.map((item, index) => (
                <div key={index} className="relative group">
                  {item.type === 'image' ? (
                    <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                      <img
                        src={item.url}
                        alt={item.description || 'Card attachment'}
                        className="object-cover w-full h-full"
                      />
                      {isEditing && (
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemoveMedia(index)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ) : (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                    >
                      <div className="flex items-center">
                        <LinkIcon className="h-4 w-4 mr-2" />
                        <span className="text-sm truncate">{item.url}</span>
                      </div>
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

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
