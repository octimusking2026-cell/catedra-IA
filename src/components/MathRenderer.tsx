import React from 'react';

const MathRendererFull = React.lazy(() =>
  import('./MathRendererFull').then((m) => ({ default: m.MathRendererFull }))
);

interface MathRendererProps {
  text: string;
  className?: string;
}

export const MathRenderer: React.FC<MathRendererProps> = (props) => {
  return (
    <React.Suspense
      fallback={
        <div className="py-2 space-y-1.5 animate-pulse select-none">
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
        </div>
      }
    >
      <MathRendererFull {...props} />
    </React.Suspense>
  );
};
