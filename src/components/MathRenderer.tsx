import React, { useMemo } from 'react';
import katex from 'katex';

interface MathRendererProps {
  text: string;
  className?: string;
}

/**
 * Renders mathematical and physics formulas using KaTeX for maximum academic clarity and beauty.
 * Handles display equations ($$ ... $$, \[ ... \]), inline formulas ($ ... $, \( ... \)),
 * and pure LaTeX expressions.
 */
export const MathRenderer: React.FC<MathRendererProps> = ({ text, className = '' }) => {
  if (!text) return null;

  const renderedBlocks = useMemo(() => {
    // Split text into distinct logical paragraphs or equation blocks
    const rawLines = text.split('\n');

    return rawLines.map((line, lineIdx) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return <div key={lineIdx} className="h-2" />;
      }

      // Check if line is wrapped in $$ ... $$ or \[ ... \]
      const displayMatch = trimmed.match(/^(\$\$|\\\[)(.*)(\$\$|\\\])$/s);
      if (displayMatch) {
        const mathContent = displayMatch[2].trim();
        try {
          const html = katex.renderToString(mathContent, {
            displayMode: true,
            throwOnError: false,
          });
          return (
            <div
              key={lineIdx}
              className="my-3 py-3 px-4 bg-slate-900/90 text-white rounded-xl overflow-x-auto shadow-sm border border-slate-800 text-center"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch {
          return (
            <pre key={lineIdx} className="p-3 bg-slate-900 text-sky-300 rounded-lg overflow-x-auto font-mono text-sm">
              {mathContent}
            </pre>
          );
        }
      }

      // Check if line looks predominantly like a standalone LaTeX equation
      const isPureLatex =
        trimmed.startsWith('\\') ||
        trimmed.includes('\\frac') ||
        trimmed.includes('\\lim') ||
        trimmed.includes('\\begin{') ||
        trimmed.includes('\\xrightarrow') ||
        trimmed.includes('\\operatorname') ||
        trimmed.includes('\\sum') ||
        trimmed.includes('\\int') ||
        trimmed.includes('\\boxed') ||
        trimmed.includes('\\mathcal');

      if (isPureLatex && !trimmed.includes(' ') || (isPureLatex && (trimmed.includes('=') || trimmed.includes('\\implies')))) {
        try {
          const html = katex.renderToString(trimmed, {
            displayMode: true,
            throwOnError: false,
          });
          return (
            <div
              key={lineIdx}
              className="my-3 py-3 px-4 bg-slate-900/90 text-white rounded-xl overflow-x-auto shadow-sm border border-slate-800 text-center"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch {
          // fall through to mixed parser
        }
      }

      // Mixed line with inline formulas ($...$ or \(...\)) or plain text
      // Tokenize by $...$ or \(...\)
      const parts: React.ReactNode[] = [];
      const regex = /(\$([^\$]+)\$|\\\((.*?)\\\))/g;
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = regex.exec(trimmed)) !== null) {
        const precedingText = trimmed.substring(lastIndex, match.index);
        if (precedingText) {
          parts.push(<span key={`${lineIdx}-text-${lastIndex}`}>{precedingText}</span>);
        }

        const formula = match[2] || match[3] || '';
        try {
          const html = katex.renderToString(formula, {
            displayMode: false,
            throwOnError: false,
          });
          parts.push(
            <span
              key={`${lineIdx}-math-${match.index}`}
              className="px-1 text-blue-700 font-semibold"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch {
          parts.push(
            <code key={`${lineIdx}-math-fallback-${match.index}`} className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">
              {formula}
            </code>
          );
        }

        lastIndex = regex.lastIndex;
      }

      if (lastIndex < trimmed.length) {
        parts.push(
          <span key={`${lineIdx}-text-tail`}>
            {trimmed.substring(lastIndex)}
          </span>
        );
      }

      // If no $ math tags were found, but the line contains isolated LaTeX tokens like \alpha or \implies,
      // let's try a safe KaTeX parse if it doesn't look like regular Spanish text
      if (parts.length === 1 && isPureLatex) {
        try {
          const html = katex.renderToString(trimmed, {
            displayMode: false,
            throwOnError: false,
          });
          return (
            <div
              key={lineIdx}
              className="my-2 p-2.5 bg-slate-900/90 text-white rounded-lg overflow-x-auto text-center"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch {
          // keep regular text
        }
      }

      return (
        <p key={lineIdx} className="text-slate-800 leading-relaxed font-sans text-sm">
          {parts.length > 0 ? parts : trimmed}
        </p>
      );
    });
  }, [text]);

  return <div className={`space-y-1.5 ${className}`}>{renderedBlocks}</div>;
};
