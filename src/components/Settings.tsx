import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon } from "lucide-react";

const Settings = () => {
  return (
    <div className="p-8 pl-[120px]">
      <h1 className="text-3xl font-bold mb-6 text-charcoal">Settings</h1>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-6 w-6 text-coral" />
            Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Customize your experience with Amorine. Settings coming soon...
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;