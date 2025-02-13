
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
import { AlertTriangle } from "lucide-react";

interface SafetyAcknowledgmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "suicide" | "violence";
  userId: string;
}

// Add interface for RPC response
interface IncrementSafetyConcernResponse {
  warningCount: number;
  accountDisabled: boolean;
  concernType: string;
}

const SUICIDE_RESOURCES = `
National Suicide Prevention Lifeline (24/7):
1-800-273-8255

Crisis Text Line (24/7):
Text HOME to 741741

Veterans Crisis Line:
1-800-273-8255 (Press 1)

Trevor Project (LGBTQ+):
1-866-488-7386

Please seek professional help immediately. Your life matters, and there are people who want to help.
Amorine is not a mental health professional and cannot provide crisis support.
`;

const VIOLENCE_RESOURCES = `
National Crisis Hotline (24/7):
1-800-662-4357

Crisis Text Line (24/7):
Text HOME to 741741

National Domestic Violence Hotline:
1-800-799-SAFE (7233)

If you're having thoughts of harming others, please seek professional help immediately.
If there is an immediate danger to anyone's safety, contact emergency services (911).
`;

const WARNING_MESSAGES = {
  1: {
    title: "First Warning",
    description: (type: string) => 
      `This is your first warning regarding ${type} content. Please review our privacy policy and terms of service.`,
    variant: "default" as const
  },
  2: {
    title: "Multiple Warnings",
    description: (type: string) => 
      `You have received multiple warnings about ${type} content. Please take this seriously.`,
    variant: "default" as const 
  },
  3: {
    title: "Several Warnings",
    description: (type: string) => 
      `Warning: You have several flags for ${type} content. Few warnings remaining before account suspension.`,
    variant: "default" as const 
  },
  4: {
    title: "Final Warning",
    description: (type: string) => 
      `URGENT: This is your final warning. Next flag for ${type} content will result in account suspension.`,
    variant: "destructive" as const
  },
  5: {
    title: "Account Suspended",
    description: (type: string) => 
      `Account suspended due to multiple ${type} content violations. Contact support for assistance.`,
    variant: "destructive" as const
  }
} as const;

export function SafetyAcknowledgmentDialog({
  open,
  onOpenChange,
  type,
  userId,
}: SafetyAcknowledgmentDialogProps) {
  const [showResources, setShowResources] = useState(false);
  const [acknowledgmentText, setAcknowledgmentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    if (!open) {
      setShowResources(false);
      setAcknowledgmentText("");
      setShowConfirmation(false);
    }
  }, [open]);

  const getRequiredText = (respondedYes: boolean) => {
    if (respondedYes) {
      return type === "suicide"
        ? "I acknowledge I need help, and I commit to calling one of these crisis hotlines immediately after this conversation"
        : "I acknowledge I need help, and I commit to calling one of these crisis hotlines immediately after this conversation";
    }
    
    if (type === "suicide") {
      return "I affirm I am not having thoughts of suicide or self-harm, and I promise to seek immediate help if such thoughts occur in the future";
    }
    return "I affirm I am not planning to harm others, and I promise to seek immediate help if I experience thoughts of violence in the future";
  };

  const handleResponse = async (respondedYes: boolean) => {
    if (respondedYes) {
      setShowResources(true);
      setShowConfirmation(false);
    } else {
      setShowResources(false);
      setShowConfirmation(true);
    }
    setAcknowledgmentText("");
  };

  const showWarningToast = (warningCount: number, concernType: string) => {
    const messageConfig = WARNING_MESSAGES[warningCount as keyof typeof WARNING_MESSAGES] || WARNING_MESSAGES[1];
    
    toast({
      title: messageConfig.title,
      description: messageConfig.description(concernType.toLowerCase()),
      variant: messageConfig.variant,
      duration: warningCount >= 4 ? 10000 : 5000,
    });
  };

  const handleSubmit = async () => {
    const requiredText = getRequiredText(showResources);
    if (acknowledgmentText !== requiredText) {
      toast({
        title: "Exact Text Required",
        description: `For your safety and to ensure understanding, please type exactly:\n"${requiredText}"`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Save the acknowledgment only
      const { error: ackError } = await supabase
        .from("safety_acknowledgments")
        .insert({
          user_id: userId,
          type: type,
          responded_yes: showResources,
          acknowledgment_text: acknowledgmentText,
        });

      if (ackError) throw ackError;

      // Get the current warning count to show appropriate toast
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('suicide_concern, violence_concern')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      const warningCount = type === 'suicide' ? profile.suicide_concern : profile.violence_concern;
      showWarningToast(warningCount, type);

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
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" hideCloseButton>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Safety Check Required
          </DialogTitle>
          {!showResources && !showConfirmation ? (
            <DialogDescription className="text-base">
              {type === "suicide"
                ? "We've detected content related to self-harm or suicide in your conversation. We care about your well-being and need to check if you're having thoughts of suicide or self-harm."
                : "We've detected concerning content about potential harm to others. We need to verify your intentions to ensure everyone's safety."}
            </DialogDescription>
          ) : (
            <DialogDescription 
              className={`whitespace-pre-line ${showResources ? 'text-red-500' : 'text-gray-700'} font-medium`}
            >
              {showResources 
                ? (type === "suicide" ? SUICIDE_RESOURCES : VIOLENCE_RESOURCES)
                : "Please carefully read and acknowledge the following statement:"}
            </DialogDescription>
          )}
        </DialogHeader>

        {!showResources && !showConfirmation && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-600 text-center">
              Are you currently having {type === "suicide" ? "thoughts of suicide or self-harm" : "thoughts of harming others"}?
            </p>
            <div className="flex justify-center gap-4">
              <Button
                variant="destructive"
                onClick={() => handleResponse(true)}
                className="w-32"
              >
                Yes
              </Button>
              <Button
                variant="outline"
                onClick={() => handleResponse(false)}
                className="w-32"
              >
                No
              </Button>
            </div>
          </div>
        )}

        {(showResources || showConfirmation) && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-700 font-medium">
                Please type exactly:
              </p>
              <p className="text-sm text-gray-900 mt-2">
                "{getRequiredText(showResources)}"
              </p>
            </div>
            <Input
              value={acknowledgmentText}
              onChange={(e) => setAcknowledgmentText(e.target.value)}
              placeholder="Type the acknowledgment text here"
              className="w-full"
            />
          </div>
        )}

        {(showResources || showConfirmation) && (
          <DialogFooter>
            <Button
              onClick={handleSubmit}
              disabled={
                isSubmitting ||
                acknowledgmentText !== getRequiredText(showResources)
              }
              className="w-full"
            >
              Submit Acknowledgment
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
