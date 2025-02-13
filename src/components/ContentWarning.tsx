
import { AlertOctagon, HeartCrack, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

interface PopupData {
  type: 'SUICIDE' | 'RACISM' | 'VIOLENCE';
  title: string;
  message: string;
  severity: 'critical' | 'warning' | 'danger';
}

export const showContentWarning = (popup: PopupData, toast: any) => {
  const getIcon = () => {
    switch (popup.type) {
      case 'SUICIDE':
        return <HeartCrack className="h-5 w-5 text-destructive" />;
      case 'RACISM':
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case 'VIOLENCE':
        return <AlertOctagon className="h-5 w-5 text-destructive" />;
    }
  };

  toast({
    title: (
      <div className="flex items-center gap-2">
        {getIcon()}
        <span>{popup.title}</span>
      </div>
    ),
    description: popup.message,
    duration: popup.type === 'SUICIDE' ? Infinity : 10000,
    variant: "destructive",
  });
};

interface ContentWarningProps {
  popupData: PopupData | null;
}

const ContentWarning = ({ popupData }: ContentWarningProps) => {
  const { toast } = useToast();

  useEffect(() => {
    if (popupData) {
      showContentWarning(popupData, toast);
    }
  }, [popupData, toast]);

  return null;
};

export default ContentWarning;
