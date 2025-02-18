import { format, isToday, isYesterday } from "date-fns";

/** 
 * Format a message's timestamp. 
 * If same day => h:mm a
 * If yesterday => "Yesterday h:mm a"
 * else => "MMM d, h:mm a"
 */
export function formatMessageDate(timestamp?: string): string {
  if (!timestamp) return "";
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "";
    if (isToday(date)) {
      return format(date, "h:mm a");
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, "h:mm a")}`;
    } else {
      return format(date, "MMM d, h:mm a");
    }
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
}
