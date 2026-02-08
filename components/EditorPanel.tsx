
import React, { useState, useRef, useEffect } from 'react';
import { ProtocolData, ProtocolSlide, SlideType, SectionType, SlideSection, ExerciseLibraryItem } from '../types';
import { extractExercisesFromHtml, generateExerciseDescription, generateExerciseImage, findDuplicateExercises } from '../services/geminiService';
import { generatePrintableHTML } from '../utils/htmlGenerator';
import { Plus, Trash2, GripVertical, Image as ImageIcon, AlertTriangle, CheckCircle, Info, ArrowDown, ArrowUp, Book, Save, X, Edit, Download, Upload, Loader2, Sparkles, SlidersHorizontal, Palette, Scaling, Search, Undo, Redo, RefreshCw, Youtube, Printer, CopyCheck, Merge, Wand2, ListChecks } from 'lucide-react';

interface EditorPanelProps {
  data: ProtocolData;
  onChange: (data: ProtocolData) => void;
  onImportClick: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const EditorPanel: React.FC<EditorPanelProps> = ({ 
    data, 
    onChange, 
    onImportClick,
    onUndo,
    onRedo,
    canUndo,
    canRedo
}) => {
  const [sidebarWidth, setSidebarWidth] = useState(450);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing) {
        const newWidth = document.body.clientWidth - e.clientX;
        if (newWidth > 300 && newWidth < 900) {
            setSidebarWidth(newWidth);
        }
      }
    };
    const handleMouseUp = () => setIsResizing(false);
    
    if (isResizing) {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const updateField = (field: keyof ProtocolData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  const updateSlide = (id: string, updates: Partial<ProtocolSlide>) => {
    const newSlides = data.slides.map(s => s.id === id ? { ...s, ...updates } : s);
    onChange({ ...data, slides: newSlides });
  };

  const addSlide = (type: SlideType) => {
    const newSlide: ProtocolSlide = {
      id: Date.now().toString(),
      type,
      title: type === SlideType.TRANSITION ? 'Transition' : 'New Section',
      imageUrl: type === SlideType.TRANSITION ? '' : undefined,
      sections: type === SlideType.TRANSITION ? [] : [
        { id: `sec-${Date.now()}`, type: SectionType.OBJECTIVES, title: 'Obiettivi', items: [] }
      ]
    };
    onChange({ ...data, slides: [...data.slides, newSlide] });
  };

  const removeSlide = (id: string) => {
    onChange({ ...data, slides: data.slides.filter(s => s.id !== id) });
  };

  const moveSlide = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === data.slides.length - 1) return;
    
    const newSlides = [...data.slides];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newSlides[index], newSlides[targetIndex]] = [newSlides[targetIndex], newSlides[index]];
    onChange({ ...data, slides: newSlides });
  };

  const addToLibrary = (name: string, img: string, description?: string) => {
      if(!name || !img) return;
      const exists = data.exerciseLibrary?.some(ex => ex.name.toLowerCase().trim() === name.toLowerCase().trim());
      if (exists) return;
      const newItem: ExerciseLibraryItem = { id: Date.now().toString(), name, img, description };
      onChange({ ...data, exerciseLibrary: [...(data.exerciseLibrary || []), newItem] });
  };

  const [showLibModal, setShowLibModal] = useState(false);

  const exportProject = () => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `project-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
      const printHtml = generatePrintableHTML(data);
      const printWindow = window.open('', '_blank');
      if (printWindow) {
          printWindow.document.write(printHtml);
          printWindow.document.close();
      }
  };

  return (
    <>
    <div ref={sidebarRef} style={{ width: sidebarWidth }} className="h-full relative shrink-0 shadow-xl z-20 flex">
      <div className="w-1.5 h-full bg-gray-200 hover:bg-blue-400 cursor-col-resize absolute left-0 top-0 z-30 transition-colors flex items-center justify-center group" onMouseDown={() => setIsResizing(true)}>
          <div className="h-8 w-1 bg-gray-400 rounded-full group-hover:bg-white" />
      </div>

      <div className="h-full w-full overflow-y-auto bg-gray-50 border-l border-gray-200">
        <div className="p-6 space-y-8">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-gray-800">Global Settings</h2>
                    <div className="flex gap-2">
                         <div className="flex gap-1 mr-2 border-r border-gray-200 pr-2">
                             <button onClick={onUndo} disabled={!canUndo} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-30"><Undo size={16} /></button>
                             <button onClick={onRedo} disabled={!canRedo} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-30"><Redo size={16} /></button>
                         </div>
                         <button onClick={handlePrint} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"><Printer size={16} /></button>
                         <button onClick={exportProject} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"><Download size={16} /></button>
                        <button onClick={onImportClick} className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full hover:bg-indigo-200 font-semibold flex items-center gap-1"><Wand2 size={12}/> AI Import</button>
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-4">
                    <input type="text" placeholder="Doctor Name" value={data.doctorName} onChange={(e) => updateField('doctorName', e.target.value)} className="input" />
                    <input type="text" placeholder="Protocol Title" value={data.protocolTitle} onChange={(e) => updateField('protocolTitle', e.target.value)} className="input" />
                    <input type="text" placeholder="Logo URL" value={data.logoUrl} onChange={(e) => updateField('logoUrl', e.target.value)} className="input font-mono text-xs" />
                    <div className="pt-2 border-t border-gray-100">
                        <button onClick={() => setShowLibModal(true)} className="flex items-center gap-2 text-sm font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 w-full justify-center py-2 rounded-lg shadow-sm">
                            <Book size={16}/> Manage Exercise Library
                        </button>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h2 className="text-lg font-bold text-gray-800">Slides</h2>
                {data.slides.map((slide, index) => (
                    <SlideEditor key={slide.id} slide={slide} index={index} totalSlides={data.slides.length} library={data.exerciseLibrary || []} protocolTitle={data.protocolTitle} onUpdate={(u) => updateSlide(slide.id, u)} onRemove={() => removeSlide(slide.id)} onMove={(dir) => moveSlide(index, dir)} onAddToLibrary={addToLibrary} />
                ))}
                <div className="grid grid-cols-2 gap-2 pt-4">
                    <button onClick={() => addSlide(SlideType.TRANSITION)} className="btn-add"><ImageIcon size={16} /> Add Transition</button>
                    <button onClick={() => addSlide(SlideType.PHASE)} className="btn-add"><Plus size={16} /> Add Phase</button>
                    <button onClick={() => addSlide(SlideType.WARNING)} className="btn-add"><AlertTriangle size={16} /> Add Warning</button>
                    <button onClick={() => addSlide(SlideType.FINAL)} className="btn-add"><CheckCircle size={16} /> Add Final</button>
                </div>
            </div>
        </div>
      </div>
    </div>

    {showLibModal && (
        <LibraryModal library={data.exerciseLibrary || []} protocolTitle={data.protocolTitle} onClose={() => setShowLibModal(false)} onUpdate={(newLib) => onChange({ ...data, exerciseLibrary: newLib })} />
    )}
    </>
  );
};

const LibrarySelectionModal: React.FC<{
    library: ExerciseLibraryItem[];
    onClose: () => void;
    onSelect: (item: ExerciseLibraryItem) => void;
}> = ({ library, onClose, onSelect }) => {
    const [search, setSearch] = useState('');
    const filtered = library.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
             <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh]">
                 <div className="flex items-center justify-between p-4 border-b border-gray-100">
                     <h3 className="text-lg font-bold text-gray-800">Select Exercise</h3>
                     <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                 </div>
                 <div className="p-4 bg-gray-50 border-b border-gray-100">
                     <input className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none" placeholder="Search Database..." autoFocus value={search} onChange={e => setSearch(e.target.value)} />
                 </div>
                 <div className="overflow-y-auto p-4 flex-1 space-y-2">
                     {filtered.map(item => (
                         <div key={item.id} className="flex gap-3 p-2 bg-white border border-gray-200 rounded-lg hover:border-blue-500 cursor-pointer transition-all group" onClick={() => onSelect(item)}>
                             <img src={item.img} alt="" className="w-12 h-12 rounded object-cover shrink-0 border border-gray-100"/>
                             <div className="flex-1 min-w-0"><div className="font-bold text-gray-800 text-sm">{item.name}</div><div className="text-xs text-gray-500 truncate">{item.description}</div></div>
                         </div>
                     ))}
                 </div>
             </div>
        </div>
    );
};

const LibraryModal: React.FC<{
    library: ExerciseLibraryItem[];
    protocolTitle: string;
    onClose: () => void;
    onUpdate: (lib: ExerciseLibraryItem[]) => void;
}> = ({ library, protocolTitle, onClose, onUpdate }) => {
    const [newItem, setNewItem] = useState<Partial<ExerciseLibraryItem>>({});
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showHtmlImport, setShowHtmlImport] = useState(false);
    const [htmlInput, setHtmlInput] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [isDescLoading, setIsDescLoading] = useState(false);
    const [isImgLoading, setIsImgLoading] = useState(false);
    const [isDuplicateLoading, setIsDuplicateLoading] = useState(false);
    const [duplicateGroups, setDuplicateGroups] = useState<any[] | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const saveItem = () => {
        if (!newItem.name || !newItem.img) return;
        if (editingId) {
            onUpdate(library.map(item => item.id === editingId ? { ...item, name: newItem.name!, img: newItem.img!, description: newItem.description } : item));
            setEditingId(null);
        } else {
            if (library.some(ex => ex.name.toLowerCase().trim() === newItem.name!.toLowerCase().trim())) {
                alert("This exercise is already in the library!");
                return;
            }
            onUpdate([...library, { id: Date.now().toString(), name: newItem.name!, img: newItem.img!, description: newItem.description }]);
        }
        setNewItem({});
    };

    const handleEdit = (item: ExerciseLibraryItem) => {
        setNewItem({ name: item.name, img: item.img, description: item.description });
        setEditingId(item.id);
        scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleAiHtmlImport = async () => {
        if(!htmlInput.trim()) return;
        setIsAiLoading(true);
        try {
            const extracted = await extractExercisesFromHtml(htmlInput);
            if (extracted && extracted.length > 0) {
                const filteredNewItems = extracted.filter(ni => !library.some(e => e.name.toLowerCase().trim() === ni.name?.toLowerCase().trim()));
                const newItems: ExerciseLibraryItem[] = filteredNewItems.map(e => ({ id: Date.now().toString() + Math.random().toString().slice(2,5), name: e.name || 'Unknown', img: e.img || '', description: e.description || '' }));
                onUpdate([...library, ...newItems]);
                setHtmlInput('');
                setShowHtmlImport(false);
            }
        } finally { setIsAiLoading(false); }
    };

    const handleCheckDuplicates = async () => {
        setIsDuplicateLoading(true);
        try {
            const groups = await findDuplicateExercises(library);
            if (groups && groups.length > 0) setDuplicateGroups(groups);
            else alert("No semantic duplicates found!");
        } finally { setIsDuplicateLoading(false); }
    };

    const handleMergeGroup = (group: any) => {
        const idsToRemove = new Set(group.ids);
        onUpdate([...library.filter(item => !idsToRemove.has(item.id)), { id: Date.now().toString() + Math.random().toString().slice(2,5), name: group.suggestedMerge.name, img: group.suggestedMerge.img, description: group.suggestedMerge.description }]);
        setDuplicateGroups(prev => prev?.filter(g => g !== group) || null);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl flex flex-col h-[90vh] overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white z-20">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Book className="text-blue-600"/> Exercise Library <span className="text-sm font-normal text-gray-400">({library.length})</span></h3>
                    <div className="flex gap-2">
                        <button onClick={handleCheckDuplicates} disabled={isDuplicateLoading} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 border border-blue-100 disabled:opacity-50">
                            {isDuplicateLoading ? <Loader2 className="animate-spin" size={16}/> : <CopyCheck size={16}/>} AI Duplicate Check
                        </button>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                    </div>
                </div>
                
                <div ref={scrollContainerRef} className="flex-1 overflow-y-auto bg-gray-50/50">
                    <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm p-4">
                        <div className={`p-4 rounded-xl border transition-all ${editingId ? 'bg-amber-50 border-amber-300 ring-4 ring-amber-100' : 'bg-blue-50/30 border-blue-100'}`}>
                            <div className="flex justify-between items-center mb-3">
                                <h4 className={`text-sm font-bold flex items-center gap-2 ${editingId ? 'text-amber-800' : 'text-blue-800'}`}>
                                    {editingId ? <><Edit size={14}/> Editing: {newItem.name}</> : <><Plus size={14}/> Create New Exercise</>}
                                </h4>
                                {editingId && <button onClick={() => { setEditingId(null); setNewItem({}); }} className="text-xs text-gray-500 hover:underline">Cancel Editing</button>}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <input placeholder="Exercise Name" className="w-full text-sm p-2 border border-gray-200 rounded outline-none focus:ring-2 focus:ring-blue-500" value={newItem.name || ''} onChange={e => setNewItem({...newItem, name: e.target.value})} />
                                <div className="flex gap-2">
                                    <input placeholder="Image URL" className="flex-1 text-[10px] p-2 border border-gray-200 rounded outline-none font-mono" value={newItem.img || ''} onChange={e => setNewItem({...newItem, img: e.target.value})} />
                                    <button onClick={async () => { if(!newItem.name) return; setIsImgLoading(true); const img = await generateExerciseImage(newItem.name, newItem.description || ""); if(img) setNewItem(p=>({...p, img})); setIsImgLoading(false); }} disabled={!newItem.name || isImgLoading} className="p-2 bg-white border border-gray-200 text-indigo-600 rounded hover:bg-indigo-50">
                                        {isImgLoading ? <Loader2 className="animate-spin" size={14}/> : <ImageIcon size={14}/>}
                                    </button>
                                </div>
                                <div className="relative flex gap-2">
                                    <textarea placeholder="Instructions..." className="flex-1 text-[10px] p-2 border border-gray-200 rounded outline-none h-10 resize-none" value={newItem.description || ''} onChange={e => setNewItem({...newItem, description: e.target.value})} />
                                    <button onClick={async () => { if(!newItem.name) return; setIsDescLoading(true); const d = await generateExerciseDescription(newItem.name, protocolTitle); if(d) setNewItem(p=>({...p, description: d})); setIsDescLoading(false); }} disabled={!newItem.name || isDescLoading} className="p-2 bg-white border border-gray-200 text-indigo-600 rounded hover:bg-indigo-50">
                                        {isDescLoading ? <Loader2 className="animate-spin" size={14}/> : <Sparkles size={14}/>}
                                    </button>
                                </div>
                            </div>
                            <button onClick={saveItem} disabled={!newItem.name || !newItem.img} className={`mt-3 w-full py-2 text-sm font-bold text-white rounded shadow-sm transition-all ${editingId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                                {editingId ? 'Update Database Item' : 'Add to Database'}
                            </button>
                        </div>
                    </div>

                    <div className="p-4 space-y-4">
                        <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                             <div className="text-sm font-semibold text-gray-700">Database Tools</div>
                             <div className="flex gap-2">
                                <button onClick={() => setShowHtmlImport(!showHtmlImport)} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-100 hover:bg-indigo-100 flex items-center gap-2"><RefreshCw size={12}/> AI Crawler</button>
                                <button onClick={() => { const b=new Blob([JSON.stringify(library,null,2)],{type:'application/json'}); const u=URL.createObjectURL(b); const a=document.createElement('a'); a.href=u; a.download=`library.json`; a.click(); }} className="px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-white flex items-center gap-2"><Download size={12}/> Export JSON</button>
                                <label className="px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-white cursor-pointer flex items-center gap-2">
                                    <Upload size={12}/> Import JSON
                                    <input type="file" className="hidden" accept=".json" onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const reader = new FileReader();
                                            reader.onload = (ev) => {
                                                try {
                                                    const imported = JSON.parse(ev.target?.result as string);
                                                    if (Array.isArray(imported)) {
                                                        onUpdate(imported);
                                                    }
                                                } catch(err) { alert("Invalid file"); }
                                            };
                                            reader.readAsText(file);
                                        }
                                        e.target.value = '';
                                    }}/>
                                </label>
                             </div>
                        </div>

                        {showHtmlImport && (
                            <div className="bg-white p-4 border border-indigo-200 rounded-xl shadow-lg animate-in fade-in slide-in-from-top-2">
                                <textarea className="w-full h-24 p-2 text-xs border border-gray-200 rounded font-mono" placeholder="Paste HTML snippet here..." value={htmlInput} onChange={e => setHtmlInput(e.target.value)} />
                                <div className="flex justify-end gap-2 mt-3">
                                    <button onClick={() => setShowHtmlImport(false)} className="px-3 py-1 text-xs text-gray-500">Cancel</button>
                                    <button onClick={handleAiHtmlImport} disabled={isAiLoading || !htmlInput.trim()} className="px-4 py-1.5 bg-indigo-600 text-white rounded text-xs font-bold disabled:opacity-50">
                                        {isAiLoading ? 'Analyzing...' : 'Auto-Import Detected Exercises'}
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                            {library.map(item => (
                                <div key={item.id} onClick={() => handleEdit(item)} className={`flex flex-col bg-white border rounded-xl shadow-sm group hover:border-blue-400 cursor-pointer transition-all overflow-hidden relative ${editingId === item.id ? 'ring-2 ring-amber-400 border-amber-400 bg-amber-50/20' : 'border-gray-200'}`}>
                                    <div className="h-24 w-full bg-gray-100"><img src={item.img} className="w-full h-full object-cover" alt=""/></div>
                                    <div className="p-2 flex-1"><div className="font-bold text-gray-800 text-[11px] leading-tight mb-1 truncate" title={item.name}>{item.name}</div><div className="text-[9px] text-gray-400 line-clamp-2">{item.description || 'No description'}</div></div>
                                    <button onClick={(e) => { e.stopPropagation(); onUpdate(library.filter(i => i.id !== item.id)); }} className="absolute top-1 right-1 p-1.5 bg-white/80 backdrop-blur rounded-lg text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12}/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SlideEditor: React.FC<{
  slide: ProtocolSlide; index: number; totalSlides: number; library: ExerciseLibraryItem[]; protocolTitle: string; onUpdate: (updates: Partial<ProtocolSlide>) => void; onRemove: () => void; onMove: (dir: 'up' | 'down') => void; onAddToLibrary: (name: string, img: string, desc?: string) => void;
}> = ({ slide, index, totalSlides, library, protocolTitle, onUpdate, onRemove, onMove, onAddToLibrary }) => {
  const [expanded, setExpanded] = useState(false);
  const getIcon = () => {
    switch(slide.type) {
        case SlideType.TRANSITION: return <ImageIcon className="text-purple-500" size={18} />;
        case SlideType.PHASE: return <Info className="text-blue-500" size={18} />;
        case SlideType.WARNING: return <AlertTriangle className="text-red-500" size={18} />;
        case SlideType.FINAL: return <CheckCircle className="text-green-500" size={18} />;
    }
  };
  const addSection = (type: SectionType) => onUpdate({ sections: [...(slide.sections || []), { id: `sec-${Date.now()}`, type, title: type === SectionType.EXERCISES ? 'Esercizi Consigliati' : type === SectionType.OBJECTIVES ? 'Obiettivi' : type === SectionType.CRITERIA ? 'Criteri di passaggio' : type === SectionType.VIDEO ? 'Video Tutorial' : 'Informazioni', items: [] }] });
  return (
    <div className={`bg-white rounded-lg shadow-sm border ${expanded ? 'border-blue-300 ring-1 ring-blue-100' : 'border-gray-200'} transition-all`}>
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-t-lg border-b border-gray-100">
        <div className="cursor-grab text-gray-400 hover:text-gray-600"><GripVertical size={16} /></div>
        <div className="flex-1 font-medium text-sm text-gray-700 flex items-center gap-2">{getIcon()}<span className="truncate max-w-[200px]">{slide.title || slide.type}</span></div>
        <div className="flex items-center gap-1">
            <button disabled={index === 0} onClick={() => onMove('up')} className="icon-btn"><ArrowUp size={14} /></button>
            <button disabled={index === totalSlides - 1} onClick={() => onMove('down')} className="icon-btn"><ArrowDown size={14} /></button>
            <button onClick={() => setExpanded(!expanded)} className="text-xs text-blue-600 px-2 font-bold">{expanded ? 'Close' : 'Edit'}</button>
            <button onClick={onRemove} className="icon-btn hover:text-red-600"><Trash2 size={14} /></button>
        </div>
      </div>
      {expanded && (
        <div className="p-4 space-y-4">
            {slide.type === SlideType.TRANSITION ? (
                <div><label className="label">Cover Image URL</label><input type="text" className="input" value={slide.imageUrl || ''} onChange={(e) => onUpdate({ imageUrl: e.target.value })} /></div>
            ) : (
                <div><label className="label">Slide Title</label><input type="text" className="input" value={slide.title || ''} onChange={(e) => onUpdate({ title: e.target.value })} /></div>
            )}
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                 <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-1"><Palette size={12}/> Appearance</h4>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] text-gray-500 mb-1 block">Background</label>
                        <input type="color" value={slide.backgroundColor || '#ffffff'} onChange={(e) => onUpdate({ backgroundColor: e.target.value })} className="w-full h-8 cursor-pointer rounded border border-gray-200" />
                    </div>
                    <div className="flex gap-2 items-end">
                        <div className="flex-1">
                            <label className="text-[10px] text-gray-500 mb-1 block">Width (px)</label>
                            <input type="number" className="input text-center h-8" value={slide.customWidth || 700} onChange={e=>onUpdate({customWidth:parseInt(e.target.value)})}/>
                        </div>
                        <div className="flex-1">
                            <label className="text-[10px] text-gray-500 mb-1 block">Height (px)</label>
                            <input type="number" className="input text-center h-8" value={slide.customHeight || 510} onChange={e=>onUpdate({customHeight:parseInt(e.target.value)})}/>
                        </div>
                    </div>
                </div>
            </div>
            {slide.type !== SlideType.TRANSITION && (
                <div className="space-y-4 mt-4">
                    <label className="label border-b border-gray-200 pb-1">Sections</label>
                    {(slide.sections || []).map((sec, idx) => (
                        <SectionEditor 
                            key={sec.id} 
                            section={sec} 
                            index={idx} 
                            total={(slide.sections || []).length} 
                            library={library} 
                            protocolTitle={protocolTitle} 
                            onUpdate={(u) => onUpdate({ sections: (slide.sections || []).map(s => s.id === sec.id ? { ...s, ...u } : s) })} 
                            onRemove={() => onUpdate({ sections: (slide.sections || []).filter(s => s.id !== sec.id) })} 
                            onMove={(dir) => { 
                                const s = [...(slide.sections || [])]; 
                                const t = dir === 'up' ? idx - 1 : idx + 1; 
                                if (t >= 0 && t < s.length) {
                                    [s[idx], s[t]] = [s[t], s[idx]]; 
                                    onUpdate({ sections: s });
                                }
                            }} 
                            onAddToLibrary={onAddToLibrary} 
                        />
                    ))}
                    <div className="flex gap-2 flex-wrap">
                        <button onClick={() => addSection(SectionType.OBJECTIVES)} className="tag-btn">+ Objectives</button>
                        <button onClick={() => addSection(SectionType.CRITERIA)} className="tag-btn text-amber-700 bg-amber-50">+ Criteria</button>
                        <button onClick={() => addSection(SectionType.EXERCISES)} className="tag-btn text-blue-700 bg-blue-50">+ Exercises</button>
                        <button onClick={() => addSection(SectionType.INFO)} className="tag-btn">+ Info</button>
                        <button onClick={() => addSection(SectionType.VIDEO)} className="tag-btn text-red-600 bg-red-50">+ Video</button>
                    </div>
                </div>
            )}
        </div>
      )}
    </div>
  );
};

const SectionEditor: React.FC<{
    section: SlideSection; index: number; total: number; library: ExerciseLibraryItem[]; protocolTitle: string; onUpdate: (updates: Partial<SlideSection>) => void; onRemove: () => void; onMove: (dir: 'up' | 'down') => void; onAddToLibrary: (name: string, img: string, desc?: string) => void;
}> = ({ section, library, protocolTitle, onUpdate, onRemove, onAddToLibrary, index, total, onMove }) => {
    const [isLibOpen, setIsLibOpen] = useState(false);
    const [loadingImages, setLoadingImages] = useState<Record<number, boolean>>({});
    const [loadingDescriptions, setLoadingDescriptions] = useState<Record<number, boolean>>({});

    const updateItem = (idx: number, updates: any) => { 
        const newItems = [...section.items]; 
        newItems[idx] = { ...newItems[idx], ...updates }; 
        onUpdate({ items: newItems }); 
    };

    const handleGenImage = async (idx: number, name: string) => {
        if (!name) return;
        setLoadingImages(prev => ({...prev, [idx]: true}));
        try {
            const currentDescription = section.items[idx]?.description || "";
            const imgData = await generateExerciseImage(name, currentDescription);
            if (imgData) updateItem(idx, { img: imgData });
        } finally { setLoadingImages(prev => ({...prev, [idx]: false})); }
    };

    const handleGenDescription = async (idx: number, name: string) => {
        if(!name) return;
        setLoadingDescriptions(prev => ({...prev, [idx]: true}));
        try {
            const desc = await generateExerciseDescription(name, protocolTitle);
            if(desc) updateItem(idx, { description: desc });
        } finally { setLoadingDescriptions(prev => ({...prev, [idx]: false})); }
    };

    return (
        <div className="border rounded-md mb-3 overflow-hidden bg-white shadow-sm border-gray-200">
            <div className="flex justify-between items-center px-2 py-1.5 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center gap-2">
                    <div className="flex flex-col">
                        <button disabled={index === 0} onClick={() => onMove('up')} className="text-gray-400 hover:text-blue-600 disabled:opacity-30"><ArrowUp size={10} /></button>
                        <button disabled={index === total - 1} onClick={() => onMove('down')} className="text-gray-400 hover:text-blue-600 disabled:opacity-30"><ArrowDown size={10} /></button>
                    </div>
                    <input className="bg-transparent border-none p-0 text-xs font-bold uppercase w-full outline-none text-gray-600" value={section.title} onChange={(e) => onUpdate({ title: e.target.value })} />
                </div>
                <button onClick={onRemove} className="hover:text-red-700 text-gray-300 transition-colors"><Trash2 size={12} /></button>
            </div>
            <div className="p-2 space-y-3">
                {section.items.map((item, idx) => (
                    <div key={idx} className="space-y-2 pb-2 border-b border-gray-50 last:border-0">
                        <div className="flex gap-2 items-start">
                            <textarea rows={1} className="flex-1 text-xs p-1.5 border border-gray-200 rounded outline-none focus:ring-1 focus:ring-blue-300 resize-none min-h-[30px]" value={item.text} placeholder={section.type === SectionType.VIDEO ? "YouTube URL" : "Item Text"} onChange={(e) => updateItem(idx, { text: e.target.value })} />
                            <button onClick={() => onUpdate({ items: section.items.filter((_, i) => i !== idx) })} className="text-gray-300 hover:text-red-500 mt-1"><Trash2 size={12} /></button>
                        </div>
                        {section.type === SectionType.EXERCISES && (
                            <div className="pl-1 space-y-2">
                                <div className="flex gap-2 items-center">
                                    <ImageIcon size={12} className="text-gray-400"/>
                                    <input placeholder="Image URL" className="flex-1 text-[9px] p-1 bg-gray-50 border border-gray-100 rounded outline-none font-mono" value={item.img || ''} onChange={e=>updateItem(idx,{img:e.target.value})}/>
                                    <button onClick={() => handleGenImage(idx, item.text)} disabled={!item.text || loadingImages[idx]} className="text-indigo-500 hover:text-indigo-700">
                                        {loadingImages[idx] ? <Loader2 className="animate-spin" size={12}/> : <Sparkles size={12}/>}
                                    </button>
                                    {item.img && <button onClick={()=>onAddToLibrary(item.text,item.img!,item.description)} className="text-blue-500 hover:text-blue-700" title="Save to Database"><Save size={12}/></button>}
                                </div>
                                <div className="relative">
                                    <textarea placeholder="Instructions..." className="w-full text-[9px] p-1 bg-gray-50 border border-gray-100 rounded outline-none h-12 resize-none" value={item.description || ''} onChange={e=>updateItem(idx,{description:e.target.value})}/>
                                    <button onClick={() => handleGenDescription(idx, item.text)} disabled={!item.text || loadingDescriptions[idx]} className="absolute bottom-1 right-1 text-indigo-500 hover:text-indigo-700">
                                        {loadingDescriptions[idx] ? <Loader2 className="animate-spin" size={10}/> : <Sparkles size={10}/>}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
                <div className="flex gap-2 pt-1">
                    <button onClick={() => onUpdate({ items: [...section.items, { text: '' }] })} className="text-[10px] text-gray-400 hover:text-blue-600 font-medium">+ Add Item</button>
                    {section.type === SectionType.EXERCISES && <button onClick={() => setIsLibOpen(true)} className="text-[10px] text-indigo-600 font-bold hover:underline transition-all">+ From Database</button>}
                </div>
            </div>
            {isLibOpen && <LibrarySelectionModal library={library} onClose={() => setIsLibOpen(false)} onSelect={(libItem) => { onUpdate({ items: [...section.items, { text: libItem.name, img: libItem.img, description: libItem.description }] }); setIsLibOpen(false); }} />}
        </div>
    );
};

export default EditorPanel;
