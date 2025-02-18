
export const formatMessageDate = (timestamp?: string): string => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export interface Message {
  type: "user" | "ai";
  content: string;
  timestamp?: string;
  delay?: number;
}
