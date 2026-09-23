import React from 'react';

interface MathRendererProps {
  text: string;
  className?: string;
}

/**
 * Renders mathematical expressions, formatting LaTeX symbols, fractions,
 * matrices, limits, exponents, and vectors with high readability.
 */
export const MathRenderer: React.FC<MathRendererProps> = ({ text, className = '' }) => {
  if (!text) return null;

  // Split by line to detect equations vs text
  const lines = text.split('\n');

  return (
    <div className={`space-y-2 font-mono text-sm leading-relaxed ${className}`}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        // Detect if line is primarily a formula / equation
        const isEquation =
          trimmed.includes('\\') ||
          trimmed.includes('=') ||
          trimmed.includes('->') ||
          trimmed.includes('lim') ||
          trimmed.includes('pmatrix') ||
          trimmed.includes('int') ||
          trimmed.includes('^') ||
          trimmed.includes('sum');

        // Clean common LaTeX commands into friendly typography
        const formatted = trimmed
          .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1 / $2)')
          .replace(/\\lim_\{([^}]+)\}/g, 'lim($1)')
          .replace(/\\lim/g, 'lim')
          .replace(/\\to/g, ' → ')
          .replace(/\\xrightarrow\{([^}]+)\}/g, ' ──[$1]──> ')
          .replace(/\\implies/g, ' ⟹ ')
          .replace(/\\in/g, ' ∈ ')
          .replace(/\\cap/g, ' ∩ ')
          .replace(/\\cup/g, ' ∪ ')
          .replace(/\\oplus/g, ' ⊕ ')
          .replace(/\\mathbb\{R\}/g, 'ℝ')
          .replace(/\\mathbb\{C\}/g, 'ℂ')
          .replace(/\\mathbb\{N\}/g, 'ℕ')
          .replace(/\\alpha/g, 'α')
          .replace(/\\beta/g, 'β')
          .replace(/\\theta/g, 'θ')
          .replace(/\\lambda/g, 'λ')
          .replace(/\\mu/g, 'μ')
          .replace(/\\Delta/g, 'Δ')
          .replace(/\\sum/g, '∑')
          .replace(/\\int/g, '∫')
          .replace(/\\vec\{([^}]+)\}/g, 'vec($1)')
          .replace(/\\operatorname\{([^}]+)\}/g, '$1')
          .replace(/\\dim/g, 'dim')
          .replace(/\\boxed\{([^}]+)\}/g, '⟦ $1 ⟧')
          .replace(/\\text\{([^}]+)\}/g, '$1')
          .replace(/\\left\(/g, '(')
          .replace(/\\right\)/g, ')')
          .replace(/\\left\[/g, '[')
          .replace(/\\right\]/g, ']')
          .replace(/\\begin\{pmatrix\}/g, '[ ')
          .replace(/\\end\{pmatrix\}/g, ' ]')
          .replace(/\\\\/g, ' | ')
          .replace(/&/g, '  ')
          .replace(/\\quad/g, '  ');

        if (isEquation) {
          return (
            <div
              key={idx}
              className="p-3 my-1.5 bg-slate-900 text-sky-300 rounded-lg border border-slate-800 overflow-x-auto shadow-inner"
            >
              <code className="text-sm font-semibold tracking-wide whitespace-pre-wrap">
                {formatted}
              </code>
            </div>
          );
        }

        return (
          <p key={idx} className="font-sans text-slate-700">
            {line}
          </p>
        );
      })}
    </div>
  );
};
