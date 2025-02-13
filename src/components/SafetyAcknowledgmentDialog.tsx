
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface SafetyAcknowledgmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "suicide" | "violence";
  userId: string;
}

const SUICIDE_RESOURCES = `
National Suicide Prevention Lifeline (24/7):
1-800-273-8255

Crisis Text Line (24/7):
Text HOME to 741741

Please seek professional help immediately. Amorine is not a therapist or mental health professional and cannot provide crisis support.
`;

const VIOLENCE_RESOURCES = `
National Crisis Hotline (24/7):
1-800-662-4357

Crisis Text Line (24/7):
Text HOME to 741741

If you're having thoughts of harming others, please seek professional help immediately. If there's an immediate danger, contact emergency services.
`;

export function SafetyAcknowledgmentDialog({
  open,
  onOpenChange,
  type,
  userId,
}: SafetyAcknowledgmentDialogProps) {
  const [showResources, setShowResources] = useState(false);
  const [acknowledgmentText, setAcknowledgmentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setShowResources(false);
      setAcknowledgmentText("");
    }
  }, [open]);

  const getRequiredText = (respondedYes: boolean) => {
    if (respondedYes) return "I understand";
    if (type === "suicide") return "I acknowledge i am not suicidal or wanting to do self harm";
    return "I acknowledge i am not planning to harm others";
  };

  const handleResponse = async (respondedYes: boolean) => {
    if (respondedYes) {
      setShowResources(true);
    } else {
      setShowResources(false);
    }
    setAcknowledgmentText("");
  };

  const handleSubmit = async () => {
    const requiredText = getRequiredText(showResources);
    if (acknowledgmentText !== requiredText) {
      toast({
        title: "Invalid acknowledgment",
        description: `Please type exactly: "${requiredText}"`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("safety_acknowledgments")
        .insert({
          user_id: userId,
          type: type,
          responded_yes: showResources,
          acknowledgment_text: acknowledgmentText,
        });

      if (error) throw error;

      toast({
        title: "Acknowledgment recorded",
        description: "Thank you for your acknowledgment.",
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error recording acknowledgment:", error);
      toast({
        title: "Error",
        description: "Failed to record acknowledgment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Safety Check</DialogTitle>
          {!showResources ? (
            <DialogDescription>
              {type === "suicide"
                ? "We noticed your conversation involves self-harm topics. Are you actually considering suicide and/or self-harm?"
                : "We noticed concerning content about violence. Are you actually considering harming others?"}
            </DialogDescription>
          ) : (
            <DialogDescription className="whitespace-pre-line text-red-500 font-medium">
              {type === "suicide" ? SUICIDE_RESOURCES : VIOLENCE_RESOURCES}
            </DialogDescription>
          )}
        </DialogHeader>

        {!showResources && !acknowledgmentText && (
          <div className="flex justify-center gap-4">
            <Button
              variant="destructive"
              onClick={() => handleResponse(true)}
            >
              Yes
            </Button>
            <Button
              variant="outline"
              onClick={() => handleResponse(false)}
            >
              No
            </Button>
          </div>
        )}

        {(showResources || acknowledgmentText) && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please type exactly: "{getRequiredText(showResources)}"
            </p>
            <Input
              value={acknowledgmentText}
              onChange={(e) => setAcknowledgmentText(e.target.value)}
              placeholder="Type your acknowledgment here"
            />
          </div>
        )}

        {(showResources || acknowledgmentText) && (
          <DialogFooter>
            <Button
              onClick={handleSubmit}
              disabled={
                isSubmitting ||
                acknowledgmentText !== getRequiredText(showResources)
              }
            >
              Submit
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
