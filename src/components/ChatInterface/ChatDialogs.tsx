import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ChatDialogsProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  type: "suicide" | "violence";
  userId: string;
}

export const ChatDialogs: React.FC<ChatDialogsProps> = ({
  open,
  setOpen,
  type,
  userId,
}) => {
  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Safety Check Required</DialogTitle>
            <DialogDescription>
              We've detected concerning content in your conversation. To ensure
              your safety and well-being, we need to ask a few questions.
            </DialogDescription>
          </DialogHeader>
          {type === "suicide" ? (
            <div>
              Are you currently having thoughts of suicide or self-harm?
            </div>
          ) : (
            <div>Are you planning to harm others?</div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
