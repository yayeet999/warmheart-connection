import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpCircle } from "lucide-react";

const Support = () => {
  return (
    <div className="p-8 pl-[120px]">
      <h1 className="text-3xl font-bold mb-6 text-charcoal">Support</h1>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-6 w-6 text-coral" />
            Help Center
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Need help? Find answers to common questions and learn how to make the most of your experience with Amorine.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Support;