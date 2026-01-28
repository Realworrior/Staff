import { useState, useRef, useEffect } from 'react';
import { Book, Bot, Send, Plus, Trash, FileText, User } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../context/AuthContext';
import { useKnowledge } from '../context/KnowledgeContext';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    text: string;
    timestamp: Date;
}

export const KnowledgeBase = () => {
    const { user } = useAuth();
    const { articles, addArticle, deleteArticle, searchArticles } = useKnowledge();

    // Chat State
    const [messages, setMessages] = useState<Message[]>([
        { id: '0', role: 'assistant', text: 'Jambo! I am FalmeBot. Ask me about policies, greetings, or bet issues.', timestamp: new Date() }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Admin State
    const [isAddingMode, setIsAddingMode] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');
    const [newTags, setNewTags] = useState('');

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async () => {
        if (!inputValue.trim()) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            text: inputValue,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsTyping(true);

        // Simulate AI Processing
        setTimeout(() => {
            const response = searchArticles(userMsg.text);
            const aiText = response || "I'm sorry, I couldn't find a specific answer in my database. Please ask an Admin to update the Knowledge Base.";

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                text: aiText,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiMsg]);
            setIsTyping(false);
        }, 800);
    };

    const handleSaveArticle = () => {
        if (!newTitle || !newContent) return;

        addArticle({
            title: newTitle,
            content: newContent,
            tags: newTags.split(',').map(t => t.trim()).filter(Boolean)
        });

        setNewTitle('');
        setNewContent('');
        setNewTags('');
        setIsAddingMode(false);
    };

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col md:flex-row gap-6 max-w-[1600px] mx-auto">

            {/* Left Panel: Library (Visible to all, Editable by Admin) */}
            <div className="w-full md:w-1/3 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                    <div className="flex items-center gap-2">
                        <Book className="text-indigo-600" size={20} />
                        <h2 className="font-bold text-gray-800">Knowledge Library</h2>
                    </div>
                    {user?.role === 'admin' && (
                        <button
                            onClick={() => setIsAddingMode(!isAddingMode)}
                            className="p-2 hover:bg-gray-200 rounded-lg text-indigo-600 transition-colors"
                            title="Add New Article"
                        >
                            <Plus size={20} />
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {/* Admin Add Form */}
                    {isAddingMode && (
                        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 space-y-3 mb-4 animate-in fade-in slide-in-from-top-4">
                            <h3 className="font-semibold text-indigo-900 text-sm">Add Knowledge Artifact</h3>
                            <input
                                type="text"
                                placeholder="Topic Title (e.g. Failed Deposit)"
                                className="w-full px-3 py-2 rounded-lg border border-indigo-200 text-sm"
                                value={newTitle}
                                onChange={e => setNewTitle(e.target.value)}
                            />
                            <textarea
                                placeholder="Response Script / Content..."
                                className="w-full px-3 py-2 rounded-lg border border-indigo-200 text-sm min-h-[100px]"
                                value={newContent}
                                onChange={e => setNewContent(e.target.value)}
                            />
                            <input
                                type="text"
                                placeholder="Tags (comma separated) e.g. mpesa, failed"
                                className="w-full px-3 py-2 rounded-lg border border-indigo-200 text-sm"
                                value={newTags}
                                onChange={e => setNewTags(e.target.value)}
                            />
                            <div className="flex gap-2 justify-end">
                                <button onClick={() => setIsAddingMode(false)} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
                                <button onClick={handleSaveArticle} className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg">Save Article</button>
                            </div>
                        </div>
                    )}

                    {/* Article List */}
                    {articles.map(doc => (
                        <div key={doc.id} className="group p-4 rounded-xl border border-gray-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all cursor-pointer">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3">
                                    <div className="mt-1 text-indigo-400">
                                        <FileText size={16} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 text-sm">{doc.title}</h3>
                                        <p className="text-xs text-gray-500 line-clamp-2 mt-1">{doc.content}</p>
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {doc.tags.slice(0, 3).map(tag => (
                                                <span key={tag} className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] uppercase tracking-wide">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                {user?.role === 'admin' && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); deleteArticle(doc.id); }}
                                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-opacity"
                                    >
                                        <Trash size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Panel: AI Chat */}
            <div className="w-full md:w-2/3 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                            <Bot size={20} />
                        </div>
                        <div>
                            <h2 className="font-bold text-gray-800">FalmeBot AI Support</h2>
                            <p className="text-xs text-green-600 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Online
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
                    {messages.map(msg => (
                        <div key={msg.id} className={clsx(
                            "flex gap-4 max-w-[85%]",
                            msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                        )}>
                            <div className={clsx(
                                "w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm border",
                                msg.role === 'user' ? "bg-indigo-600 text-white border-transparent" : "bg-white text-indigo-600 border-gray-200"
                            )}>
                                {msg.role === 'user' ? <User size={16} /> : <Bot size={18} />}
                            </div>

                            <div className={clsx(
                                "p-4 rounded-2xl shadow-sm text-sm leading-relaxed whitespace-pre-wrap",
                                msg.role === 'user'
                                    ? "bg-indigo-600 text-white rounded-tr-none"
                                    : "bg-white text-gray-800 border border-gray-100 rounded-tl-none"
                            )}>
                                {msg.text}
                            </div>
                        </div>
                    ))}

                    {isTyping && (
                        <div className="flex gap-4 max-w-[85%]">
                            <div className="w-8 h-8 rounded-full bg-white text-indigo-600 border border-gray-200 flex items-center justify-center shrink-0 shadow-sm">
                                <Bot size={18} />
                            </div>
                            <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm">
                                <div className="flex gap-1">
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="p-4 border-t border-gray-100 bg-white">
                    <div className="relative">
                        <input
                            type="text"
                            className="w-full pl-4 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                            placeholder="Type a question (e.g., 'pending betslip' or 'habari')..."
                            value={inputValue}
                            onChange={e => setInputValue(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={!inputValue.trim() || isTyping}
                            className="absolute right-2 top-2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            <Send size={18} />
                        </button>
                    </div>
                    <p className="text-xs text-center text-gray-400 mt-2">
                        System searches Knowledge Base for matches. Ask Admin to update topics if answer is missing.
                    </p>
                </div>
            </div>
        </div>
    );
};
