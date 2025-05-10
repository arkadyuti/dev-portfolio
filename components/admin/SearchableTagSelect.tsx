import React, { useState, useEffect } from 'react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

export interface Tag {
  id: string
  name: string
}

interface SearchableTagSelectProps {
  availableTags: Tag[]
  selectedTags: any
  onChange: (tags: Tag[]) => void
  onCreateTag?: (tagName: string) => void
}

const SearchableTagSelect: React.FC<SearchableTagSelectProps> = ({
  availableTags,
  selectedTags,
  onChange,
  onCreateTag,
}) => {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')

  // Filter tags that are not already selected and match the search input
  const filteredTags = availableTags.filter(
    (tag) =>
      !selectedTags.some((selectedTag) => selectedTag.id === tag.id) &&
      tag.name.toLowerCase().includes(inputValue.toLowerCase())
  )

  // Handle tag selection
  const selectTag = (tag: Tag) => {
    onChange([...selectedTags, tag])
    setInputValue('')
  }

  // Handle tag removal
  const removeTag = (tagId: string) => {
    onChange(selectedTags.filter((tag) => tag.id !== tagId))
  }

  // Handle creating a new tag
  const handleCreateTag = () => {
    if (inputValue.trim() && onCreateTag) {
      onCreateTag(inputValue.trim())
      setInputValue('')
    }
  }

  const hasExactMatch = filteredTags.some(
    (tag) => tag.name.toLowerCase() === inputValue.toLowerCase()
  )

  return (
    <div className="space-y-2">
      <div className="mb-2 flex flex-wrap gap-2">
        {selectedTags.map((tag) => (
          <Badge key={tag.id} variant="secondary" className="flex items-center gap-1">
            {tag.name}
            <button
              className="ml-1 rounded-full outline-none focus:ring-2 focus:ring-ring"
              onClick={() => removeTag(tag.id)}
            >
              ×
            </button>
          </Badge>
        ))}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            Add tags...
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput
              placeholder="Search tag..."
              value={inputValue}
              onValueChange={setInputValue}
            />
            <CommandList>
              <CommandEmpty>
                {inputValue.trim() !== '' && !hasExactMatch && onCreateTag ? (
                  <Button
                    variant="ghost"
                    className="flex w-full items-center justify-start px-2 py-1"
                    onClick={handleCreateTag}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create "{inputValue}"
                  </Button>
                ) : (
                  'No tags found.'
                )}
              </CommandEmpty>

              <CommandGroup>
                {filteredTags.map((tag) => (
                  <CommandItem
                    key={tag.id}
                    value={tag.name}
                    onSelect={() => {
                      selectTag(tag)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        selectedTags.some((selectedTag) => selectedTag.id === tag.id)
                          ? 'opacity-100'
                          : 'opacity-0'
                      )}
                    />
                    {tag.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

export default SearchableTagSelect
