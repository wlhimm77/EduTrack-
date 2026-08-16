import { useState } from 'react';
import { SyllabusTemplate, TemplateTopic } from '../types';
import { Edit2, Plus, Trash2, BookOpen, Check, X } from 'lucide-react';
import { cn } from '../utils';
import { ConfirmModal } from './ConfirmModal';

interface Props {
  templates: SyllabusTemplate[];
  addTemplate: (form: string, subject: string, language: string) => void;
  deleteTemplate: (templateId: string) => void;
  addTemplateTopic: (templateId: string, title: string) => void;
  deleteTemplateTopic: (templateId: string, topicId: string) => void;
  editTemplateTopic: (templateId: string, topicId: string, newTitle: string) => void;
}

export function TemplatesView({ templates, addTemplate, deleteTemplate, addTemplateTopic, deleteTemplateTopic, editTemplateTopic }: Props) {
  const [addingTemplate, setAddingTemplate] = useState(false);
  const [newTemplateForm, setNewTemplateForm] = useState('中一');
  const [newTemplateSubject, setNewTemplateSubject] = useState('');
  const [newTemplateLanguage, setNewTemplateLanguage] = useState('中文');
  
  const [addingTopicToId, setAddingTopicToId] = useState<string | null>(null);
  const [newTopicTitle, setNewTopicTitle] = useState('');

  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editTopicTitle, setEditTopicTitle] = useState('');
  
  const [activeLanguageTab, setActiveLanguageTab] = useState('中文');
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const [topicToDelete, setTopicToDelete] = useState<{templateId: string, topicId: string} | null>(null);

  const handleAddTemplate = () => {
    if (newTemplateForm && newTemplateSubject.trim()) {
      addTemplate(newTemplateForm, newTemplateSubject.trim(), newTemplateLanguage);
      setNewTemplateSubject('');
      setNewTemplateLanguage('中文');
      setAddingTemplate(false);
    }
  };

  const handleAddTopic = (templateId: string) => {
    if (newTopicTitle.trim()) {
      addTemplateTopic(templateId, newTopicTitle.trim());
      setNewTopicTitle('');
      setAddingTopicToId(null);
    }
  };

  const forms = ['中一', '中二', '中三', '中四', '中五', '中六'];
  const suggestedSubjects = ['歷史', '中國歷史', 'CES', 'CSD'];

  const filteredTemplates = templates.filter(t => (t.language || '中文') === activeLanguageTab);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-4 md:mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-[#3D3833]">預設進度管理</h2>
          <p className="text-sm md:text-base text-[#8E877F] mt-1">管理各年級與科目的預設課題，新增班級時將自動套用。</p>
        </div>
        <button 
          onClick={() => setAddingTemplate(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#88968A] text-white rounded-full hover:opacity-90 transition-all font-medium text-sm shadow-sm hover:shadow-md"
        >
          <Plus className="w-4 h-4" />
          新增科目預設
        </button>
      </header>

      <div className="flex gap-2 border-b border-[#E9E3DB] mb-6">
        <button
          onClick={() => setActiveLanguageTab('中文')}
          className={cn(
            "px-6 py-3 font-medium text-sm transition-all relative",
            activeLanguageTab === '中文' ? "text-[#3D3833]" : "text-[#8E877F] hover:text-[#3D3833]"
          )}
        >
          中文授課
          {activeLanguageTab === '中文' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#88968A]"></div>
          )}
        </button>
        <button
          onClick={() => setActiveLanguageTab('English')}
          className={cn(
            "px-6 py-3 font-medium text-sm transition-all relative",
            activeLanguageTab === 'English' ? "text-[#3D3833]" : "text-[#8E877F] hover:text-[#3D3833]"
          )}
        >
          English MOI
          {activeLanguageTab === 'English' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#88968A]"></div>
          )}
        </button>
      </div>

      {addingTemplate && (
        <div className="bg-white p-6 rounded-xl border border-[#E9E3DB] mb-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-[#3D3833]">新增科目預設</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#8E877F] mb-1">年級 (Form)</label>
              <select
                value={newTemplateForm}
                onChange={e => setNewTemplateForm(e.target.value)}
                className="w-full bg-[#F9F6F2] border border-[#E9E3DB] px-4 py-2.5 rounded-lg text-[#3D3833] focus:outline-none focus:ring-2 focus:ring-[#88968A] text-sm"
              >
                {forms.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#8E877F] mb-1">教學語言</label>
              <select
                value={newTemplateLanguage}
                onChange={e => setNewTemplateLanguage(e.target.value)}
                className="w-full bg-[#F9F6F2] border border-[#E9E3DB] px-4 py-2.5 rounded-lg text-[#3D3833] focus:outline-none focus:ring-2 focus:ring-[#88968A] text-sm"
              >
                <option value="中文">中文</option>
                <option value="English">English</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#8E877F] mb-1">科目名稱</label>
              <div className="space-y-2">
                <input 
                  value={newTemplateSubject} 
                  onChange={e => setNewTemplateSubject(e.target.value)}
                  placeholder="例如: 歷史"
                  className="w-full bg-[#F9F6F2] border border-[#E9E3DB] px-4 py-2.5 rounded-lg text-[#3D3833] focus:outline-none focus:ring-2 focus:ring-[#88968A] text-sm"
                />
                <div className="flex gap-2">
                  {suggestedSubjects.map(sub => (
                    <button
                      key={sub}
                      onClick={() => setNewTemplateSubject(sub)}
                      className="px-2 py-1 bg-[#F9F6F2] border border-[#E9E3DB] hover:border-[#88968A] rounded text-xs text-[#8E877F] transition-colors"
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2 w-full pt-2">
            <button onClick={handleAddTemplate} className="bg-[#88968A] text-white px-5 py-2.5 rounded-lg font-medium text-sm transition-all hover:opacity-90">新增</button>
            <button onClick={() => setAddingTemplate(false)} className="bg-[#F1EDE9] text-[#4A443F] px-5 py-2.5 rounded-lg font-medium text-sm transition-all hover:bg-[#E9E3DB]">取消</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
        {forms.map(form => {
          const formTemplates = filteredTemplates.filter(t => t.form === form);
          if (formTemplates.length === 0) return null;

          return (
            <div key={form} className="bg-white rounded-3xl border border-[#E9E3DB] overflow-hidden shadow-sm">
              <div className="bg-[#F9F6F2] p-5 md:p-6 border-b border-[#E9E3DB]">
                <h3 className="text-lg font-bold text-[#3D3833] flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#88968A]" />
                  {form} 預設進度
                </h3>
              </div>
              <div className="p-5 md:p-6 space-y-8">
                {formTemplates.map(template => (
                  <div key={template.id} className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-[#E9E3DB]">
                      <h4 className="font-bold text-[#3D3833] text-sm bg-[#F1EDE9] px-3 py-1 rounded-full">{template.subject}</h4>
                      <button 
                        onClick={() => setTemplateToDelete(template.id)}
                        className="text-[#D9CEC1] hover:text-red-500 transition-colors p-1"
                        title="刪除科目預設"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="space-y-2">
                      {template.topics.map(topic => (
                        <div key={topic.id} className="flex items-start gap-2 group">
                          {editingTopicId === topic.id ? (
                            <div className="flex items-center gap-2 flex-1 mb-1">
                              <input 
                                value={editTopicTitle}
                                onChange={e => setEditTopicTitle(e.target.value)}
                                className="flex-1 bg-[#F9F6F2] border border-[#E9E3DB] px-3 py-1.5 rounded-md text-[#3D3833] text-sm focus:outline-none focus:ring-2 focus:ring-[#88968A]"
                                autoFocus
                                onKeyDown={e => {
                                  if (e.key === 'Enter' && editTopicTitle.trim()) {
                                    editTemplateTopic(template.id, topic.id, editTopicTitle.trim());
                                    setEditingTopicId(null);
                                  }
                                }}
                              />
                              <button 
                                onClick={() => {
                                  if (editTopicTitle.trim()) {
                                    editTemplateTopic(template.id, topic.id, editTopicTitle.trim());
                                    setEditingTopicId(null);
                                  }
                                }} 
                                className="p-1.5 bg-[#88968A] text-white rounded-md shrink-0"
                              >
                                <Check size={14} />
                              </button>
                              <button 
                                onClick={() => setEditingTopicId(null)} 
                                className="p-1.5 bg-[#F1EDE9] text-[#4A443F] rounded-md shrink-0"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex-1 p-2.5 rounded-xl hover:bg-[#F9F6F2] transition-colors border border-transparent group-hover:border-[#E9E3DB]">
                                <span className="text-sm font-medium text-[#4A443F]">{topic.title}</span>
                              </div>
                              <button 
                                onClick={() => {
                                  setEditingTopicId(topic.id);
                                  setEditTopicTitle(topic.title);
                                }}
                                className="p-2.5 mt-0.5 text-[#D9CEC1] hover:text-[#88968A] hover:bg-[#F9F6F2] rounded-lg opacity-0 group-hover:opacity-100 transition-all shrink-0"
                                title="編輯課題"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button 
                                onClick={() => setTopicToDelete({ templateId: template.id, topicId: topic.id })}
                                className="p-2.5 mt-0.5 text-[#D9CEC1] hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all shrink-0"
                                title="刪除課題"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      ))}

                      {addingTopicToId === template.id ? (
                        <div className="flex items-center gap-2 p-2">
                          <input 
                            value={newTopicTitle}
                            onChange={e => setNewTopicTitle(e.target.value)}
                            placeholder="輸入新課題名稱..."
                            className="flex-1 bg-[#F9F6F2] border border-[#E9E3DB] px-3 py-1.5 rounded-md text-[#3D3833] text-sm focus:outline-none focus:ring-2 focus:ring-[#88968A]"
                            autoFocus
                            onKeyDown={e => e.key === 'Enter' && handleAddTopic(template.id)}
                          />
                          <button onClick={() => handleAddTopic(template.id)} className="p-1.5 bg-[#88968A] text-white rounded-md shrink-0">
                            <Check size={14} />
                          </button>
                          <button onClick={() => setAddingTopicToId(null)} className="p-1.5 bg-[#F1EDE9] text-[#4A443F] rounded-md shrink-0">
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAddingTopicToId(template.id)}
                          className="flex items-center gap-2 w-full p-2.5 text-sm font-medium text-[#8E877F] hover:bg-[#F9F6F2] rounded-xl transition-colors border border-dashed border-transparent hover:border-[#E9E3DB]"
                        >
                          <Plus size={16} />
                          新增課題
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmModal
        isOpen={templateToDelete !== null}
        title="刪除預設"
        message="確定要刪除這個預設科目嗎？將會刪除其包含的所有預設課題，且無法復原。"
        onConfirm={() => {
          if (templateToDelete) {
            deleteTemplate(templateToDelete);
          }
        }}
        onCancel={() => setTemplateToDelete(null)}
        confirmText="刪除"
      />

      <ConfirmModal
        isOpen={topicToDelete !== null}
        title="刪除預設課題"
        message="確定要刪除這個預設課題嗎？無法復原。"
        onConfirm={() => {
          if (topicToDelete) {
            deleteTemplateTopic(topicToDelete.templateId, topicToDelete.topicId);
          }
        }}
        onCancel={() => setTopicToDelete(null)}
        confirmText="刪除"
      />
    </div>
  );
}
