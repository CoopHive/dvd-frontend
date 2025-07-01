"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { getCustomPrompts, saveCustomPrompts, resetToDefaultPrompts, DEFAULT_PROMPTS, TEMPLATE_VARIABLES, type PromptConfig } from "~/config/prompts";
import { RotateCcw, Save, HelpCircle } from "lucide-react";

interface PromptSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPromptsChanged?: (prompts: PromptConfig) => void;
}

export function PromptSettingsDialog({ open, onOpenChange, onPromptsChanged }: PromptSettingsDialogProps) {
  const { data: session } = useSession();
  const [prompts, setPrompts] = useState<PromptConfig>(DEFAULT_PROMPTS);
  const [isDirty, setIsDirty] = useState(false);

  const userId = session?.user?.email ?? "";

  // Load prompts when dialog opens
  useEffect(() => {
    if (open) {
      const customPrompts = getCustomPrompts(userId);
      setPrompts(customPrompts);
      setIsDirty(false);
    }
  }, [open, userId]);

  const handlePromptChange = (value: string) => {
    setPrompts({ researchAssistant: value });
    setIsDirty(true);
  };

  const handleSave = () => {
    saveCustomPrompts(prompts, userId);
    setIsDirty(false);
    onPromptsChanged?.(prompts);
  };

  const handleReset = () => {
    const defaultPrompts = resetToDefaultPrompts(userId);
    setPrompts(defaultPrompts);
    setIsDirty(true);
    onPromptsChanged?.(defaultPrompts);
  };

  const handleClose = () => {
    if (isDirty) {
      // Auto-save changes when closing
      saveCustomPrompts(prompts, userId);
      onPromptsChanged?.(prompts);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🎯 Custom Research Assistant Prompt
          </DialogTitle>
          <DialogDescription>
            Customize the system prompt used for analyzing scientific documents. Your changes will persist across sessions.
          </DialogDescription>
          
          {/* Template Variables Help Section */}
          <div className="mt-3 p-3 bg-[#1a1a1a] rounded-md border border-[#3a3a3a]">
            <div className="flex items-center gap-2 mb-2">
              <HelpCircle className="h-4 w-4 text-[#1a7f64]" />
              <span className="text-sm font-medium text-[#1a7f64]">Available Template Variables:</span>
            </div>
            <div className="space-y-1 text-xs text-zinc-400">
              <div className="flex gap-2">
                <code className="bg-[#2a2a2a] px-1 rounded">{"{{collectionName}}"}</code>
                <span>- {TEMPLATE_VARIABLES.collectionName}</span>
              </div>
              <div className="flex gap-2">
                <code className="bg-[#2a2a2a] px-1 rounded">{"{{context}}"}</code>
                <span>- {TEMPLATE_VARIABLES.context}</span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label htmlFor="research-prompt" className="block text-sm font-medium mb-2">
              Research Assistant Prompt
            </label>
            <textarea
              id="research-prompt"
              value={prompts.researchAssistant}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handlePromptChange(e.target.value)}
              placeholder="Enter your custom research assistant prompt..."
              className="w-full min-h-[400px] font-mono text-sm bg-[#1a1a1a] border border-[#3a3a3a] text-zinc-200 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-[#1a7f64] focus:border-transparent resize-y"
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[#3a3a3a]">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="bg-[#2a2a2a] border-[#3a3a3a] hover:bg-[#343541] text-zinc-300"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset to Default
              </Button>
              {isDirty && (
                <span className="text-xs text-orange-400">
                  Unsaved changes
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="bg-[#2a2a2a] border-[#3a3a3a] hover:bg-[#343541] text-zinc-300"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!isDirty}
                className="bg-[#1a7f64] hover:bg-[#18735a] text-white"
              >
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 