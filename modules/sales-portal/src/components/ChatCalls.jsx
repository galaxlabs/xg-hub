import React, { useState, useEffect, useRef } from 'react';
import { Send, Users, Plus, X, MessageCircle, Smile, Paperclip, File as FileIcon, MoreVertical, Search, ArrowLeft, Eye } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import socket from '../lib/socket';

const IDLE_TIMEOUT = 60000;
const STICKERS = ['😀', '😂', '😍', '👍', '🔥', '🎉', '❤️', '😢', '😎', '🙏', '👏', '💯', '🥳', '😴', '🤔', '😡'];

export default function ChatCalls({ currentUser, userRole }) {
  const [conversations, setConversations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [userStatuses, setUserStatuses] = useState({});
  const [typingUser, setTypingUser] = useState('');
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearch, setGifSearch] = useState('');
  const [gifResults, setGifResults] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [hoveredMessageId, setHoveredMessageId] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState('');
  const [showStarredPanel, setShowStarredPanel] = useState(false);
  const [starredMessages, setStarredMessages] = useState([]);
  const [openMessageMenuId, setOpenMessageMenuId] = useState(null);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [overallSearchQuery, setOverallSearchQuery] = useState('');
  const [unreadCounts, setUnreadCounts] = useState({});
  const [viewMode, setViewMode] = useState('mine');
  const [allConversations, setAllConversations] = useState([]);
  const [readOnlyMode, setReadOnlyMode] = useState(false);

  const typingTimeoutRef = useRef(null);
  const idleTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const empRes = await fetch('/api/employees');
        if (empRes.ok) {
          const empData = await empRes.json();
          setEmployees(empData.filter(e => e.id !== currentUser?.id));
        }
        const convRes = await fetch(`/api/conversations?employeeId=${currentUser?.id}`);
        if (convRes.ok) {
          const convData = await convRes.json();
          setConversations(convData);
        }
      } catch (err) {
        console.error('Error loading chat data:', err);
      }
    };
    if (currentUser?.id) fetchInitial();
  }, [currentUser]);

  const fetchAllConversations = async () => {
    try {
      const res = await fetch('/api/conversations/all/list');
      if (res.ok) {
        const data = await res.json();
        setAllConversations(data);
      }
    } catch (err) {
      console.error('Error loading all conversations:', err);
    }
  };

  useEffect(() => {
    if (viewMode === 'all' && userRole === 'Super Admin') {
      fetchAllConversations();
    }
  }, [viewMode, userRole]);

  useEffect(() => {
    socket.on('all-statuses', (statuses) => setUserStatuses(statuses));
    socket.on('user-status-changed', ({ employeeId, status }) => {
      setUserStatuses(prev => ({ ...prev, [employeeId]: status }));
    });
    const handleNewMessage = (message) => {
      setMessages(prev => [...prev, message]);
      if (message.senderId !== currentUser?.id && message.conversationId !== activeConversation?.id) {
        setUnreadCounts(prev => ({
          ...prev,
          [message.conversationId]: (prev[message.conversationId] || 0) + 1
        }));
      }
    };
    socket.on('new-message', handleNewMessage);
    socket.on('message-updated', (updatedMsg) => {
      setMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
    });
    socket.on('user-typing', (name) => setTypingUser(name));
    socket.on('user-stop-typing', () => setTypingUser(''));

    return () => {
      socket.off('all-statuses');
      socket.off('user-status-changed');
      socket.off('new-message', handleNewMessage);
      socket.off('message-updated');
      socket.off('user-typing');
      socket.off('user-stop-typing');
    };
  }, [activeConversation, currentUser]);

  useEffect(() => {
    const resetIdleTimer = () => {
      if (!currentUser?.id) return;
      socket.emit('set-status', { employeeId: currentUser.id, status: 'active' });
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
      idleTimeoutRef.current = setTimeout(() => {
        socket.emit('set-status', { employeeId: currentUser.id, status: 'inactive' });
      }, IDLE_TIMEOUT);
    };
    resetIdleTimer();
    window.addEventListener('mousemove', resetIdleTimer);
    window.addEventListener('keydown', resetIdleTimer);
    window.addEventListener('click', resetIdleTimer);
    return () => {
      window.removeEventListener('mousemove', resetIdleTimer);
      window.removeEventListener('keydown', resetIdleTimer);
      window.removeEventListener('click', resetIdleTimer);
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    };
  }, [currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const openConversation = async (conversation) => {
    setActiveConversation(conversation);
    setReadOnlyMode(false);
    setUnreadCounts(prev => ({ ...prev, [conversation.id]: 0 }));
    setShowEmojiPicker(false);
    setShowStickers(false);
    setShowChatMenu(false);
    setShowChatSearch(false);
    setChatSearchQuery('');
    socket.emit('join-conversation', conversation.id);
    try {
      const res = await fetch(`/api/conversations/${conversation.id}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  const openConversationReadOnly = async (conversation) => {
    setActiveConversation(conversation);
    setReadOnlyMode(true);
    setShowChatMenu(false);
    setShowChatSearch(false);
    setChatSearchQuery('');
    try {
      const res = await fetch(`/api/conversations/${conversation.id}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  const getAllConversationLabel = (conv) => {
    if (conv.isGroup) return conv.name;
    const names = conv.members?.map(m => m.employee?.name).filter(Boolean);
    return names?.join(' & ') || 'Unknown';
  };

  const openDirectChat = async (employee) => {
    try {
      const res = await fetch('/api/conversations/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId1: currentUser.id, employeeId2: employee.id })
      });
      if (res.ok) {
        const conversation = await res.json();
        if (!conversations.find(c => c.id === conversation.id)) {
          setConversations([conversation, ...conversations]);
        }
        openConversation(conversation);
      }
    } catch (err) {
      console.error('Error opening direct chat:', err);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!messageText.trim() || !activeConversation || readOnlyMode) return;
    socket.emit('send-message', {
      conversationId: activeConversation.id,
      senderId: currentUser.id,
      text: messageText.trim(),
      replyToId: replyingTo?.id || null
    });
    socket.emit('stop-typing', { conversationId: activeConversation.id });
    setMessageText('');
    setShowEmojiPicker(false);
    setReplyingTo(null);
  };

  const handleTyping = (e) => {
    setMessageText(e.target.value);
    if (!activeConversation || readOnlyMode) return;
    socket.emit('typing', { conversationId: activeConversation.id, employeeName: currentUser.name });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop-typing', { conversationId: activeConversation.id });
    }, 1500);
  };

  const handleEmojiClick = (emojiData) => {
    setMessageText(prev => prev + emojiData.emoji);
  };

  const handleStickerClick = (sticker) => {
    if (!activeConversation || readOnlyMode) return;
    socket.emit('send-message', {
      conversationId: activeConversation.id,
      senderId: currentUser.id,
      text: sticker,
      isSticker: true
    });
    setShowStickers(false);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeConversation || readOnlyMode) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/chat-upload', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        socket.emit('send-message', {
          conversationId: activeConversation.id,
          senderId: currentUser.id,
          fileUrl: data.fileUrl,
          fileName: data.fileName,
          mimeType: data.mimeType
        });
      } else {
        alert('Could not upload file. It may be too large (max 100MB) or there is a server issue.');
      }
    } catch (err) {
      console.error('File upload error:', err);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const searchGifs = async (query) => {
    try {
      const apiKey = import.meta.env.VITE_GIPHY_API_KEY;
      const url = query
        ? `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(query)}&limit=20&rating=g`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=20&rating=g`;
      const res = await fetch(url);
      const data = await res.json();
      setGifResults(data.data || []);
    } catch (err) {
      console.error('GIF search error:', err);
    }
  };

  const handleGifSearchChange = (e) => {
    setGifSearch(e.target.value);
    searchGifs(e.target.value);
  };

  const openGifPicker = () => {
    setShowGifPicker(!showGifPicker);
    setShowEmojiPicker(false);
    setShowStickers(false);
    if (!showGifPicker && gifResults.length === 0) searchGifs('');
  };

  const handleGifClick = (gif) => {
    if (!activeConversation || readOnlyMode) return;
    socket.emit('send-message', {
      conversationId: activeConversation.id,
      senderId: currentUser.id,
      fileUrl: gif.images.fixed_height.url,
      fileName: 'GIF',
      mimeType: 'image/gif'
    });
    setShowGifPicker(false);
  };

  const startEditing = (msg) => {
    setEditingMessage(msg);
    setEditText(msg.text || '');
    setOpenMessageMenuId(null);
  };

  const handleEditSave = (e) => {
    e.preventDefault();
    if (!editText.trim() || !editingMessage) return;
    socket.emit('edit-message', {
      messageId: editingMessage.id,
      newText: editText.trim(),
      conversationId: activeConversation.id
    });
    setEditingMessage(null);
    setEditText('');
  };

  const handleDelete = (msg, mode) => {
    const confirmMsg = mode === 'everyone'
      ? 'This message will be deleted for everyone. Confirm?'
      : 'This message will be hidden only for you. Confirm?';
    if (!window.confirm(confirmMsg)) return;
    socket.emit('delete-message', {
      messageId: msg.id,
      conversationId: activeConversation.id,
      mode,
      employeeId: currentUser.id
    });
    setOpenMessageMenuId(null);
  };

  const handleToggleStar = (msg) => {
    socket.emit('toggle-star', { messageId: msg.id, employeeId: currentUser.id });
    setOpenMessageMenuId(null);
  };

  const fetchStarredMessages = async () => {
    try {
      const res = await fetch(`/api/conversations/starred/${currentUser.id}`);
      if (res.ok) {
        const data = await res.json();
        setStarredMessages(data);
      }
    } catch (err) {
      console.error('Error fetching starred messages:', err);
    }
  };

  const openStarredPanel = () => {
    setShowStarredPanel(true);
    fetchStarredMessages();
  };

  const handleDeleteChat = async () => {
    if (!window.confirm('This chat will only be removed from your list. Confirm?')) return;
    try {
      const res = await fetch(`/api/conversations/${activeConversation.id}/hide`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: currentUser.id })
      });
      if (res.ok) {
        setConversations(conversations.filter(c => c.id !== activeConversation.id));
        setActiveConversation(null);
        setShowChatMenu(false);
      }
    } catch (err) {
      console.error('Error deleting chat:', err);
    }
  };

  const toggleMember = (id) => {
    setSelectedMembers(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim() || selectedMembers.length === 0) return;
    try {
      const res = await fetch('/api/conversations/group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: groupName.trim(), memberIds: [...selectedMembers, currentUser.id] })
      });
      if (res.ok) {
        const conversation = await res.json();
        setConversations([conversation, ...conversations]);
        setShowGroupModal(false);
        setGroupName('');
        setSelectedMembers([]);
        openConversation(conversation);
      }
    } catch (err) {
      console.error('Error creating group:', err);
    }
  };

  const getConversationName = (conv) => {
    if (conv.isGroup) return conv.name;
    const other = conv.members?.find(m => m.employeeId !== currentUser?.id);
    return other?.employee?.name || 'Unknown';
  };

  const filteredConversations = conversations.filter(conv =>
    getConversationName(conv).toLowerCase().includes(overallSearchQuery.toLowerCase())
  );

  const filteredEmployeesList = employees.filter(emp =>
    emp.name.toLowerCase().includes(overallSearchQuery.toLowerCase())
  );

  const filteredAllConversations = allConversations.filter(conv =>
    getAllConversationLabel(conv).toLowerCase().includes(overallSearchQuery.toLowerCase())
  );

  const filteredMessages = chatSearchQuery.trim()
    ? messages.filter(msg => msg.text?.toLowerCase().includes(chatSearchQuery.toLowerCase()))
    : messages;

  const visibleMessages = filteredMessages.filter(msg => !msg.deletedForIds?.includes(currentUser?.id));

  const renderMessageContent = (msg) => {
    if (msg.deletedForEveryone) {
      return <span style={{ fontStyle: 'italic', opacity: 0.6 }}>This message was deleted</span>;
    }
    if (msg.isSticker) {
      return <div style={{ fontSize: '42px', lineHeight: 1 }}>{msg.text}</div>;
    }
    if (msg.fileUrl) {
      const isImage = msg.mimeType?.startsWith('image/');
      const isVideo = msg.mimeType?.startsWith('video/');
      const fullUrl = msg.fileUrl.startsWith('http') ? msg.fileUrl : msg.fileUrl;
      if (isImage) {
        return (
          <a href={fullUrl} target="_blank" rel="noopener noreferrer">
            <img src={fullUrl} alt={msg.fileName} style={{ maxWidth: '220px', maxHeight: '220px', borderRadius: '8px', display: 'block' }} />
          </a>
        );
      }
      if (isVideo) {
        return <video src={fullUrl} controls style={{ maxWidth: '260px', borderRadius: '8px' }} />;
      }
      return (
        <a href={fullUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'inherit', textDecoration: 'none' }}>
          <FileIcon size={18} /> {msg.fileName}
        </a>
      );
    }
    return msg.text;
  };

  const isSuperAdmin = userRole === 'Super Admin';

  return (
    <div className="bx-content" style={{ height: '100%', overflow: 'hidden', padding: 0 }}>
      <div style={{ display: 'flex', height: '100%', width: '100%' }}>
        {/* Left sidebar */}
        <div className={`bx-chat-sidebar ${activeConversation ? 'hidden-mobile' : ''}`} style={{ width: '280px', borderRight: '1px solid var(--bx-border)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid var(--bx-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '15px' }}>Chat</h3>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button className="bx-btn" style={{ padding: '6px' }} onClick={openStarredPanel} title="Starred Messages">⭐</button>
              <button className="bx-btn" style={{ padding: '6px' }} onClick={() => setShowGroupModal(true)} title="New Group"><Plus size={16} /></button>
            </div>
          </div>

          {isSuperAdmin && (
            <div style={{ display: 'flex', borderBottom: '1px solid var(--bx-border)' }}>
              <button
                onClick={() => setViewMode('mine')}
                style={{
                  flex: 1, padding: '10px', background: 'transparent', border: 'none', cursor: 'pointer',
                  fontSize: '12px', fontWeight: 600,
                  color: viewMode === 'mine' ? 'var(--bx-accent-blue)' : 'var(--bx-text-muted)',
                  borderBottom: viewMode === 'mine' ? '2px solid var(--bx-accent-blue)' : '2px solid transparent'
                }}
              >
                My Chats
              </button>
              <button
                onClick={() => setViewMode('all')}
                style={{
                  flex: 1, padding: '10px', background: 'transparent', border: 'none', cursor: 'pointer',
                  fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                  color: viewMode === 'all' ? 'var(--bx-accent-blue)' : 'var(--bx-text-muted)',
                  borderBottom: viewMode === 'all' ? '2px solid var(--bx-accent-blue)' : '2px solid transparent'
                }}
              >
                <Eye size={13} /> All Conversations
              </button>
            </div>
          )}

          <div style={{ padding: '10px 10px 0 10px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
              <input
                type="text"
                className="input-field"
                placeholder="Search by name..."
                value={overallSearchQuery}
                onChange={(e) => setOverallSearchQuery(e.target.value)}
                style={{ paddingLeft: '32px' }}
              />
            </div>
          </div>

          {viewMode === 'all' && isSuperAdmin ? (
            <div style={{ padding: '10px' }}>
              <div style={{ fontSize: '11px', color: 'var(--bx-text-muted)', padding: '4px 8px' }}>
                ALL CONVERSATIONS ({filteredAllConversations.length})
              </div>
              {filteredAllConversations.map(conv => (
                <div
                  key={conv.id}
                  onClick={() => openConversationReadOnly(conv)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 8px',
                    cursor: 'pointer', borderRadius: '6px',
                    background: activeConversation?.id === conv.id ? 'rgba(255,255,255,0.05)' : 'transparent'
                  }}
                >
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bx-accent-orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', flexShrink: 0 }}>
                    {conv.isGroup ? <Users size={14} /> : getAllConversationLabel(conv).substring(0, 2).toUpperCase()}
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {getAllConversationLabel(conv)}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--bx-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {conv.messages?.[0]?.text || (conv.messages?.[0]?.fileUrl ? 'Attachment' : 'No messages')}
                    </div>
                  </div>
                </div>
              ))}
              {filteredAllConversations.length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--bx-text-muted)' }}>
                  No conversations found.
                </div>
              )}
            </div>
          ) : (
            <>
              {filteredConversations.length > 0 && (
                <div style={{ padding: '10px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--bx-text-muted)', padding: '4px 8px' }}>CONVERSATIONS</div>
                  {filteredConversations.map(conv => (
                    <div
                      key={conv.id}
                      onClick={() => openConversation(conv)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 8px',
                        cursor: 'pointer', borderRadius: '6px',
                        background: activeConversation?.id === conv.id ? 'rgba(255,255,255,0.05)' : 'transparent'
                      }}
                    >
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bx-accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', flexShrink: 0 }}>
                        {conv.isGroup ? <Users size={14} /> : getConversationName(conv).substring(0, 2).toUpperCase()}
                      </div>
                      <div style={{ overflow: 'hidden', flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: unreadCounts[conv.id] ? 700 : 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {getConversationName(conv)}
                        </div>
                        <div style={{ fontSize: '11px', color: unreadCounts[conv.id] ? 'var(--bx-text-main)' : 'var(--bx-text-muted)', fontWeight: unreadCounts[conv.id] ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {conv.messages?.[0]?.text || (conv.messages?.[0]?.fileUrl ? 'Attachment' : 'No messages')}
                        </div>
                      </div>
                      {unreadCounts[conv.id] > 0 && (
                        <div style={{
                          background: 'var(--bx-accent-green)', color: '#fff', borderRadius: '10px',
                          minWidth: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '11px', fontWeight: 'bold', padding: '0 6px', flexShrink: 0
                        }}>
                          {unreadCounts[conv.id] > 9 ? '9+' : unreadCounts[conv.id]}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {overallSearchQuery.trim() && (
                <div style={{ padding: '10px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--bx-text-muted)', padding: '4px 8px' }}>EMPLOYEES</div>
                  {filteredEmployeesList.map(emp => {
                    const status = userStatuses[emp.id] || 'offline';
                    return (
                      <div
                        key={emp.id}
                        onClick={() => openDirectChat(emp)}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 8px', cursor: 'pointer', borderRadius: '6px' }}
                      >
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bx-accent-orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                            {emp.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div style={{
                            position: 'absolute', bottom: 0, right: 0, width: '10px', height: '10px',
                            borderRadius: '50%', border: '2px solid var(--bx-sidebar-bg)',
                            background: status === 'active' ? '#4caf50' : status === 'inactive' ? '#ff9800' : '#f44336'
                          }} />
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>{emp.name}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Right side */}
        <div className={`bx-chat-main ${activeConversation ? 'active-mobile' : ''}`} style={{ flex: 1, flexDirection: 'column', minWidth: 0 }}>
          {activeConversation ? (
            <>
              <div style={{ padding: '16px', borderBottom: '1px solid var(--bx-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ArrowLeft
                    size={18}
                    className="bx-chat-back-btn"
                    style={{ cursor: 'pointer', display: 'none' }}
                    onClick={() => setActiveConversation(null)}
                  />
                  <div style={{ fontWeight: 600 }}>
                    {readOnlyMode ? getAllConversationLabel(activeConversation) : getConversationName(activeConversation)}
                  </div>
                  {readOnlyMode && (
                    <span style={{ fontSize: '11px', color: 'var(--bx-accent-orange)', display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,152,0,0.1)', padding: '2px 8px', borderRadius: '10px' }}>
                      <Eye size={11} /> Viewing as Super Admin
                    </span>
                  )}
                </div>
                {!readOnlyMode && (
                  <div style={{ display: 'flex', gap: '6px', position: 'relative' }}>
                    <button className="bx-btn" style={{ padding: '6px' }} onClick={() => { setShowChatSearch(!showChatSearch); setChatSearchQuery(''); }} title="Search in chat">
                      <Search size={16} />
                    </button>
                    <button className="bx-btn" style={{ padding: '6px' }} onClick={() => setShowChatMenu(!showChatMenu)} title="More">
                      <MoreVertical size={16} />
                    </button>
                    {showChatMenu && (
                      <div style={{
                        position: 'absolute', right: 0, top: '36px', zIndex: 20,
                        background: '#1a1a1a', border: '1px solid var(--bx-border)', borderRadius: '8px',
                        minWidth: '160px', boxShadow: '0 8px 20px rgba(0,0,0,0.5)', overflow: 'hidden'
                      }}>
                        <div style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '13px', color: 'var(--bx-accent-red)' }} onClick={handleDeleteChat}>
                          Delete Chat
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {showChatSearch && !readOnlyMode && (
                <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--bx-border)' }}>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Search messages in this chat..."
                    value={chatSearchQuery}
                    onChange={(e) => setChatSearchQuery(e.target.value)}
                    autoFocus
                  />
                </div>
              )}

              <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {visibleMessages.map(msg => {
                  const isMine = msg.senderId === currentUser?.id;
                  const isStarred = msg.starredByIds?.includes(currentUser?.id);
                  return (
                    <div
                      key={msg.id}
                      onMouseEnter={() => setHoveredMessageId(msg.id)}
                      onMouseLeave={() => setHoveredMessageId(null)}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: readOnlyMode ? 'flex-start' : (isMine ? 'flex-end' : 'flex-start'), position: 'relative' }}
                    >
                      {(readOnlyMode || (activeConversation.isGroup && !isMine)) && (
                        <span style={{ fontSize: '11px', color: 'var(--bx-text-muted)', marginBottom: '2px' }}>{msg.sender?.name}</span>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexDirection: (!readOnlyMode && isMine) ? 'row-reverse' : 'row', position: 'relative' }}>
                        <div style={{
                          maxWidth: '360px', padding: msg.isSticker ? '4px' : '10px 14px', borderRadius: '12px',
                          background: msg.isSticker ? 'transparent' : (readOnlyMode ? 'rgba(255,255,255,0.06)' : (isMine ? 'var(--bx-accent-blue)' : 'rgba(255,255,255,0.06)')),
                          color: (!readOnlyMode && isMine) ? '#fff' : 'inherit'
                        }}>
                          {msg.replyTo && (
                            <div style={{ borderLeft: '3px solid rgba(255,255,255,0.5)', paddingLeft: '8px', marginBottom: '6px', fontSize: '11px', opacity: 0.85 }}>
                              <div style={{ fontWeight: 600 }}>{msg.replyTo.sender?.name}</div>
                              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {msg.replyTo.text || (msg.replyTo.fileUrl ? 'Attachment' : '')}
                              </div>
                            </div>
                          )}
                          {renderMessageContent(msg)}
                          {msg.isEdited && <span style={{ fontSize: '10px', opacity: 0.6, marginLeft: '6px' }}>(edited)</span>}
                          {isStarred && <span style={{ fontSize: '10px', marginLeft: '6px' }}>⭐</span>}
                        </div>

                        {!readOnlyMode && hoveredMessageId === msg.id && !msg.deletedForEveryone && (
                          <div style={{ position: 'relative' }}>
                            <button
                              type="button"
                              onClick={() => setOpenMessageMenuId(openMessageMenuId === msg.id ? null : msg.id)}
                              className="bx-btn"
                              style={{ padding: '6px' }}
                              title="Options"
                            >
                              <MoreVertical size={14} />
                            </button>
                            {openMessageMenuId === msg.id && (
                              <div style={{
                                position: 'absolute', [isMine ? 'right' : 'left']: 0, top: '32px', zIndex: 20,
                                background: '#1a1a1a', border: '1px solid var(--bx-border)', borderRadius: '8px',
                                minWidth: '170px', boxShadow: '0 8px 20px rgba(0,0,0,0.5)', overflow: 'hidden'
                              }}>
                                <div style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '13px' }}
                                  onClick={() => { setReplyingTo(msg); setOpenMessageMenuId(null); }}>
                                  Reply
                                </div>
                                {isMine && !msg.isSticker && !msg.fileUrl && (
                                  <div style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '13px' }}
                                    onClick={() => startEditing(msg)}>
                                    Edit
                                  </div>
                                )}
                                <div style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '13px' }}
                                  onClick={() => handleToggleStar(msg)}>
                                  {isStarred ? 'Unstar' : 'Star'}
                                </div>
                                <div style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '13px' }}
                                  onClick={() => handleDelete(msg, 'me')}>
                                  Delete for you
                                </div>
                                {isMine && (
                                  <div style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '13px', color: 'var(--bx-accent-red)' }}
                                    onClick={() => handleDelete(msg, 'everyone')}>
                                    Delete for everyone
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <span style={{ fontSize: '10px', color: 'var(--bx-text-muted)', marginTop: '2px' }}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {!readOnlyMode && typingUser && (
                <div className="typing-indicator" style={{ padding: '4px 16px', fontSize: '12px', color: 'var(--bx-accent-blue)', fontStyle: 'italic' }}>
                  {typingUser} is typing...
                </div>
              )}

              {!readOnlyMode && replyingTo && (
                <div style={{ padding: '8px 16px', borderTop: '1px solid var(--bx-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                  <div style={{ borderLeft: '3px solid var(--bx-accent-blue)', paddingLeft: '8px', fontSize: '12px', overflow: 'hidden' }}>
                    <div style={{ fontWeight: 600, color: 'var(--bx-accent-blue)' }}>Replying to {replyingTo.sender?.name}</div>
                    <div style={{ color: 'var(--bx-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {replyingTo.text || (replyingTo.fileUrl ? 'Attachment' : '')}
                    </div>
                  </div>
                  <X size={16} style={{ cursor: 'pointer', flexShrink: 0 }} onClick={() => setReplyingTo(null)} />
                </div>
              )}

              {!readOnlyMode && showStickers && (
                <div style={{ padding: '12px', borderTop: '1px solid var(--bx-border)', display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '6px' }}>
                  {STICKERS.map(s => (
                    <button key={s} type="button" onClick={() => handleStickerClick(s)} style={{ fontSize: '24px', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}>
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {!readOnlyMode && showGifPicker && (
                <div style={{ borderTop: '1px solid var(--bx-border)', padding: '10px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Search GIFs..."
                      value={gifSearch}
                      onChange={handleGifSearchChange}
                      style={{ margin: 0, flex: 1 }}
                    />
                    <button
                      type="button"
                      className="bx-btn"
                      style={{ padding: '10px' }}
                      onClick={() => setShowGifPicker(false)}
                      title="Close"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', maxHeight: '400px', overflowY: 'auto' }}>
                    {gifResults.map(gif => (
                      <img key={gif.id} src={gif.images.fixed_height_small.url} alt={gif.title} onClick={() => handleGifClick(gif)} style={{ width: '100%', borderRadius: '6px', cursor: 'pointer' }} />
                    ))}
                  </div>
                </div>
              )}

              {!readOnlyMode && showEmojiPicker && (
                <div style={{ borderTop: '1px solid var(--bx-border)' }}>
                  <EmojiPicker onEmojiClick={handleEmojiClick} theme="dark" width="100%" height="420px" previewConfig={{ showPreview: false }} searchDisabled={false} />
                </div>
              )}

              {readOnlyMode ? (
                <div style={{ padding: '16px', borderTop: '1px solid var(--bx-border)', textAlign: 'center', fontSize: '12px', color: 'var(--bx-text-muted)' }}>
                  Read-only monitoring view. You cannot reply in this conversation.
                </div>
              ) : (
                <form onSubmit={handleSend} style={{ padding: '16px', borderTop: '1px solid var(--bx-border)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileSelect} accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx" />
                  <button type="button" className="bx-btn" style={{ padding: '10px' }} onClick={() => fileInputRef.current.click()} title="Attach file/photo/video" disabled={uploading}>
                    <Paperclip size={16} />
                  </button>
                  <button type="button" className="bx-btn" style={{ padding: '10px' }} onClick={() => { setShowStickers(!showStickers); setShowEmojiPicker(false); }} title="Stickers">😀</button>
                  <button type="button" className="bx-btn" style={{ padding: '10px', fontSize: '11px', fontWeight: 700 }} onClick={openGifPicker} title="GIF">GIF</button>
                  <button type="button" className="bx-btn" style={{ padding: '10px' }} onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowStickers(false); }} title="Emoji">
                    <Smile size={16} />
                  </button>
                  <input
                    type="text"
                    className="input-field"
                    placeholder={uploading ? 'Uploading...' : 'Type a message...'}
                    value={messageText}
                    onChange={handleTyping}
                    disabled={uploading}
                    style={{ flex: 1 }}
                  />
                  <button type="submit" className="bx-btn bx-btn-primary" style={{ padding: '10px 16px' }}>
                    <Send size={16} />
                  </button>
                </form>
              )}
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--bx-text-muted)' }}>
              <MessageCircle size={48} style={{ opacity: 0.2, marginBottom: '12px' }} />
              <div>Select a conversation to get started</div>
            </div>
          )}
        </div>

        {showGroupModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Users color="var(--bx-accent-blue)" /> New Group</span>
                <X size={20} style={{ cursor: 'pointer' }} onClick={() => setShowGroupModal(false)} />
              </h2>
              <form onSubmit={handleCreateGroup} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Group Name</label>
                  <input required className="input-field" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Members</label>
                  <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--bx-border)', borderRadius: '8px', marginTop: '6px' }}>
                    {employees.map(emp => (
                      <label key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={selectedMembers.includes(emp.id)} onChange={() => toggleMember(emp.id)} />
                        {emp.name}
                      </label>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                  <button type="button" className="bx-btn" onClick={() => setShowGroupModal(false)}>Cancel</button>
                  <button type="submit" className="bx-btn bx-btn-primary">Create Group</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showStarredPanel && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '450px' }}>
              <h2 style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '16px' }}>
                <span>⭐ Starred Messages</span>
                <X size={20} style={{ cursor: 'pointer' }} onClick={() => setShowStarredPanel(false)} />
              </h2>
              <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {starredMessages.map(msg => (
                  <div key={msg.id} style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--bx-border)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--bx-text-muted)', marginBottom: '4px' }}>
                      {msg.sender?.name} · {msg.conversation?.isGroup ? msg.conversation.name : ''}
                    </div>
                    <div style={{ fontSize: '13px' }}>{msg.text || (msg.fileUrl ? 'Attachment' : '')}</div>
                  </div>
                ))}
                {starredMessages.length === 0 && (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--bx-text-muted)', fontSize: '13px' }}>No starred messages.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {editingMessage && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '400px' }}>
              <h2 style={{ marginBottom: '16px', fontSize: '16px' }}>Edit Message</h2>
              <form onSubmit={handleEditSave}>
                <textarea className="input-field" rows="3" value={editText} onChange={(e) => setEditText(e.target.value)} autoFocus />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                  <button type="button" className="bx-btn" onClick={() => setEditingMessage(null)}>Cancel</button>
                  <button type="submit" className="bx-btn bx-btn-primary">Save</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}