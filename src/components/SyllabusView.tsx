import { useState } from 'react';
import { ClassGroup } from '../types';
import { CheckSquare, Square, Plus, Edit2, Check, X, Trash2 } from 'lucide-react';
import { cn } from '../utils';
import { ConfirmModal } from './ConfirmModal';

interface Props {
  classes: ClassGroup[];
  toggleTopic: (classId: string, subjectId: string, topicId: string) => void;
  addClass: (name: string, form: string, size?: number, language?: string, initialSubjects?: string[]) => void;
  editClass?: (classId: string, name: string, form: string, size?: number, language?: string, newSubjects?: string[]) => void;
  deleteClass?: (classId: string) => void;
  addSubject: (classId: string, name: string) => void;
  editSubject: (classId: string, subjectId: string, newName: string) => void;
  addTopic: (classId: string, subjectId: string, title: string) => void;
  deleteTopic: (classId: string, subjectId: string, topicId: string) => void;
  updateTopicRemarks: (classId: string, subjectId: string, topicId: string, remarks: string) => void;
}

export function SyllabusView({ classes, toggleTopic, addClass, editClass, deleteClass, addSubject, editSubject, addTopic, deleteTopic, updateTopicRemarks }: Props) {
  const [addingClass, setAddingClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassSize, setNewClassSize] = useState<number | ''>('');
  const [newClassLanguage, setNewClassLanguage] = useState('中文');
  const [newClassForm, setNewClassForm] = useState('中一');
  const [newClassSubjects, setNewClassSubjects] = useState<string[]>([]);
  
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editClassName, setEditClassName] = useState('');
  const [editClassSize, setEditClassSize] = useState<number | ''>('');
  const [editClassLanguage, setEditClassLanguage] = useState('');
  const [editClassForm, setEditClassForm] = useState('中一');
  const [editClassSubjects, setEditClassSubjects] = useState<string[]>([]);
  const [classToDelete, setClassToDelete] = useState<string | null>(null);
  
  const [addingSubjectId, setAddingSubjectId] = useState<string | null>(null);
  const [newSubjectName, setNewSubjectName] = useState('');
  
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editSubjectName, setEditSubjectName] = useState('');
  
  const [addingTopicId, setAddingTopicId] = useState<string | null>(null);
  const [newTopicTitle, setNewTopicTitle] = useState('');

  const [editingRemarksTopicId, setEditingRemarksTopicId] = useState<string | null>(null);
  const [tempRemarks, setTempRemarks] = useState('');
  const [topicToDelete, setTopicToDelete] = useState<{classId: string, subjectId: string, topicId: string} | null>(null);

  const ALL_FORMS = ['中一', '中二', '中三', '中四', '中五', '中六'];
  const FORM_LABELS: Record<string, string> = {
    '中一': 'Form 1',
    '中二': 'Form 2',
    '中三': 'Form 3',
    '中四': 'Form 4',
    '中五': 'Form 5',
    '中六': 'Form 6',
  };
  const [activeFormTab, setActiveFormTab] = useState<string>(ALL_FORMS[0]);

  const filteredClasses = classes.filter(c => (c.form || '中一') === activeFormTab);

  const handleAddClass = () => {
    if (newClassName.trim()) {
      addClass(newClassName.trim(), newClassForm, newClassSize === '' ? undefined : newClassSize, newClassLanguage, newClassSubjects);
      setNewClassName('');
      setNewClassForm('中一');
      setNewClassSize('');
      setNewClassLanguage('中文');
      setNewClassSubjects([]);
      setAddingClass(false);
    }
  };

  const toggleNewClassSubject = (subject: string) => {
    setNewClassSubjects(prev => 
      prev.includes(subject) ? prev.filter(s => s !== subject) : [...prev, subject]
    );
  };

  const toggleEditClassSubject = (subject: string) => {
    setEditClassSubjects(prev => 
      prev.includes(subject) ? prev.filter(s => s !== subject) : [...prev, subject]
    );
  };

  const handleEditClass = (classId: string) => {
    if (editClassName.trim() && editClass) {
      editClass(classId, editClassName.trim(), editClassForm, editClassSize === '' ? undefined : editClassSize, editClassLanguage, editClassSubjects);
      setEditingClassId(null);
    }
  };

  const handleAddSubject = (classId: string) => {
    if (newSubjectName.trim()) {
      addSubject(classId, newSubjectName.trim());
      setNewSubjectName('');
      setAddingSubjectId(null);
    }
  };

  const handleEditSubject = (classId: string, subjectId: string) => {
    if (editSubjectName.trim()) {
      editSubject(classId, subjectId, editSubjectName.trim());
      setEditingSubjectId(null);
    }
  };

  const handleAddTopic = (classId: string, subjectId: string) => {
    if (newTopicTitle.trim()) {
      addTopic(classId, subjectId, newTopicTitle.trim());
      setNewTopicTitle('');
      setAddingTopicId(null);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-4 md:mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-[#3D3833]">課程涵蓋率</h2>
          <p className="text-sm md:text-base text-[#8E877F] mt-1">追蹤各班級的教學進度及課題。</p>
        </div>
        <button 
          onClick={() => setAddingClass(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#88968A] text-white rounded-full hover:opacity-90 transition-all font-medium text-sm shadow-sm hover:shadow-md"
        >
          <Plus className="w-4 h-4" />
          新增班級
        </button>
      </header>

      <div className="flex gap-2 border-b border-[#E9E3DB] mb-6 overflow-x-auto pb-px scrollbar-hide">
        {ALL_FORMS.map(form => (
          <button
            key={form}
            onClick={() => setActiveFormTab(form)}
            className={cn(
              "px-5 py-3 font-medium text-sm transition-all relative whitespace-nowrap",
              activeFormTab === form ? "text-[#3D3833]" : "text-[#8E877F] hover:text-[#3D3833]"
            )}
          >
            {FORM_LABELS[form]}
            {activeFormTab === form && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#88968A]"></div>
            )}
          </button>
        ))}
      </div>

      {addingClass && (
        <div className="bg-white p-6 rounded-xl border border-[#E9E3DB] mb-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-[#3D3833]">新增班級資料</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#8E877F] mb-1">班級名稱 (必填)</label>
              <input 
                value={newClassName} 
                onChange={e => setNewClassName(e.target.value)}
                placeholder="例如: 3A班"
                className="w-full bg-[#F9F6F2] border border-[#E9E3DB] px-4 py-2.5 rounded-lg text-[#3D3833] focus:outline-none focus:ring-2 focus:ring-[#88968A] text-sm"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#8E877F] mb-1">年級 (Form)</label>
              <select
                value={newClassForm}
                onChange={e => setNewClassForm(e.target.value)}
                className="w-full bg-[#F9F6F2] border border-[#E9E3DB] px-4 py-2.5 rounded-lg text-[#3D3833] focus:outline-none focus:ring-2 focus:ring-[#88968A] text-sm"
              >
                {['中一', '中二', '中三', '中四', '中五', '中六'].map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#8E877F] mb-1">班級人數 (1-35)</label>
              <input 
                type="number"
                min="1" max="35"
                value={newClassSize} 
                onChange={e => setNewClassSize(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="例如: 30"
                className="w-full bg-[#F9F6F2] border border-[#E9E3DB] px-4 py-2.5 rounded-lg text-[#3D3833] focus:outline-none focus:ring-2 focus:ring-[#88968A] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#8E877F] mb-1">教學語言 (Medium)</label>
              <select
                value={newClassLanguage}
                onChange={e => setNewClassLanguage(e.target.value)}
                className="w-full bg-[#F9F6F2] border border-[#E9E3DB] px-4 py-2.5 rounded-lg text-[#3D3833] focus:outline-none focus:ring-2 focus:ring-[#88968A] text-sm"
              >
                <option value="中文">中文</option>
                <option value="English">English</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#8E877F] mb-1">科目</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {['歷史', '中國歷史', 'CES', 'CSD'].map(sub => (
                  <label key={sub} className="flex items-center gap-1.5 text-sm text-[#4A443F] cursor-pointer bg-[#F9F6F2] px-2 py-1.5 rounded-lg border border-[#E9E3DB] hover:border-[#88968A]">
                    <input 
                      type="checkbox" 
                      checked={newClassSubjects.includes(sub)}
                      onChange={() => toggleNewClassSubject(sub)}
                      className="rounded text-[#88968A] focus:ring-[#88968A] border-[#D9CEC1]"
                    />
                    {sub}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2 w-full pt-2">
            <button onClick={handleAddClass} className="bg-[#88968A] text-white px-5 py-2.5 rounded-lg font-medium text-sm transition-all hover:opacity-90">儲存</button>
            <button onClick={() => setAddingClass(false)} className="bg-[#F1EDE9] text-[#4A443F] px-5 py-2.5 rounded-lg font-medium text-sm transition-all hover:bg-[#E9E3DB]">取消</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
        {filteredClasses.length === 0 ? (
          <div className="col-span-1 xl:col-span-2 text-center py-16 bg-white rounded-2xl border border-dashed border-[#D9CEC1]">
            <p className="text-[#8E877F] mb-4">這個年級目前沒有班級。</p>
            <button 
              onClick={() => {
                setAddingClass(true);
                setNewClassForm(activeFormTab);
              }}
              className="px-4 py-2 bg-[#F9F6F2] text-[#4A443F] rounded-lg text-sm font-medium hover:bg-[#E9E3DB] transition-colors"
            >
              新增班級
            </button>
          </div>
        ) : (
          filteredClasses.map(c => {
            const isEditing = editingClassId === c.id;
          
          if (isEditing) {
            return (
              <div key={c.id} className="bg-white p-6 rounded-2xl shadow-sm border border-[#E9E3DB] space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-bold text-[#3D3833]">編輯班級資料</h3>
                  <button onClick={() => setEditingClassId(null)} className="text-[#8E877F] hover:text-[#3D3833]">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#8E877F] mb-1">班級名稱</label>
                    <input 
                      value={editClassName} 
                      onChange={e => setEditClassName(e.target.value)}
                      className="w-full bg-[#F9F6F2] border border-[#E9E3DB] px-4 py-2.5 rounded-lg text-[#3D3833] focus:outline-none focus:ring-2 focus:ring-[#88968A] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#8E877F] mb-1">年級 (Form)</label>
                    <select
                      value={editClassForm}
                      onChange={e => setEditClassForm(e.target.value)}
                      className="w-full bg-[#F9F6F2] border border-[#E9E3DB] px-4 py-2.5 rounded-lg text-[#3D3833] focus:outline-none focus:ring-2 focus:ring-[#88968A] text-sm"
                    >
                      {['中一', '中二', '中三', '中四', '中五', '中六'].map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#8E877F] mb-1">班級人數</label>
                    <input 
                      type="number" min="1" max="35"
                      value={editClassSize} 
                      onChange={e => setEditClassSize(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full bg-[#F9F6F2] border border-[#E9E3DB] px-4 py-2.5 rounded-lg text-[#3D3833] focus:outline-none focus:ring-2 focus:ring-[#88968A] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#8E877F] mb-1">教學語言</label>
                    <select
                      value={editClassLanguage}
                      onChange={e => setEditClassLanguage(e.target.value)}
                      className="w-full bg-[#F9F6F2] border border-[#E9E3DB] px-4 py-2.5 rounded-lg text-[#3D3833] focus:outline-none focus:ring-2 focus:ring-[#88968A] text-sm"
                    >
                      <option value="中文">中文</option>
                      <option value="English">English</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-[#8E877F] mb-1">科目</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {['歷史', '中國歷史', 'CES', 'CSD'].map(sub => (
                        <label key={sub} className="flex items-center gap-1.5 text-sm text-[#4A443F] cursor-pointer bg-[#F9F6F2] px-2 py-1.5 rounded-lg border border-[#E9E3DB] hover:border-[#88968A]">
                          <input 
                            type="checkbox" 
                            checked={editClassSubjects.includes(sub)}
                            onChange={() => toggleEditClassSubject(sub)}
                            className="rounded text-[#88968A] focus:ring-[#88968A] border-[#D9CEC1]"
                          />
                          {sub}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => handleEditClass(c.id)} className="bg-[#88968A] text-white px-5 py-2.5 rounded-lg font-medium text-sm transition-all hover:opacity-90">儲存變更</button>
                  <button onClick={() => setEditingClassId(null)} className="bg-[#F1EDE9] text-[#4A443F] px-5 py-2.5 rounded-lg font-medium text-sm transition-all hover:bg-[#E9E3DB]">取消</button>
                </div>
              </div>
            );
          }

          return (
          <div key={c.id} className="bg-white rounded-2xl shadow-sm border border-[#E9E3DB] overflow-hidden hover:shadow-md transition-shadow flex flex-col">
            <div className="bg-[#F9F6F2] border-b border-[#E9E3DB] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold text-[#3D3833] tracking-tight">{c.name}</h3>
                {c.form && <span className="px-2.5 py-1 bg-white border border-[#E9E3DB] rounded-md text-[11px] font-bold text-[#88968A]">{c.form}</span>}
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    setEditingClassId(c.id);
                    setEditClassName(c.name);
                    setEditClassForm(c.form || '中一');
                    setEditClassSize(c.size || '');
                    setEditClassLanguage(c.language || '中文');
                    setEditClassSubjects(c.subjects.map(s => s.name));
                  }} 
                  className="p-2 text-[#8E877F] hover:text-[#88968A] hover:bg-white rounded-lg transition-colors"
                  title="編輯班級"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => setClassToDelete(c.id)}
                  className="p-2 text-[#8E877F] hover:text-red-500 hover:bg-white rounded-lg transition-colors"
                  title="刪除班級"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="p-6 md:p-8 flex-1 space-y-8">
              {c.subjects.map((s, sIdx) => {
                const completedCount = s.syllabus.filter(t => t.completed).length;
                const totalCount = s.syllabus.length;
                const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
                
                const themeColor = sIdx % 2 === 0 ? "bg-[#88968A]" : "bg-[#C59B83]";
                const textColor = sIdx % 2 === 0 ? "text-[#88968A]" : "text-[#C59B83]";

                return (
                  <div key={s.id} className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      {editingSubjectId === s.id ? (
                        <div className="flex items-center gap-2 flex-1 mr-4">
                          <input 
                            value={editSubjectName}
                            onChange={e => setEditSubjectName(e.target.value)}
                            className="flex-1 bg-[#F9F6F2] border border-[#E9E3DB] px-3 py-1.5 rounded-md text-[#3D3833] text-sm focus:outline-none focus:ring-2 focus:ring-[#88968A]"
                            autoFocus
                            onKeyDown={e => e.key === 'Enter' && handleEditSubject(c.id, s.id)}
                          />
                          <button onClick={() => handleEditSubject(c.id, s.id)} className="p-1.5 bg-[#88968A] text-white rounded-md"><Check size={14} /></button>
                          <button onClick={() => setEditingSubjectId(null)} className="p-1.5 bg-[#F1EDE9] text-[#4A443F] rounded-md"><X size={14} /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <h4 className={cn("text-xs font-bold uppercase tracking-widest", textColor)}>{s.name}</h4>
                          <button 
                            onClick={() => {
                              setEditingSubjectId(s.id);
                              setEditSubjectName(s.name);
                            }}
                            className="text-[#D9CEC1] hover:text-[#88968A] transition-colors"
                          >
                            <Edit2 size={12} />
                          </button>
                        </div>
                      )}
                      <span className={cn("text-sm font-bold", textColor)}>{pct}%</span>
                    </div>
                    
                    {/* Mini progress bar */}
                    <div className="h-2 w-full bg-[#F1EDE9] rounded-full overflow-hidden mb-4">
                      <div
                        className={cn("h-full rounded-full transition-all duration-500 ease-out", themeColor)}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="space-y-2">
                      {s.syllabus.map(topic => (
                        <div key={topic.id} className="flex flex-col gap-1 group">
                          <div className="flex items-start gap-2">
                            <button
                              onClick={() => toggleTopic(c.id, s.id, topic.id)}
                              className="flex items-start gap-3 flex-1 text-left p-2.5 rounded-xl hover:bg-[#F9F6F2] transition-colors"
                            >
                              <div className="shrink-0 mt-0.5">
                                {topic.completed ? (
                                  <CheckSquare className={cn("w-5 h-5", textColor)} />
                                ) : (
                                  <Square className="w-5 h-5 text-[#D9CEC1] transition-colors group-hover:text-[#88968A]" />
                                )}
                              </div>
                              <span className={cn(
                                "text-sm font-medium transition-colors mt-0.5",
                                topic.completed ? "text-[#8E877F] line-through" : "text-[#4A443F] group-hover:text-[#3D3833]"
                              )}>
                                {topic.title}
                              </span>
                            </button>
                            <button 
                              onClick={() => {
                                setEditingRemarksTopicId(topic.id);
                                setTempRemarks(topic.remarks || '');
                              }}
                              className="p-2.5 mt-0.5 text-[#D9CEC1] hover:text-[#88968A] hover:bg-[#F9F6F2] rounded-lg opacity-0 group-hover:opacity-100 transition-all shrink-0"
                              title="新增/編輯備註"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => setTopicToDelete({classId: c.id, subjectId: s.id, topicId: topic.id})}
                              className="p-2.5 mt-0.5 text-[#D9CEC1] hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all shrink-0"
                              title="刪除課題"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          
                          {editingRemarksTopicId === topic.id ? (
                            <div className="ml-10 flex items-center gap-2 mb-2">
                              <input 
                                value={tempRemarks}
                                onChange={e => setTempRemarks(e.target.value)}
                                placeholder="輸入備註..."
                                className="flex-1 bg-[#F9F6F2] border border-[#E9E3DB] px-3 py-1.5 rounded-md text-[#3D3833] text-xs focus:outline-none focus:ring-2 focus:ring-[#88968A]"
                                autoFocus
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    updateTopicRemarks(c.id, s.id, topic.id, tempRemarks);
                                    setEditingRemarksTopicId(null);
                                  }
                                }}
                              />
                              <button 
                                onClick={() => {
                                  updateTopicRemarks(c.id, s.id, topic.id, tempRemarks);
                                  setEditingRemarksTopicId(null);
                                }} 
                                className="p-1.5 bg-[#88968A] text-white rounded-md shrink-0"
                              >
                                <Check size={14} />
                              </button>
                              <button 
                                onClick={() => setEditingRemarksTopicId(null)} 
                                className="p-1.5 bg-[#F1EDE9] text-[#4A443F] rounded-md shrink-0"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : topic.remarks ? (
                            <div className="ml-11 mr-4 mb-2 text-xs text-[#8E877F] italic bg-[#F9F6F2] px-3 py-1.5 rounded-md border border-transparent hover:border-[#E9E3DB] transition-colors cursor-text group/remark" onClick={() => { setEditingRemarksTopicId(topic.id); setTempRemarks(topic.remarks!); }}>
                              備註: {topic.remarks}
                              <Edit2 size={10} className="inline ml-2 opacity-0 group-hover/remark:opacity-100" />
                            </div>
                          ) : null}
                        </div>
                      ))}

                      {addingTopicId === s.id ? (
                        <div className="flex items-center gap-2 mt-2 p-2.5">
                          <input 
                            value={newTopicTitle}
                            onChange={e => setNewTopicTitle(e.target.value)}
                            placeholder="輸入課題名稱..."
                            className="flex-1 bg-[#F9F6F2] border border-[#E9E3DB] px-3 py-1.5 rounded-md text-[#3D3833] text-sm focus:outline-none focus:ring-2 focus:ring-[#88968A]"
                            autoFocus
                            onKeyDown={e => e.key === 'Enter' && handleAddTopic(c.id, s.id)}
                          />
                          <button onClick={() => handleAddTopic(c.id, s.id)} className="p-1.5 bg-[#88968A] text-white rounded-md"><Check size={14} /></button>
                          <button onClick={() => setAddingTopicId(null)} className="p-1.5 bg-[#F1EDE9] text-[#4A443F] rounded-md"><X size={14} /></button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setAddingTopicId(s.id)}
                          className="mt-2 text-xs text-[#8E877F] font-bold flex items-center gap-1.5 hover:text-[#4A443F] p-2 transition-colors rounded-lg hover:bg-[#F9F6F2]"
                        >
                          <Plus size={14}/> 新增課題
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {addingSubjectId === c.id ? (
                <div className="mt-8 p-4 bg-[#F9F6F2] rounded-xl border border-[#E9E3DB]">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#8E877F] mb-3">新增科目</p>
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <input 
                      value={newSubjectName}
                      onChange={e => setNewSubjectName(e.target.value)}
                      placeholder="科目名稱 (例如: 中國歷史)"
                      className="w-full sm:flex-1 bg-white border border-[#E9E3DB] px-3 py-2 rounded-md text-[#3D3833] text-sm focus:outline-none focus:ring-2 focus:ring-[#88968A]"
                      autoFocus
                      onKeyDown={e => e.key === 'Enter' && handleAddSubject(c.id)}
                    />
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button onClick={() => handleAddSubject(c.id)} className="flex-1 sm:flex-none px-4 py-2 bg-[#88968A] text-white rounded-md text-sm font-medium">儲存</button>
                      <button onClick={() => setAddingSubjectId(null)} className="flex-1 sm:flex-none px-4 py-2 bg-white text-[#4A443F] border border-[#E9E3DB] rounded-md text-sm font-medium">取消</button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={() => setNewSubjectName('歷史')} className="text-[10px] px-2.5 py-1 bg-white border border-[#E9E3DB] text-[#8E877F] rounded hover:border-[#88968A] hover:text-[#88968A]">歷史</button>
                    <button onClick={() => setNewSubjectName('中國歷史')} className="text-[10px] px-2.5 py-1 bg-white border border-[#E9E3DB] text-[#8E877F] rounded hover:border-[#88968A] hover:text-[#88968A]">中國歷史</button>
                    <button onClick={() => setNewSubjectName('經濟')} className="text-[10px] px-2.5 py-1 bg-white border border-[#E9E3DB] text-[#8E877F] rounded hover:border-[#88968A] hover:text-[#88968A]">經濟</button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => setAddingSubjectId(c.id)}
                  className="mt-6 w-full py-4 border-2 border-dashed border-[#E9E3DB] rounded-xl text-sm text-[#88968A] font-bold flex items-center justify-center gap-2 hover:bg-[#F9F6F2] hover:border-[#D9CEC1] transition-all"
                >
                  <Plus size={16}/> 新增科目
                </button>
              )}
            </div>
          </div>
          );
        })
        )}
      </div>

      <ConfirmModal
        isOpen={classToDelete !== null}
        title="確認刪除班級"
        message="確定要刪除這個班級嗎？這將會刪除該班級下的所有科目和課題，且無法復原。"
        onConfirm={() => {
          if (classToDelete && deleteClass) {
            deleteClass(classToDelete);
          }
        }}
        onCancel={() => setClassToDelete(null)}
        confirmText="刪除"
      />

      <ConfirmModal
        isOpen={topicToDelete !== null}
        title="確認刪除課題"
        message="確定要刪除這個課題嗎？刪除後無法復原。"
        onConfirm={() => {
          if (topicToDelete) {
            deleteTopic(topicToDelete.classId, topicToDelete.subjectId, topicToDelete.topicId);
          }
        }}
        onCancel={() => setTopicToDelete(null)}
        confirmText="刪除"
      />
    </div>
  );
}
