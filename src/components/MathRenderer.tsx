import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface MathRendererProps {
  text: string;
  className?: string;
}

/**
 * Renders rich academic markdown and mathematical expressions using ReactMarkdown,
 * RemarkMath, and RehypeKatex.
 * Supports inline formulas ($...$), block/multiline equations ($$...$$), tables,
 * matrices, and lists while enforcing strict security with trust: false.
 */
export const MathRenderer: React.FC<MathRendererProps> = ({ text, className = '' }) => {
  if (!text) return null;

  return (
    <div className={`prose-sm max-w-none text-slate-800 leading-relaxed ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[
          [
            rehypeKatex,
            {
              trust: false,
              throwOnError: false,
              strict: false,
            },
          ],
        ]}
        components={{
          p: ({ children }) => <p className="my-1.5 leading-relaxed">{children}</p>,
          strong: ({ children }) => <strong className="font-bold text-slate-900">{children}</strong>,
          em: ({ children }) => <em className="italic text-slate-700">{children}</em>,
          code: ({ children, className: codeClass }) => {
            const isInline = !codeClass;
            return isInline ? (
              <code className="font-mono text-xs bg-slate-100 text-blue-800 px-1 py-0.5 rounded border border-slate-200">
                {children}
              </code>
            ) : (
              <code className={`${codeClass} font-mono text-xs block p-3 bg-slate-900 text-slate-100 rounded-xl overflow-x-auto`}>
                {children}
              </code>
            );
          },
          ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2 text-slate-700">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2 text-slate-700">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-blue-500 pl-3 my-2 text-slate-600 italic bg-blue-50/50 py-1 rounded-r">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-3">
              <table className="min-w-full text-xs border border-slate-200 divide-y divide-slate-200">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="px-3 py-2 bg-slate-100 font-semibold text-slate-700 text-left">{children}</th>,
          td: ({ children }) => <td className="px-3 py-2 border-t border-slate-100 text-slate-700">{children}</td>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
};
