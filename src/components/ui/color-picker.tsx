import React from 'react';
import { Button } from './button';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { cn } from '@/lib/utils';
import { Check, Paintbrush } from 'lucide-react';

const predefinedColors = [
  { name: 'Default', value: 'transparent' },
  { name: 'Soft Blue', value: 'rgb(239 246 255)' }, // blue-50
  { name: 'Soft Green', value: 'rgb(240 253 244)' }, // green-50
  { name: 'Soft Purple', value: 'rgb(245 243 255)' }, // purple-50
  { name: 'Soft Pink', value: 'rgb(254 242 242)' }, // red-50
  { name: 'Soft Yellow', value: 'rgb(254 252 232)' }, // yellow-50
  { name: 'Soft Orange', value: 'rgb(255 247 237)' }, // orange-50
  { name: 'Soft Teal', value: 'rgb(240 253 250)' }, // teal-50
];

interface ColorPickerProps {
  value?: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ value = 'transparent', onChange }: ColorPickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-[35px] h-[35px] p-0",
            value !== 'transparent' && "border-2"
          )}
          style={{
            background: value,
            borderColor: value !== 'transparent' ? value : undefined,
          }}
        >
          <Paintbrush className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="grid grid-cols-4 gap-2">
          {predefinedColors.map((color) => (
            <Button
              key={color.value}
              variant="outline"
              className={cn(
                "w-full h-8 p-0 aspect-square",
                value === color.value && "border-2"
              )}
              style={{
                background: color.value,
                borderColor: color.value !== 'transparent' ? color.value : undefined,
              }}
              onClick={() => onChange(color.value)}
            >
              {value === color.value && (
                <Check className="h-4 w-4 text-foreground" />
              )}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
