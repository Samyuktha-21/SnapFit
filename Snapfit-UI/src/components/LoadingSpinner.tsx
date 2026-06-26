export default function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="relative flex items-center justify-center h-16 w-16">
        {/* Outer glowing ring */}
        <div className="absolute h-full w-full rounded-full border-4 border-indigo-500/10 border-t-indigo-500 animate-spin" />
        {/* Middle pulsing ring */}
        <div className="absolute h-10 w-10 rounded-full border-4 border-purple-500/20 border-b-purple-500 animate-spin-reverse" />
        {/* Center dot */}
        <div className="h-3 w-3 rounded-full bg-pink-500 animate-ping" />
      </div>
    </div>
  );
}
