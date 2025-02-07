const TypingIndicator = () => {
  return (
    <div className="flex space-x-1.5 px-2 py-1.5">
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-[bounce_1s_infinite_0ms]"></div>
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-[bounce_1s_infinite_200ms]"></div>
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-[bounce_1s_infinite_400ms]"></div>
    </div>
  );
};

export default TypingIndicator;