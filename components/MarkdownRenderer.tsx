
import React, { useState } from 'react';
import Markdown from 'markdown-to-jsx';
import { Copy, Check, Terminal } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const CodeBlock = ({ className, children }: any) => {
  const [copied, setCopied] = useState(false);
  const language = className ? className.replace('lang-', '') : 'TEXT';

  const handleCopy = () => {
    let textToCopy = '';
    if (typeof children === 'string') {
        textToCopy = children;
    } else if (Array.isArray(children)) {
        textToCopy = children.map((c: any) => typeof c === 'string' ? c : '').join('');
    } else if (children && typeof children.toString === 'function') {
        textToCopy = children.toString();
    }

    if (textToCopy) {
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="my-4 rounded-lg overflow-hidden border border-slate-700 bg-[#0b1120] shadow-lg">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800/50 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
           <Terminal size={14} className="text-slate-400" />
           <span className="text-xs font-mono font-bold text-slate-300 uppercase">{language}</span>
        </div>
        <button 
          onClick={handleCopy} 
          className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
        >
          {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          {copied ? 'Copiato!' : 'Copia'}
        </button>
      </div>
      <div className="p-4 overflow-x-hidden">
        <code className="font-mono text-sm leading-relaxed text-indigo-100/90 whitespace-pre-wrap break-all" style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
          {children}
        </code>
      </div>
    </div>
  );
};

// --- Override Components (Defined Outside) ---

const MDH1 = ({ children, ...props }: any) => (
  <h1 {...props} className="text-2xl md:text-3xl font-bold text-white mt-8 mb-4 border-b border-slate-700 pb-2">
    {children}
  </h1>
);

const MDH2 = ({ children, ...props }: any) => (
  <h2 {...props} className="text-xl md:text-2xl font-bold text-indigo-200 mt-6 mb-3 flex items-center gap-2">
    <span className="text-indigo-500">#</span> {children}
  </h2>
);

const MDH3 = ({ children, ...props }: any) => (
  <h3 {...props} className="text-lg md:text-xl font-bold text-slate-100 mt-5 mb-2">
    {children}
  </h3>
);

const MDP = ({ children, ...props }: any) => (
  <p {...props} className="text-slate-300 leading-7 mb-4 text-sm md:text-base">
    {children}
  </p>
);

const MDUL = ({ children, ...props }: any) => (
  <ul {...props} className="list-disc pl-6 mb-4 space-y-2 text-slate-300 marker:text-indigo-500">
    {children}
  </ul>
);

const MDOL = ({ children, ...props }: any) => (
  <ol {...props} className="list-decimal pl-6 mb-4 space-y-2 text-slate-300 marker:text-indigo-500 font-medium">
    {children}
  </ol>
);

const MDLI = ({ children, ...props }: any) => (
  <li {...props} className="pl-1">
    {children}
  </li>
);

const MDBlockquote = ({ children, ...props }: any) => (
  <blockquote {...props} className="border-l-4 border-indigo-500 pl-4 py-1 my-4 bg-indigo-900/10 italic text-slate-400 rounded-r-lg">
    {children}
  </blockquote>
);

const MDCode = ({ className, children, ...props }: any) => (
  <code {...props} className="bg-slate-800/80 text-indigo-300 px-1.5 py-0.5 rounded text-sm font-mono border border-slate-700">
    {children}
  </code>
);

const MDA = ({ children, ...props }: any) => (
  <a {...props} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-4 decoration-indigo-500/30 transition-colors font-medium">
    {children}
  </a>
);

const MDHR = () => <hr className="border-slate-700 my-6" />;

const MDPre = ({ children, ...props }: any) => {
    // Robust extraction of code element
    const childrenArray = React.Children.toArray(children);
    const codeElement = childrenArray.find((child) => React.isValidElement(child));

    if (codeElement && React.isValidElement(codeElement)) {
        const { className, children: codeChildren } = codeElement.props as any;
        return (
            <CodeBlock className={className}>
                {codeChildren}
            </CodeBlock>
        );
    }
    
    return (
        <CodeBlock className="text">
            {children}
        </CodeBlock>
    );
};

// Static Options Object to guarantee stability
const MARKDOWN_OPTIONS = {
  overrides: {
    h1: MDH1,
    h2: MDH2,
    h3: MDH3,
    p: MDP,
    ul: MDUL,
    ol: MDOL,
    li: MDLI,
    blockquote: MDBlockquote,
    code: MDCode,
    pre: MDPre,
    a: MDA,
    hr: MDHR
  },
};

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  return (
    <div className={`markdown-content w-full ${className}`}>
      <Markdown options={MARKDOWN_OPTIONS}>
        {content}
      </Markdown>
    </div>
  );
};

export default MarkdownRenderer;
