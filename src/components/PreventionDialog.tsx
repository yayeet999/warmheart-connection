
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Phone, Heart } from "lucide-react";

interface PreventionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  type: "SUICIDE" | "RACISM" | "VIOLENCE" | null;
}

const PREVENTION_CONTENT = {
  SUICIDE: {
    title: "We Care About You",
    description: "We've noticed some concerning content and want to make sure you're okay. Would you like to talk to someone? The National Suicide Prevention Lifeline is available 24/7.",
    hotline: "988",
    actionText: "Call Now",
    icon: Phone
  },
  RACISM: {
    title: "Let's Keep Our Community Safe",
    description: "We've detected content that may be harmful or discriminatory. We aim to maintain a respectful and inclusive environment for everyone.",
    hotline: null,
    actionText: "I Understand",
    icon: Heart
  },
  VIOLENCE: {
    title: "Safety First",
    description: "We've detected potentially concerning content related to violence. If you or someone else is in immediate danger, please contact emergency services.",
    hotline: "911",
    actionText: "Get Help",
    icon: Phone
  }
};

const PreventionDialog = ({ isOpen, onClose, type }: PreventionDialogProps) => {
  if (!type) return null;

  const content = PREVENTION_CONTENT[type];

  const handleAction = () => {
    if (content.hotline) {
      window.location.href = `tel:${content.hotline}`;
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <content.icon className="w-5 h-5 text-red-500" />
            {content.title}
          </DialogTitle>
          <DialogDescription className="text-base">
            {content.description}
            {content.hotline && (
              <div className="mt-2 text-xl font-semibold text-center">
                {content.hotline}
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button
            variant="secondary"
            onClick={onClose}
            className="flex-1 sm:flex-none"
          >
            Close
          </Button>
          <Button
            onClick={handleAction}
            className="flex-1 sm:flex-none bg-red-500 hover:bg-red-600"
          >
            {content.actionText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PreventionDialog;
