import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpCircle, ChevronDown, ChevronUp, Send } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "What makes Amorine different from other AI platforms?",
    answer: "Amorine combines powerful AI capabilities with a uniquely personal touch. Our platform learns from your interactions to provide more tailored and meaningful responses over time, while maintaining a warm and engaging conversation style."
  },
  {
    question: "Is my data secure with Amorine?",
    answer: "Yes, absolutely! We take data security very seriously. All conversations are encrypted, and we never share your personal information with third parties. Your conversations and personal information remain strictly confidential and are never used for any purpose other than improving your direct experience with Amorine."
  },
  {
    question: "Can I customize my Amorine experience?",
    answer: "Yes! Amorine learns and adapts through your conversations and interactions. The more you engage with Amorine, the better it understands your communication style, preferences, and needs, creating a truly personalized experience that evolves naturally over time."
  },
  {
    question: "What if I need help or encounter an issue?",
    answer: "Our support team is here to help! You can reach out through the help center, and we typically respond within 24 hours."
  }
];

const FAQItem = ({ question, answer, isOpen, onClick }: FAQItem & { isOpen: boolean; onClick: () => void }) => (
  <div 
    className={cn(
      "border rounded-2xl p-4 cursor-pointer transition-all duration-200",
      "hover:bg-cream/20 active:bg-cream/30",
      "backdrop-blur-sm bg-white/80",
      isOpen && "border-coral/30 bg-cream/30"
    )}
    onClick={onClick}
  >
    <div className="flex items-center justify-between">
      <h3 className="text-[15px] font-medium text-charcoal">{question}</h3>
      {isOpen ? (
        <ChevronUp className="h-4 w-4 text-coral flex-shrink-0" />
      ) : (
        <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
      )}
    </div>
    {isOpen && (
      <p className="mt-3 text-[14px] text-gray-600 leading-relaxed">
        {answer}
      </p>
    )}
  </div>
);

const Support = () => {
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [feedbackType, setFeedbackType] = useState<string>("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const handleSubmitFeedback = async () => {
    if (!feedbackMessage.trim() || !feedbackType) {
      toast({
        title: "Error",
        description: "Please fill in all fields. Message must be at least 10 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('user_feedback')
        .insert([
          {
            type: feedbackType,
            message: feedbackMessage,
            user_id: user?.id,
          }
        ]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Thank you for your feedback! We'll review it shortly.",
      });

      setFeedbackMessage("");
      setFeedbackType("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={cn(
      "min-h-screen bg-gray-50/80",
      "px-4 py-6 md:p-8 md:pl-[120px]",
      "max-w-4xl mx-auto"
    )}>
      <h1 className="text-2xl md:text-3xl font-bold mb-6 text-charcoal text-center md:text-left">Support</h1>
      
      <Card className="mb-8 border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <HelpCircle className="h-5 w-5 text-coral" />
            Help Center
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[15px] text-gray-600 mb-6">
            Need help? Find answers to common questions and learn how to make the most of your experience with Amorine.
          </p>
          
          <div className="space-y-4 bg-cream/20 p-4 md:p-6 rounded-2xl border border-coral/10">
            <h3 className="font-medium text-lg text-charcoal">Send us your feedback</h3>
            <div className="space-y-4">
              <Select value={feedbackType} onValueChange={setFeedbackType}>
                <SelectTrigger className="w-full md:w-[200px] rounded-xl">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="concern">Concern</SelectItem>
                  <SelectItem value="feedback">Feedback</SelectItem>
                  <SelectItem value="suggestion">Suggestion</SelectItem>
                </SelectContent>
              </Select>
              
              <Textarea
                placeholder="Tell us more... (minimum 10 characters)"
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                className="min-h-[100px] rounded-xl resize-none"
              />
              
              <Button 
                onClick={handleSubmitFeedback} 
                disabled={isSubmitting || !feedbackType || feedbackMessage.length < 10}
                className={cn(
                  "bg-coral hover:bg-coral/90 active:scale-[0.98]",
                  "transition-all duration-200 rounded-xl w-full md:w-auto"
                )}
              >
                <Send className="mr-2 h-4 w-4" />
                Send Feedback
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-xl md:text-2xl font-semibold text-charcoal mb-4">Frequently Asked Questions</h2>
        {faqs.map((faq, index) => (
          <FAQItem
            key={index}
            question={faq.question}
            answer={faq.answer}
            isOpen={openFAQ === index}
            onClick={() => setOpenFAQ(openFAQ === index ? null : index)}
          />
        ))}
      </div>
    </div>
  );
};

export default Support;
