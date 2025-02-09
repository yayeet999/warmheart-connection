
import { format, isToday, isYesterday } from "date-fns";
import React from "react";

interface DateSeparatorProps {
  date: string;
}

export const DateSeparator: React.FC<DateSeparatorProps> = ({ date }) => {
  try {
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      console.log("Invalid date in separator:", date);
      return null;
    }
    
    let displayText = "";
    if (isToday(parsedDate)) {
      displayText = "Today";
    } else if (isYesterday(parsedDate)) {
      displayText = "Yesterday";
    } else {
      displayText = format(parsedDate, "MMMM d, yyyy");
    }

    return (
      <div className="flex items-center justify-center my-4">
        <div className="bg-gray-100 px-3 py-1 rounded-full">
          <span className="text-sm font-medium text-gray-600">
            {displayText}
          </span>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error in DateSeparator:", error);
    return null;
  }
};
