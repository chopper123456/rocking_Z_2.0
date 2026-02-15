export default function LoadingSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-8 h-8 border-3 border-stone-200 border-t-green-600 rounded-full animate-spin" />
      <p className="text-sm text-stone-400 mt-3 font-medium">{message}</p>
    </div>
  );
}
