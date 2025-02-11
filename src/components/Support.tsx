
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "How do I get started with Amorine?",
    answer: "Getting started is easy! After signing up, you'll be guided through our onboarding process where you can set up your profile and preferences. Once complete, you can immediately begin exploring all features of the app."
  },
  {
    question: "What makes Amorine different from other AI platforms?",
    answer: "Amorine combines powerful AI capabilities with a uniquely personal touch. Our platform learns from your interactions to provide more tailored and meaningful responses over time, while maintaining a warm and engaging conversation style."
  },
  {
    question: "Is my data secure with Amorine?",
    answer: "Yes, absolutely! We take data security very seriously. All conversations are encrypted, and we never share your personal information with third parties. You have complete control over your data and can delete it at any time through your settings."
  },
  {
    question: "Can I customize my Amorine experience?",
    answer: "Yes! You can personalize various aspects of your experience through the settings panel, including conversation style, notification preferences, and UI themes. We're constantly adding new customization options based on user feedback."
  },
  {
    question: "What if I need help or encounter an issue?",
    answer: "Our support team is here to help! You can reach out through the help center, and we typically respond within 24 hours. For immediate assistance, check our comprehensive FAQ section or community forums."
  }
];

const FAQItem = ({ question, answer, isOpen, onClick }: FAQItem & { isOpen: boolean; onClick: () => void }) => (
  <div 
    className={cn(
      "border rounded-lg p-4 cursor-pointer transition-all duration-200 hover:border-coral/50",
      isOpen && "border-coral/50 bg-cream/50"
    )}
    onClick={onClick}
  >
    <div className="flex items-center justify-between">
      <h3 className="text-lg font-medium text-charcoal">{question}</h3>
      {isOpen ? (
        <ChevronUp className="h-5 w-5 text-coral" />
      ) : (
        <ChevronDown className="h-5 w-5 text-gray-400" />
      )}
    </div>
    {isOpen && (
      <p className="mt-3 text-gray-600 leading-relaxed">
        {answer}
      </p>
    )}
  </div>
);

const Support = () => {
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  return (
    <div className="p-8 pl-[120px] max-w-4xl">
      <h1 className="text-3xl font-bold mb-6 text-charcoal">Support</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-6 w-6 text-coral" />
            Help Center
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Need help? Find answers to common questions and learn how to make the most of your experience with Amorine.
          </p>
          <div className="bg-cream/30 p-4 rounded-lg border border-coral/20">
            <p className="text-sm text-gray-600">
              Can't find what you're looking for? Our support team is ready to help!
              <button className="ml-2 text-coral hover:text-coral/80 font-medium">
                Contact Support →
              </button>
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-charcoal mb-6">Frequently Asked Questions</h2>
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
