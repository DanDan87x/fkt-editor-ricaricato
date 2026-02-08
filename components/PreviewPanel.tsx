
import React, { useEffect, useState, useRef } from 'react';
import { generateHTML } from '../utils/htmlGenerator';
import { ProtocolData } from '../types';
import { Code, Eye, Monitor, Tablet, Smartphone, Copy, Check } from 'lucide-react';

interface PreviewPanelProps {
  data: ProtocolData;
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({ data }) => {
  const [mode, setMode] = useState<'visual' | 'code'>('visual');
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [htmlContent, setHtmlContent] = useState('');
  const [copied, setCopied] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Debounce the generation slightly to prevent flickering on rapid keystrokes
    const timeout = setTimeout(() => {
        const html = generateHTML(data);
        setHtmlContent(html);
        if (iframeRef.current && mode === 'visual') {
            const doc = iframeRef.current.contentDocument;
            if (doc) {
                doc.open();
                doc.write(html);
                doc.close();
            }
        }
    }, 300);
    return () => clearTimeout(timeout);
  }, [data, mode]);

  const handleCopy = () => {
    navigator.clipboard.writeText(htmlContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getWidth = () => {
      switch(device) {
          case 'mobile': return '375px';
          case 'tablet': return '768px';
          default: return '100%';
      }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700 bg-gray-800">
        <div className="flex gap-1 bg-gray-700 rounded p-1">
          <button 
            onClick={() => setMode('visual')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-all ${mode === 'visual' ? 'bg-blue-600 text-white shadow' : 'text-gray-300 hover:text-white'}`}
          >
            <Eye size={16} /> Preview
          </button>
          <button 
            onClick={() => setMode('code')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-all ${mode === 'code' ? 'bg-blue-600 text-white shadow' : 'text-gray-300 hover:text-white'}`}
          >
            <Code size={16} /> Code
          </button>
        </div>

        {mode === 'visual' && (
             <div className="flex gap-2">
                 <button onClick={() => setDevice('desktop')} className={`p-2 rounded ${device === 'desktop' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'}`}><Monitor size={18}/></button>
                 <button onClick={() => setDevice('tablet')} className={`p-2 rounded ${device === 'tablet' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'}`}><Tablet size={18}/></button>
                 <button onClick={() => setDevice('mobile')} className={`p-2 rounded ${device === 'mobile' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'}`}><Smartphone size={18}/></button>
             </div>
        )}

        <button 
            onClick={handleCopy}
            className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-200"
        >
            {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
            {copied ? 'Copied' : 'Copy HTML'}
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative bg-gray-900/50 flex justify-center">
        {mode === 'visual' ? (
            <div className={`transition-all duration-300 h-full bg-white shadow-2xl overflow-hidden ${device !== 'desktop' ? 'my-4 rounded-xl border-8 border-gray-800' : ''}`} style={{ width: getWidth() }}>
                <iframe 
                    ref={iframeRef}
                    title="Preview"
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
                    allowFullScreen
                />
            </div>
        ) : (
            <div className="w-full h-full overflow-auto p-4 font-mono text-sm">
                <pre className="text-blue-300 whitespace-pre-wrap break-all">{htmlContent}</pre>
            </div>
        )}
      </div>
    </div>
  );
};

export default PreviewPanel;