
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import React from "react";

interface WelcomeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const WelcomeDialog: React.FC<WelcomeDialogProps> = ({ open, onOpenChange }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="w-5 h-5 text-coral" />
            Welcome to Amorine!
          </DialogTitle>
          <DialogDescription className="text-base">
            We're excited to have you! You're welcome to chat and interact with Amorine. 
            Just remember there's a limit of 50 daily messages on the free tier. 
            You can upgrade to our pro plan for unlimited and voice calling/video features!
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button 
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Got it!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
