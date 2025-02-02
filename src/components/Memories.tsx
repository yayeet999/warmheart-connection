import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain } from "lucide-react";

const Memories = () => {
  return (
    <div className="p-8 pl-[120px]">
      <h1 className="text-3xl font-bold mb-6 text-charcoal">Memories</h1>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-coral" />
            Shared Moments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            This is where you'll find your special moments and conversations with Amorine.
            Start chatting to create memories together.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Memories;