import { useState, useCallback, useEffect } from 'react';
import PreviewPanel from './components/PreviewPanel';
import EditorPanel from './components/EditorPanel';
import { ProtocolData, INITIAL_DATA } from './types';
import { parseProtocolFromText } from './services/geminiService';
import { Wand2, X, Loader2 } from 'lucide-react';

export default function App() {
  // History State Management
  const [history, setHistory] = useState<{
    past: ProtocolData[];
    present: ProtocolData;
    future: ProtocolData[];
  }>({
    past: [],
    present: INITIAL_DATA,
    future: []
  });

  const { present, past, future } = history;

  // Wrapped setter to push to history
  const handleDataChange = useCallback((newData: ProtocolData) => {
    setHistory(curr => {
      // Limit history size to 50 steps to prevent excessive memory usage
      const newPast = [...curr.past, curr.present];
      if (newPast.length > 50) newPast.shift();
      
      return {
        past: newPast,
        present: newData,
        future: []
      };
    });
  }, []);

  const undo = useCallback(() => {
    setHistory(curr => {
      if (curr.past.length === 0) return curr;
      const previous = curr.past[curr.past.length - 1];
      const newPast = curr.past.slice(0, curr.past.length - 1);
      return {
        past: newPast,
        present: previous,
        future: [curr.present, ...curr.future]
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory(curr => {
      if (curr.future.length === 0) return curr;
      const next = curr.future[0];
      const newFuture = curr.future.slice(1);
      return {
        past: [...curr.past, curr.present],
        present: next,
        future: newFuture
      };
    });
  }, []);

  // Keyboard shortcuts for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAIImport = async () => {
    if (!importText.trim()) return;
    setIsProcessing(true);
    setError(null);
    try {
      // Pass existing library for automatic mapping
      const parsedData = await parseProtocolFromText(importText, present.exerciseLibrary);
      if (parsedData) {
        handleDataChange(parsedData);
        setIsImportModalOpen(false);
        setImportText('');
      } else {
        setError('Could not parse meaningful data from text.');
      }
    } catch (e) {
      setError('Error parsing text. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 justify-between shrink-0 z-10">
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">M</div>
            <h1 className="text-gray-800 font-bold text-lg tracking-tight">MediProto<span className="text-blue-600">Builder</span></h1>
        </div>
        <div className="text-xs text-gray-500 font-medium">
             v1.0.0 • React 18
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left: Preview (Flexible width, default larger) */}
        <div className="flex-1 h-full min-w-0">
          <PreviewPanel data={present} />
        </div>

        {/* Right: Editor (Resizable) */}
        <EditorPanel 
          data={present} 
          onChange={handleDataChange} 
          onImportClick={() => setIsImportModalOpen(true)}
          onUndo={undo}
          onRedo={redo}
          canUndo={past.length > 0}
          canRedo={future.length > 0}
        />
      </main>

      {/* AI Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <div className="flex items-center gap-2 text-indigo-700 font-bold text-lg">
                    <Wand2 size={20} />
                    AI Magic Import
                </div>
                <button onClick={() => setIsImportModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            
            <div className="p-6 flex-1 overflow-auto">
                <p className="text-sm text-gray-600 mb-4">
                    Paste your raw protocol text below. Our AI will automatically map detected exercises to your existing database.
                </p>
                <textarea 
                    className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm leading-relaxed resize-none"
                    placeholder="Paste recovery protocol text here..."
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                />
                {error && <div className="mt-2 text-red-600 text-sm font-medium bg-red-50 p-2 rounded">{error}</div>}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end gap-3">
                <button 
                    onClick={() => setIsImportModalOpen(false)}
                    className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-lg text-sm"
                >
                    Cancel
                </button>
                <button 
                    onClick={handleAIImport}
                    disabled={isProcessing || !importText.trim()}
                    className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <Wand2 size={16} />}
                    {isProcessing ? 'Processing...' : 'Generate Structure'}
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}