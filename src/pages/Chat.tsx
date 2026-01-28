import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    Hash,
    Send,
    AtSign,
    Smile,
    Search,
    Info,
    User,
    Settings,
    ChevronDown,
    Plus,
    Circle,
    Mic,
    X,
    FileText,
    Loader2,
    Lock
} from 'lucide-react';
import { clsx } from 'clsx';
import { io, Socket } from 'socket.io-client';
import { chatAPI, usersAPI } from '../services/api';
import { format, isToday, isYesterday } from 'date-fns';
import EmojiPicker, { Theme as EmojiTheme } from 'emoji-picker-react';
import { useTheme } from '../context/ThemeContext';

interface Message {
    id: number;
    channel_id: number;
    user_id: number;
    user_name: string;
    user_avatar: string;
    content: string;
    file_url?: string;
    file_name?: string;
    file_type?: string;
    created_at: string;
    reactions: { emoji: string, user_id: number }[];
}

interface Channel {
    id: number;
    name: string;
    description: string;
    type: 'public' | 'private' | 'dm';
    target_user_name?: string;
    target_user_avatar?: string;
    target_user_id?: number;
}

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001';

export const Chat = () => {
    const { user } = useAuth();
    const { theme } = useTheme();
    const [channels, setChannels] = useState<Channel[]>([]);
    const [dmChannels, setDmChannels] = useState<Channel[]>([]);
    const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [onlineUserIds, setOnlineUserIds] = useState<number[]>([]);
    const [isTyping, setIsTyping] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showCreateChannel, setShowCreateChannel] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Form for new channel
    const [newChannelName, setNewChannelName] = useState('');
    const [newChannelDesc, setNewChannelDesc] = useState('');
    const [newChannelType, setNewChannelType] = useState('public');

    const socketRef = useRef<Socket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchChannels();
        fetchDMs();
        fetchUsers();

        socketRef.current = io(SOCKET_URL);

        if (user) {
            socketRef.current.emit('set_status', { userId: user.id });
        }

        socketRef.current.on('status_update', (statuses: any[]) => {
            setOnlineUserIds(statuses.map(s => parseInt(s[0])));
        });

        socketRef.current.on('new_message', (message: Message) => {
            if (activeChannel?.id === message.channel_id) {
                setMessages(prev => [...prev, message]);
                scrollToBottom();
            }
        });

        socketRef.current.on('user_typing', (data: any) => {
            if (activeChannel?.id === data.channelId) {
                setIsTyping(data.userName);
                setTimeout(() => setIsTyping(null), 3000);
            }
        });

        socketRef.current.on('reaction_update', (data: any) => {
            setMessages(prev => prev.map(msg => {
                if (msg.id === data.messageId) {
                    const reactions = [...msg.reactions];
                    if (data.action === 'added') {
                        reactions.push({ emoji: data.emoji, user_id: data.userId });
                    } else {
                        const idx = reactions.findIndex(r => r.emoji === data.emoji && r.user_id === data.userId);
                        if (idx > -1) reactions.splice(idx, 1);
                    }
                    return { ...msg, reactions };
                }
                return msg;
            }));
        });

        return () => {
            socketRef.current?.disconnect();
        };
    }, [activeChannel, user]);

    useEffect(() => {
        if (activeChannel) {
            fetchMessages(activeChannel.id);
            socketRef.current?.emit('join_channel', activeChannel.id);
        }
    }, [activeChannel]);

    const fetchChannels = async () => {
        try {
            const response = await chatAPI.getChannels();
            setChannels(response.data);
            if (response.data.length > 0 && !activeChannel) {
                setActiveChannel(response.data[0]);
            } else if (response.data.length === 0) {
                setLoading(false);
            }
        } catch (err) {
            console.error('Failed to fetch channels:', err);
            setLoading(false);
        }
    };

    const fetchDMs = async () => {
        try {
            const response = await chatAPI.getDMs();
            setDmChannels(response.data);
        } catch (err) {
            console.error('Failed to fetch DMs:', err);
        }
    };

    const fetchMessages = async (channelId: number) => {
        setLoading(true);
        try {
            const response = await chatAPI.getMessages(channelId);
            setMessages(response.data);
            setTimeout(scrollToBottom, 100);
        } catch (err) {
            console.error('Failed to fetch messages:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await usersAPI.getAll();
            setAllUsers(response.data);
        } catch (err) {
            console.error('Failed to fetch users:', err);
        }
    };

    const handleSendMessage = async (e?: React.FormEvent, content?: string, fileData?: any) => {
        e?.preventDefault();
        const text = content || newMessage;
        if (!text.trim() && !fileData && !fileData?.url) return;
        if (!activeChannel || !user) return;

        try {
            const response = await chatAPI.sendMessage({
                channelId: activeChannel.id,
                content: text.trim(),
                ...fileData
            });

            socketRef.current?.emit('send_message', response.data);
            setNewMessage('');
            setShowEmojiPicker(false);
        } catch (err) {
            console.error('Failed to send message:', err);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await chatAPI.uploadFile(formData);
            await handleSendMessage(undefined, '', {
                file_url: response.data.url,
                file_name: response.data.name,
                file_type: response.data.type
            });
        } catch (err) {
            alert('File upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleReaction = async (messageId: number, emoji: string) => {
        try {
            const response = await chatAPI.toggleReaction({ messageId, emoji });
            socketRef.current?.emit('toggle_reaction', {
                ...response.data,
                channelId: activeChannel?.id
            });
        } catch (err) {
            console.error('Reaction error:', err);
        }
    };

    const handleStartDM = async (targetUserId: number) => {
        try {
            const response = await chatAPI.startDM(targetUserId);
            const channel = response.data;
            // Check if already in dmChannels list
            if (!dmChannels.find(c => c.id === channel.id)) {
                await fetchDMs();
            }
            setActiveChannel(channel);
        } catch (err) {
            console.error('DM error:', err);
        }
    };

    const handleCreateChannel = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await chatAPI.createChannel({
                name: newChannelName,
                description: newChannelDesc,
                type: newChannelType
            });
            setChannels(prev => [...prev, response.data]);
            setActiveChannel(response.data);
            setShowCreateChannel(false);
            setNewChannelName('');
            setNewChannelDesc('');
        } catch (err) {
            alert('Channel creation failed');
        }
    };

    const handleTyping = (text: string) => {
        setNewMessage(text);
        if (!socketRef.current || !activeChannel || !user) return;

        socketRef.current.emit('typing', {
            channelId: activeChannel.id,
            userName: user.name
        });
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const formatDateHeader = (dateStr: string) => {
        const date = new Date(dateStr);
        if (isToday(date)) return 'Today';
        if (isYesterday(date)) return 'Yesterday';
        return format(date, 'EEEE, MMMM do');
    };

    const getGroupedReactions = (reactions: { emoji: string, user_id: number }[]) => {
        const groups: { [emoji: string]: number[] } = {};
        reactions.forEach(r => {
            if (!groups[r.emoji]) groups[r.emoji] = [];
            groups[r.emoji].push(r.user_id);
        });
        return groups;
    };

    return (
        <div className="flex h-[calc(100vh-140px)] bg-white dark:bg-[rgb(var(--bg-secondary))] rounded-2xl shadow-sm border border-gray-200 dark:border-[rgb(var(--border-color))] overflow-hidden">
            {/* Left Rail */}
            <div className="w-16 bg-[#3F0E40] flex flex-col items-center py-4 gap-4 flex-shrink-0">
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center text-white hover:bg-white/20 transition-colors cursor-pointer ring-2 ring-white/50">
                    <Hash size={24} />
                </div>
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center text-white/70 hover:bg-white/20 transition-colors cursor-pointer">
                    <User size={24} />
                </div>
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center text-white/70 hover:bg-white/20 transition-colors cursor-pointer">
                    <AtSign size={24} />
                </div>
                <div className="mt-auto w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center text-white/70 hover:bg-white/20 transition-colors cursor-pointer">
                    <Settings size={22} />
                </div>
            </div>

            {/* Sidebar */}
            <div className="w-64 bg-[#522653] text-white/70 flex flex-col flex-shrink-0">
                <div className="p-4 border-b border-white/10 flex items-center justify-between group cursor-pointer hover:bg-black/10">
                    <h2 className="font-bold text-white flex items-center gap-1">
                        Falmebet Workspace <ChevronDown size={14} />
                    </h2>
                </div>

                <div className="flex-1 overflow-y-auto py-4 space-y-6 scrollbar-hide">
                    {/* Channels Section */}
                    <div className="px-2 space-y-1">
                        <div className="px-2 pb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                            <span>Channels</span>
                            <Plus
                                size={16}
                                className="cursor-pointer hover:text-white"
                                onClick={() => setShowCreateChannel(true)}
                            />
                        </div>
                        {channels.map(channel => (
                            <div
                                key={channel.id}
                                onClick={() => setActiveChannel(channel)}
                                className={clsx(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer transition-colors text-sm",
                                    activeChannel?.id === channel.id ? "bg-[#1164A3] text-white font-bold" : "hover:bg-black/20 hover:text-white"
                                )}
                            >
                                {channel.type === 'private' ? <Lock size={14} className="opacity-50" /> : <Hash size={16} className="opacity-50" />}
                                <span className="truncate">{channel.name}</span>
                            </div>
                        ))}
                    </div>

                    {/* Direct Messages Section */}
                    <div className="px-2 space-y-1">
                        <div className="px-2 pb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                            <span>Direct Messages</span>
                        </div>
                        {/* Start DM Search / Existing DMs */}
                        {dmChannels.map(dm => (
                            <div
                                key={dm.id}
                                onClick={() => setActiveChannel(dm)}
                                className={clsx(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer transition-colors text-sm",
                                    activeChannel?.id === dm.id ? "bg-[#1164A3] text-white font-bold" : "hover:bg-black/20 hover:text-white"
                                )}
                            >
                                <div className="relative">
                                    <div className="w-5 h-5 rounded overflow-hidden">
                                        <img src={dm.target_user_avatar} alt={dm.target_user_name} className="w-full h-full object-cover" />
                                    </div>
                                    <div className={clsx(
                                        "absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#522653]",
                                        onlineUserIds.includes(dm.target_user_id!) ? "bg-green-500" : "bg-gray-400"
                                    )}></div>
                                </div>
                                <span className="truncate">{dm.target_user_name}</span>
                            </div>
                        ))}

                        {/* User List for starting new DMs */}
                        <div className="mt-4 pt-4 border-t border-white/5 opacity-50 px-2 text-[10px] font-bold uppercase tracking-widest">Team Members</div>
                        {allUsers.filter(u => u.id !== user?.id).map(u => (
                            <div
                                key={u.id}
                                onClick={() => handleStartDM(u.id)}
                                className="flex items-center gap-2 px-3 py-1 rounded-md cursor-pointer transition-colors text-xs hover:bg-black/20 hover:text-white"
                            >
                                <Circle size={8} className={onlineUserIds.includes(u.id) ? "text-green-500" : "text-gray-500"} fill="currentColor" />
                                <span className="truncate">{u.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[rgb(var(--bg-primary))]">
                {/* Header */}
                <div className="h-14 border-b border-gray-200 dark:border-[rgb(var(--border-color))] flex items-center justify-between px-4 flex-shrink-0">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <h3 className="font-bold text-gray-900 dark:text-[rgb(var(--text-primary))] truncate flex items-center gap-1">
                            {activeChannel?.type === 'dm' ? (
                                <img src={activeChannel.target_user_avatar} className="w-5 h-5 rounded translate-y-0.5 mr-1" alt="" />
                            ) : (
                                activeChannel?.type === 'private' ? <Lock size={16} /> : <Hash size={18} />
                            )}
                            {activeChannel?.type === 'dm' ? activeChannel.target_user_name : activeChannel?.name}
                        </h3>
                        {activeChannel?.description && (
                            <>
                                <div className="h-4 w-px bg-gray-200 dark:bg-[rgb(var(--border-color))] mx-2"></div>
                                <p className="text-xs text-gray-500 dark:text-[rgb(var(--text-tertiary))] truncate">{activeChannel.description}</p>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-4 text-gray-500 dark:text-[rgb(var(--text-tertiary))]">
                        <Search size={18} className="cursor-pointer hover:text-gray-900" />
                        <Info size={19} className="cursor-pointer hover:text-gray-900" />
                    </div>
                </div>

                {/* Messages Feed */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-1">
                    {loading ? (
                        <div className="h-full flex items-center justify-center">
                            <Loader2 className="animate-spin text-[#1164A3]" size={32} />
                        </div>
                    ) : (
                        messages.map((msg, idx) => {
                            const prevMsg = messages[idx - 1];
                            const showHeader = !prevMsg || formatDateHeader(prevMsg.created_at) !== formatDateHeader(msg.created_at);
                            const showUser = showHeader || prevMsg.user_id !== msg.user_id;

                            const reactionGroups = getGroupedReactions(msg.reactions);

                            return (
                                <div key={msg.id}>
                                    {showHeader && (
                                        <div className="flex items-center gap-4 my-6">
                                            <div className="h-px bg-gray-200 dark:bg-[rgb(var(--border-color))] flex-1" />
                                            <span className="text-xs font-bold text-gray-500 dark:text-[rgb(var(--text-tertiary))] px-4 bg-white dark:bg-[rgb(var(--bg-primary))] rounded-full py-1 border dark:border-[rgb(var(--border-color))]">
                                                {formatDateHeader(msg.created_at)}
                                            </span>
                                            <div className="h-px bg-gray-200 dark:bg-[rgb(var(--border-color))] flex-1" />
                                        </div>
                                    )}
                                    <div className={clsx("flex gap-3 group px-4 py-1 -mx-4 hover:bg-gray-50 dark:hover:bg-white/5 relative", showUser ? "mt-4" : "mt-0")}>
                                        <div className="w-10 flex-shrink-0">
                                            {showUser ? (
                                                <div className="w-10 h-10 rounded-lg overflow-hidden mt-1 shadow-sm">
                                                    <img src={msg.user_avatar} alt={msg.user_name} className="w-full h-full object-cover" />
                                                </div>
                                            ) : (
                                                <div className="text-[10px] text-gray-400 dark:text-[rgb(var(--text-tertiary))] opacity-0 group-hover:opacity-100 text-center transition-opacity py-2 font-mono">
                                                    {format(new Date(msg.created_at), 'HH:mm')}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            {showUser && (
                                                <div className="flex items-baseline gap-2 mb-0.5">
                                                    <span className="font-black text-gray-900 dark:text-[rgb(var(--text-primary))] hover:underline cursor-pointer">{msg.user_name}</span>
                                                    <span className="text-[10px] text-gray-400 dark:text-[rgb(var(--text-tertiary))]">{format(new Date(msg.created_at), 'K:mm a')}</span>
                                                </div>
                                            )}

                                            {/* Text Content */}
                                            {msg.content && <p className="text-gray-800 dark:text-[rgb(var(--text-secondary))] leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>}

                                            {/* File Content */}
                                            {msg.file_url && (
                                                <div className="mt-3 max-w-sm rounded-xl overflow-hidden border dark:border-[rgb(var(--border-color))] bg-gray-50 dark:bg-black/20 p-2 group/file">
                                                    {msg.file_type?.startsWith('image/') ? (
                                                        <img
                                                            src={`${SOCKET_URL}${msg.file_url}`}
                                                            alt={msg.file_name}
                                                            className="max-h-60 rounded-lg object-contain cursor-zoom-in hover:opacity-90 transition-opacity bg-white dark:bg-black/40"
                                                        />
                                                    ) : (
                                                        <div className="flex items-center gap-3 p-2">
                                                            <div className="p-2 bg-white dark:bg-white/10 rounded-lg text-indigo-500 font-bold">
                                                                <FileText size={20} />
                                                            </div>
                                                            <div className="flex-1 truncate">
                                                                <p className="text-sm font-bold truncate dark:text-[rgb(var(--text-primary))]">{msg.file_name}</p>
                                                                <p className="text-[10px] uppercase text-gray-400 font-bold">{msg.file_type?.split('/')[1] || 'FILE'}</p>
                                                            </div>
                                                            <a
                                                                href={`${SOCKET_URL}${msg.file_url}`}
                                                                download={msg.file_name}
                                                                className="p-2 hover:bg-white dark:hover:bg-white/10 rounded-lg text-gray-400 hover:text-[#1164A3] transition-all"
                                                            >
                                                                <Send size={16} className="rotate-90" />
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Reactions Display */}
                                            {Object.keys(reactionGroups).length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 mt-2">
                                                    {Object.entries(reactionGroups).map(([emoji, userIds]) => {
                                                        const isOwn = userIds.includes(parseInt(user?.id!));
                                                        return (
                                                            <button
                                                                key={emoji}
                                                                onClick={() => handleReaction(msg.id, emoji)}
                                                                className={clsx(
                                                                    "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold transition-all border",
                                                                    isOwn
                                                                        ? "bg-[#1164A3]/10 border-[#1164A3] text-[#1164A3]"
                                                                        : "bg-gray-50 border-gray-200 dark:bg-white/5 dark:border-[rgb(var(--border-color))] text-gray-600 dark:text-[rgb(var(--text-tertiary))] hover:border-gray-400"
                                                                )}
                                                            >
                                                                <span>{emoji}</span>
                                                                <span className="text-[10px]">{userIds.length}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        {/* Hover Actions */}
                                        <div className="absolute right-4 -top-4 bg-white dark:bg-[rgb(var(--bg-secondary))] border dark:border-[rgb(var(--border-color))] rounded-lg shadow-xl opacity-0 group-hover:opacity-100 flex items-center p-1 transition-opacity z-10">
                                            {['👍', '🔥', '✅', '❤️'].map(emo => (
                                                <button
                                                    key={emo}
                                                    onClick={() => handleReaction(msg.id, emo)}
                                                    className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors"
                                                >
                                                    {emo}
                                                </button>
                                            ))}
                                            <div className="w-px h-4 bg-gray-200 dark:bg-[rgb(var(--border-color))] mx-1"></div>
                                            <button className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded"><Smile size={16} /></button>
                                            <button className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded"><AtSign size={16} /></button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Message Input Area */}
                <div className="px-4 pb-4 flex-shrink-0 relative">
                    {/* Typing Indicator */}
                    <div className="h-6 flex items-center px-1">
                        {isTyping && (
                            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 animate-pulse">
                                <div className="flex gap-1">
                                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                                </div>
                                <span>{isTyping} is typing...</span>
                            </div>
                        )}
                    </div>

                    <form
                        onSubmit={(e) => handleSendMessage(e)}
                        className="bg-white dark:bg-[rgb(var(--bg-secondary))] border-2 border-gray-200 dark:border-[rgb(var(--border-color))] rounded-xl overflow-hidden focus-within:border-[#1164A3] transition-colors shadow-sm"
                    >
                        {/* Formatting Bar */}
                        <div className="bg-gray-50/50 dark:bg-black/5 border-b border-gray-100 dark:border-[rgb(var(--border-color))] flex items-center gap-1 px-2 py-1.5">
                            {['B', 'I', 'S', '<>', 'List', 'Code'].map(tool => (
                                <button key={tool} type="button" className="px-2 py-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded text-xs font-black text-gray-600 dark:text-[rgb(var(--text-tertiary))] transition-colors">{tool}</button>
                            ))}
                        </div>

                        <textarea
                            value={newMessage}
                            onChange={e => handleTyping(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage(e);
                                }
                            }}
                            placeholder={`Message ${activeChannel?.type === 'dm' ? activeChannel.target_user_name : '#' + (activeChannel?.name || 'channel')}`}
                            className="w-full p-4 bg-transparent outline-none resize-none text-gray-900 dark:text-[rgb(var(--text-primary))] placeholder-gray-400 dark:placeholder-white/20"
                            rows={2}
                        />

                        {/* Input Actions */}
                        <div className="flex items-center justify-between p-2 pt-0">
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-gray-500 transition-all hover:scale-110"
                                >
                                    <Plus size={20} />
                                </button>
                                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                                <div className="w-px h-6 bg-gray-200 dark:bg-[rgb(var(--border-color))] mx-1"></div>
                                <button type="button" className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-gray-500"><Mic size={20} /></button>
                                <button
                                    type="button"
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    className={clsx("p-2 rounded-lg transition-all", showEmojiPicker ? "bg-[#1164A3]/10 text-[#1164A3]" : "text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10")}
                                >
                                    <Smile size={20} />
                                </button>
                                <button type="button" className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-gray-500"><AtSign size={20} /></button>
                            </div>

                            <div className="flex items-center gap-2">
                                {uploading && <Loader2 className="animate-spin text-gray-400" size={20} />}
                                <button
                                    type="submit"
                                    disabled={(!newMessage.trim() && !uploading) || uploading}
                                    className={clsx(
                                        "px-4 py-2 rounded-lg font-black text-sm transition-all flex items-center gap-2 shadow-sm",
                                        newMessage.trim() && !uploading
                                            ? "bg-[#007a5a] text-white hover:bg-[#005a44] scale-105 active:scale-95"
                                            : "bg-gray-100 dark:bg-white/5 text-gray-400 pointer-events-none"
                                    )}
                                >
                                    <span>Send</span>
                                    <Send size={16} />
                                </button>
                            </div>
                        </div>
                    </form>

                    {/* Emoji Picker Popover */}
                    {showEmojiPicker && (
                        <div className="absolute bottom-24 left-4 z-50 animate-in fade-in slide-in-from-bottom-2">
                            <EmojiPicker
                                theme={theme === 'dark' ? EmojiTheme.DARK : EmojiTheme.LIGHT}
                                onEmojiClick={(data) => {
                                    setNewMessage(prev => prev + data.emoji);
                                    // setShowEmojiPicker(false);
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Create Channel Modal */}
            {showCreateChannel && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[rgb(var(--bg-secondary))] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border dark:border-[rgb(var(--border-color))]">
                        <div className="px-6 py-4 border-b dark:border-[rgb(var(--border-color))] flex items-center justify-between bg-[#3F0E40] text-white">
                            <h2 className="text-xl font-black">Create a Channel</h2>
                            <button onClick={() => setShowCreateChannel(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleCreateChannel} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-black uppercase text-gray-500 dark:text-[rgb(var(--text-tertiary))] mb-2">Channel Name</label>
                                <div className="relative">
                                    <Hash size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        value={newChannelName}
                                        onChange={e => setNewChannelName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                                        placeholder="e.g. project-updates"
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-white/5 border dark:border-[rgb(var(--border-color))] rounded-xl outline-none focus:ring-2 focus:ring-[#1164A3] transition-all font-bold"
                                        required
                                    />
                                </div>
                                <p className="mt-2 text-[10px] text-gray-400 font-bold uppercase tracking-widest">Names must be lowercase and have no spaces.</p>
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase text-gray-500 dark:text-[rgb(var(--text-tertiary))] mb-2">Description <span className="text-[10px] normal-case opacity-50">(optional)</span></label>
                                <textarea
                                    value={newChannelDesc}
                                    onChange={e => setNewChannelDesc(e.target.value)}
                                    placeholder="What's this channel about?"
                                    className="w-full p-4 bg-gray-50 dark:bg-white/5 border dark:border-[rgb(var(--border-color))] rounded-xl outline-none focus:ring-2 focus:ring-[#1164A3] transition-all font-bold min-h-[100px] resize-none"
                                />
                            </div>
                            <div className="flex gap-4 p-1 bg-gray-50 dark:bg-white/5 rounded-xl border dark:border-[rgb(var(--border-color))]">
                                <button
                                    type="button"
                                    onClick={() => setNewChannelType('public')}
                                    className={clsx(
                                        "flex-1 py-3 rounded-lg text-sm font-black transition-all",
                                        newChannelType === 'public' ? "bg-white dark:bg-white/10 shadow-sm text-[#1164A3]" : "text-gray-400"
                                    )}
                                >
                                    Public
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setNewChannelType('private')}
                                    className={clsx(
                                        "flex-1 py-3 rounded-lg text-sm font-black transition-all",
                                        newChannelType === 'private' ? "bg-[#3F0E40] text-white shadow-sm" : "text-gray-400"
                                    )}
                                >
                                    Private
                                </button>
                            </div>
                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={!newChannelName}
                                    className="w-full py-4 bg-[#007a5a] hover:bg-[#005a44] disabled:bg-gray-100 dark:disabled:bg-white/5 disabled:text-gray-400 text-white font-black text-lg rounded-2xl shadow-xl transition-all active:scale-[0.98]"
                                >
                                    Create Channel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
