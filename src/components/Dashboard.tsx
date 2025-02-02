import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Heart, MessageSquare } from "lucide-react";

const Dashboard = () => {
  return (
    <div className="p-8 pl-[120px]">
      <h1 className="text-3xl font-bold mb-6 text-charcoal">Welcome Back</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-coral" />
              Recent Chats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Continue your conversations...</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-coral" />
              Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Track your interactions...</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Heart className="h-5 w-5 text-coral" />
              Connection Level
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Build your relationship...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;