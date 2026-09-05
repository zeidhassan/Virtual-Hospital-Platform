import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  getConversations,
  getConversationMessages,
  createConversation,
  sendMessage,
  markConversationAsRead,
  markConversationAsUnread,
  setConversationPinned,
  addConversationParticipants,
  removeConversationParticipant,
  getAvailableContacts,
} from '@/api/messages';
import useFetch from '@/hooks/useFetch';
import { useAuth } from '@/hooks/useAuth';
import Card, { CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import Avatar from '@/components/ui/Avatar';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import AuthedImage from '@/components/ui/AuthedImage';
import { openAuthedFile, fileNameFromPath } from '@/utils/viewFile';
import { MessageSquare, Send, ChevronLeft, X, Search, Plus, Paperclip, FileText, Users, Check, Pin, PinOff, MailOpen, Mail, UserPlus, UserMinus, Info } from 'lucide-react';
import { format, isToday } from 'date-fns';
import clsx from 'clsx';

const POLL_INTERVAL_MS = 8000;

const ROLE_BG = {
  patient: '#4C1D95',
  doctor: '#0F6644',
  admin: '#A33C18',
};

const otherParticipants = (conversation, userId) =>
  (conversation.participants || []).filter((p) => p.user_id !== userId);

const conversationLabel = (conversation, userId) => {
  if (conversation.title) return conversation.title;
  const others = otherParticipants(conversation, userId);
  if (others.length === 0) return 'Conversation';
  return others.map((p) => p.full_name).join(', ');
};

// Shows a distinct grey "people" icon for groups vs a role-colored initials avatar for direct messages,
// so group vs 1:1 conversations are visually unmistakable at a glance.
const ConversationAvatar = ({ conversation, userId, size = 38 }) => {
  if (conversation.is_group) {
    return (
      <div
        className="rounded-full flex items-center justify-center flex-shrink-0 bg-slate-500 text-white"
        style={{ width: size, height: size }}
      >
        <Users size={Math.round(size * 0.45)} />
      </div>
    );
  }
  const others = otherParticipants(conversation, userId);
  return (
    <Avatar
      name={others[0]?.full_name || conversation.title || '?'}
      size={size}
      bg={ROLE_BG[others[0]?.role] || '#57534E'}
    />
  );
};

// Subtitle shown under a conversation's name: member count for groups, role for direct messages.
const conversationSubtitle = (conversation, userId) => {
  if (conversation.is_group) {
    const count = (conversation.participants || []).length;
    return `Group · ${count} member${count === 1 ? '' : 's'}`;
  }
  const others = otherParticipants(conversation, userId);
  return others[0]?.role ? others[0].role.charAt(0).toUpperCase() + others[0].role.slice(1) : '';
};

const formatTimestamp = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return isToday(date) ? format(date, 'HH:mm') : format(date, 'dd MMM');
};

// ── Message thread (right pane) ──────────────────────────────────────────
const ConversationThread = ({ conversation, onBack, onMessageSent, onOpenGroupInfo }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const lastMessageIdRef = useRef(null);

  const loadMessages = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await getConversationMessages(conversation.id);
      setMessages(res.data.data || []);
    } catch {
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [conversation.id]);

  useEffect(() => {
    loadMessages();
    markConversationAsRead(conversation.id).catch(() => {});
    const interval = setInterval(() => loadMessages(false), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [conversation.id, loadMessages]);

  // Only auto-scroll when a genuinely new message shows up — the 8s poll
  // refetches on a timer regardless of whether anything changed, and scrolling
  // on every one of those would yank the view out from under anyone reading
  // older messages.
  useEffect(() => {
    if (messages.length === 0) return;
    const latestId = messages[messages.length - 1].id;
    if (latestId !== lastMessageIdRef.current) {
      lastMessageIdRef.current = latestId;
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
    e.target.value = '';
  };

  const handleSend = async () => {
    if (!text.trim() && !file) return;
    setSending(true);
    try {
      const formData = new FormData();
      if (text.trim()) formData.append('message', text.trim());
      if (file) formData.append('attachment', file);
      await sendMessage(conversation.id, formData);
      setText('');
      setFile(null);
      await loadMessages(false);
      onMessageSent?.();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] border border-slate-200 dark:border-slate-700 rounded-card overflow-hidden bg-surface dark:bg-surface-dark">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-surface-subtle dark:bg-surface-dark-subtle flex-shrink-0">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-surface-warm dark:hover:bg-surface-dark-warm text-text-secondary dark:text-text-dark-secondary transition-colors lg:hidden"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          onClick={() => conversation.is_group && onOpenGroupInfo?.(conversation)}
          disabled={!conversation.is_group}
          className={clsx('flex items-center gap-3 flex-1 min-w-0 text-left', conversation.is_group && 'cursor-pointer group')}
        >
          <ConversationAvatar conversation={conversation} userId={user?.id} size={34} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-text-primary dark:text-text-dark-primary truncate">
                {conversationLabel(conversation, user?.id)}
              </p>
              {conversation.is_group && (
                <Badge variant="brand" className="text-[10px] px-1.5 py-0.5 flex-shrink-0">
                  <Users size={10} className="mr-1" /> Group
                </Badge>
              )}
            </div>
            <p className="text-xs text-text-muted dark:text-text-dark-muted group-hover:text-brand-600 transition-colors">
              {conversationSubtitle(conversation, user?.id)}
              {conversation.is_group && ' · Tap for info'}
            </p>
          </div>
        </button>
        {conversation.is_group && (
          <button
            onClick={() => onOpenGroupInfo?.(conversation)}
            className="p-1.5 rounded-lg hover:bg-surface-warm dark:hover:bg-surface-dark-warm text-text-secondary dark:text-text-dark-secondary transition-colors flex-shrink-0"
            title="Group info"
          >
            <Info size={16} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {loading && (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-text-muted dark:text-text-dark-muted">
              No messages yet. Say hello!
            </p>
          </div>
        )}

        {!loading && messages.map((m) => {
          const isMe = m.sender_id === user?.id;
          return (
            <div key={m.id} className={clsx('flex flex-col', isMe ? 'items-end' : 'items-start')}>
              <div
                className={clsx(
                  'max-w-[85%] rounded-2xl px-3.5 py-2.5',
                  isMe
                    ? 'bg-brand-600 text-white rounded-tr-sm'
                    : 'bg-surface-subtle dark:bg-surface-dark-subtle text-text-primary dark:text-text-dark-primary rounded-tl-sm'
                )}
              >
                {!isMe && (
                  <p className="text-xs font-semibold mb-1 text-brand-600">
                    {m.sender_name}
                  </p>
                )}
                {m.message && (
                  <p className="text-sm whitespace-pre-wrap break-words">{m.message}</p>
                )}
                {m.attachment_url && (
                  m.attachment_type === 'image' ? (
                    <button
                      type="button"
                      onClick={() => openAuthedFile(`/files/messages/${fileNameFromPath(m.attachment_url)}`)}
                      className="block mt-2"
                    >
                      <AuthedImage
                        apiPath={`/files/messages/${fileNameFromPath(m.attachment_url)}`}
                        alt="Attachment"
                        className="max-w-full max-h-56 rounded-lg border border-black/10"
                      />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openAuthedFile(`/files/messages/${fileNameFromPath(m.attachment_url)}`)}
                      className={clsx(
                        'mt-2 flex items-center gap-2 text-sm font-medium underline underline-offset-2',
                        isMe ? 'text-white' : 'text-brand-600'
                      )}
                    >
                      <FileText size={14} /> View attachment
                    </button>
                  )
                )}
                <p className={clsx('text-xs mt-1.5', isMe ? 'text-brand-200' : 'text-text-muted dark:text-text-dark-muted')}>
                  {m.created_at ? format(new Date(m.created_at), 'HH:mm') : ''}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Compose */}
      <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
        {file && (
          <div className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-lg bg-surface-subtle dark:bg-surface-dark-subtle text-xs text-text-secondary dark:text-text-dark-secondary w-fit">
            <Paperclip size={12} /> {file.name}
            <button onClick={() => setFile(null)} className="text-text-muted hover:text-red-600">
              <X size={12} />
            </button>
          </div>
        )}
        <div className="flex gap-2 items-end">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-text-secondary dark:text-text-dark-secondary hover:bg-surface-subtle dark:hover:bg-surface-dark-subtle transition-colors flex-shrink-0"
            title="Attach file"
          >
            <Paperclip size={16} />
          </button>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Type your message… (Enter to send)"
            rows={1}
            className="flex-1 resize-none text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300 max-h-28"
          />
          <button
            onClick={handleSend}
            disabled={(!text.trim() && !file) || sending}
            className="p-2.5 rounded-xl bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Group info modal: view members, add/remove (creator or admin only) ──
const GroupInfoModal = ({ conversation, currentUserId, canManage, onClose, onUpdated }) => {
  const [addingMode, setAddingMode] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  const participants = conversation.participants || [];
  const canRemove = canManage && participants.length > 2;

  const openAddMode = () => {
    setAddingMode(true);
    setSelectedIds([]);
    setLoadingContacts(true);
    getAvailableContacts()
      .then((res) => {
        const existingIds = new Set(participants.map((p) => p.user_id));
        setContacts((res.data.data || []).filter((c) => !existingIds.has(c.id)));
      })
      .catch(() => toast.error('Failed to load contacts'))
      .finally(() => setLoadingContacts(false));
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleAddMembers = async () => {
    if (selectedIds.length === 0) return;
    setSaving(true);
    try {
      await addConversationParticipants(conversation.id, selectedIds);
      toast.success('Members added');
      setAddingMode(false);
      onUpdated();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add members');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (userId) => {
    setRemovingId(userId);
    try {
      await removeConversationParticipant(conversation.id, userId);
      toast.success('Member removed');
      onUpdated();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove member');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={addingMode ? 'Add Members' : (conversation.title || 'Group Info')}
      size="sm"
      footer={addingMode ? (
        <>
          <Button variant="ghost" size="sm" onClick={() => setAddingMode(false)}>Back</Button>
          <Button size="sm" onClick={handleAddMembers} disabled={selectedIds.length === 0 || saving} isLoading={saving}>
            Add{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
          </Button>
        </>
      ) : undefined}
    >
      {!addingMode ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-text-muted dark:text-text-dark-muted uppercase tracking-wider">
              {participants.length} member{participants.length === 1 ? '' : 's'}
            </p>
            {canManage && (
              <button
                onClick={openAddMode}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                <UserPlus size={13} /> Add
              </button>
            )}
          </div>
          <div className="max-h-[50vh] overflow-y-auto -mx-1 px-1 space-y-1">
            {participants.map((p) => (
              <div key={p.user_id} className="w-full flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-surface-subtle dark:hover:bg-surface-dark-subtle">
                <Avatar name={p.full_name} size={32} bg={ROLE_BG[p.role] || '#57534E'} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary dark:text-text-dark-primary truncate">
                    {p.full_name}{p.user_id === currentUserId ? ' (you)' : ''}
                  </p>
                  <p className="text-xs text-text-muted dark:text-text-dark-muted capitalize">{p.role}</p>
                </div>
                {canRemove && (
                  <button
                    onClick={() => handleRemove(p.user_id)}
                    disabled={removingId === p.user_id}
                    title="Remove from group"
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50 flex-shrink-0"
                  >
                    {removingId === p.user_id ? <Spinner size="sm" /> : <UserMinus size={14} />}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="max-h-[55vh] overflow-y-auto -mx-1 px-1">
          {loadingContacts && (
            <div className="flex justify-center py-8"><Spinner /></div>
          )}
          {!loadingContacts && contacts.length === 0 && (
            <p className="text-sm text-text-muted dark:text-text-dark-muted text-center py-8">
              Everyone available is already in this group.
            </p>
          )}
          {!loadingContacts && contacts.map((c) => {
            const checked = selectedIds.includes(c.id);
            return (
              <button
                key={c.id}
                onClick={() => toggleSelect(c.id)}
                className={clsx(
                  'w-full flex items-center gap-3 px-2 py-2.5 rounded-lg transition-colors text-left',
                  checked ? 'bg-brand-50 dark:bg-brand-500/10' : 'hover:bg-surface-subtle dark:hover:bg-surface-dark-subtle'
                )}
              >
                <Avatar name={c.full_name} size={32} bg={ROLE_BG[c.role] || '#57534E'} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary dark:text-text-dark-primary truncate">{c.full_name}</p>
                  <p className="text-xs text-text-muted dark:text-text-dark-muted capitalize">{c.role}</p>
                </div>
                <div className={clsx(
                  'w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0',
                  checked ? 'bg-brand-600 border-brand-600' : 'border-slate-300 dark:border-slate-600'
                )}>
                  {checked && <Check size={12} className="text-white" />}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </Modal>
  );
};

// ── New conversation modal ───────────────────────────────────────────────
// Admins get a Direct/Group toggle since they're the only role allowed to create
// groups (backend enforces this too); patients & doctors only ever see direct mode.
const NewConversationModal = ({ isOpen, onClose, onCreated, isAdmin }) => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('direct');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [groupTitle, setGroupTitle] = useState('');
  const [creatingId, setCreatingId] = useState(null);
  const [creatingGroup, setCreatingGroup] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setMode('direct');
    setSearch('');
    setSelectedIds([]);
    setGroupTitle('');
    getAvailableContacts()
      .then((res) => setContacts(res.data.data || []))
      .catch(() => toast.error('Failed to load contacts'))
      .finally(() => setLoading(false));
  }, [isOpen]);

  const filteredContacts = contacts.filter((c) =>
    c.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handlePick = async (contact) => {
    setCreatingId(contact.id);
    try {
      const res = await createConversation({ participant_ids: [contact.id] });
      onCreated(res.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to start conversation');
    } finally {
      setCreatingId(null);
    }
  };

  const handleCreateGroup = async () => {
    if (selectedIds.length < 2) return;
    setCreatingGroup(true);
    try {
      const res = await createConversation({
        participant_ids: selectedIds,
        title: groupTitle.trim() || undefined,
        is_group: true,
      });
      onCreated(res.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create group');
    } finally {
      setCreatingGroup(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'group' ? 'New Group' : 'New Message'}
      size="sm"
      footer={mode === 'group' ? (
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleCreateGroup} disabled={selectedIds.length < 2 || creatingGroup} isLoading={creatingGroup}>
            <Users size={14} /> Create Group{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
          </Button>
        </>
      ) : undefined}
    >
      {isAdmin && (
        <div className="flex gap-1 p-1 bg-surface-subtle dark:bg-surface-dark-subtle rounded-lg mb-3.5">
          <button
            onClick={() => setMode('direct')}
            className={clsx(
              'flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors',
              mode === 'direct' ? 'bg-white dark:bg-surface-dark shadow-sm text-brand-600' : 'text-text-secondary dark:text-text-dark-secondary'
            )}
          >
            Direct Message
          </button>
          <button
            onClick={() => setMode('group')}
            className={clsx(
              'flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-1',
              mode === 'group' ? 'bg-white dark:bg-surface-dark shadow-sm text-brand-600' : 'text-text-secondary dark:text-text-dark-secondary'
            )}
          >
            <Users size={12} /> Create Group
          </button>
        </div>
      )}

      {mode === 'group' && (
        <input
          type="text"
          placeholder="Group name (optional)"
          value={groupTitle}
          onChange={(e) => setGroupTitle(e.target.value)}
          className="w-full mb-3 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
      )}

      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          placeholder="Search contacts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
      </div>

      {mode === 'group' && (
        <p className="text-xs text-text-muted dark:text-text-dark-muted mb-2">
          Select at least 2 people to include in the group.
        </p>
      )}

      <div className="max-h-[50vh] overflow-y-auto -mx-1 px-1">
        {loading && (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        )}
        {!loading && filteredContacts.length === 0 && (
          <p className="text-sm text-text-muted dark:text-text-dark-muted text-center py-8">
            {contacts.length === 0 ? 'No contacts available to message yet.' : 'No contacts match your search.'}
          </p>
        )}
        {!loading && filteredContacts.map((c) => {
          const checked = selectedIds.includes(c.id);
          return (
            <button
              key={c.id}
              onClick={() => (mode === 'group' ? toggleSelect(c.id) : handlePick(c))}
              disabled={mode === 'direct' && creatingId !== null}
              className={clsx(
                'w-full flex items-center gap-3 px-2 py-2.5 rounded-lg transition-colors text-left disabled:opacity-50',
                mode === 'group' && checked
                  ? 'bg-brand-50 dark:bg-brand-500/10'
                  : 'hover:bg-surface-subtle dark:hover:bg-surface-dark-subtle'
              )}
            >
              <Avatar name={c.full_name} size={32} bg={ROLE_BG[c.role] || '#57534E'} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text-primary dark:text-text-dark-primary truncate">
                  {c.full_name}
                </p>
                <p className="text-xs text-text-muted dark:text-text-dark-muted capitalize">{c.role}</p>
              </div>
              {mode === 'group' ? (
                <div className={clsx(
                  'w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0',
                  checked ? 'bg-brand-600 border-brand-600' : 'border-slate-300 dark:border-slate-600'
                )}>
                  {checked && <Check size={12} className="text-white" />}
                </div>
              ) : (
                creatingId === c.id && <Spinner size="sm" />
              )}
            </button>
          );
        })}
      </div>
    </Modal>
  );
};

const INBOX_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'pinned', label: 'Pinned' },
];

// ── Main page ─────────────────────────────────────────────────────────────
const Messages = () => {
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useFetch(getConversations);
  const conversations = data?.data || [];
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [inboxFilter, setInboxFilter] = useState('all');
  const [groupInfoTarget, setGroupInfoTarget] = useState(null);
  const [rowActionBusy, setRowActionBusy] = useState(null);

  // Poll the conversation list for unread badges / new conversations
  useEffect(() => {
    const interval = setInterval(refetch, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refetch]);

  // Keep the selected conversation's preview in sync once the list refreshes
  useEffect(() => {
    if (!selected) return;
    const updated = conversations.find((c) => c.id === selected.id);
    if (updated) setSelected(updated);
  }, [conversations, selected]);

  // Keep the open group-info modal in sync too (fresh member list after add/remove)
  useEffect(() => {
    if (!groupInfoTarget) return;
    const updated = conversations.find((c) => c.id === groupInfoTarget.id);
    if (updated) setGroupInfoTarget(updated);
  }, [conversations, groupInfoTarget]);

  const filtered = conversations
    .filter((c) => conversationLabel(c, user?.id).toLowerCase().includes(search.toLowerCase()))
    .filter((c) => {
      if (inboxFilter === 'unread') return Number(c.unread_count) > 0;
      if (inboxFilter === 'pinned') return !!c.is_pinned;
      return true;
    });

  const handleCreated = (conversation) => {
    refetch();
    setSelected(conversation);
  };

  const handleTogglePin = async (e, conversation) => {
    e.stopPropagation();
    setRowActionBusy(conversation.id);
    try {
      await setConversationPinned(conversation.id, !conversation.is_pinned);
      refetch();
    } catch {
      toast.error('Failed to update pin');
    } finally {
      setRowActionBusy(null);
    }
  };

  const handleToggleRead = async (e, conversation) => {
    e.stopPropagation();
    setRowActionBusy(conversation.id);
    try {
      const isUnread = Number(conversation.unread_count) > 0;
      if (isUnread) {
        await markConversationAsRead(conversation.id);
      } else {
        await markConversationAsUnread(conversation.id);
      }
      refetch();
    } catch {
      toast.error('Failed to update read status');
    } finally {
      setRowActionBusy(null);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <h1 className="page-title">Messages</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: conversation list */}
        <div className={clsx('lg:col-span-1 space-y-4', selected && 'hidden lg:block')}>
          <Card>
            <CardHeader
              title="Inbox"
              action={
                <Button size="sm" onClick={() => setModalOpen(true)}>
                  <Plus size={14} /> New
                </Button>
              }
            />

            <div className="relative mb-3">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
              />
            </div>

            <div className="flex gap-1.5 mb-4">
              {INBOX_FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setInboxFilter(f.id)}
                  className={clsx(
                    'px-3 py-1.5 rounded-full text-xs font-semibold transition-colors',
                    inboxFilter === f.id
                      ? 'bg-brand-600 text-white'
                      : 'bg-surface-subtle dark:bg-surface-dark-subtle text-text-secondary dark:text-text-dark-secondary hover:bg-surface-warm dark:hover:bg-surface-dark-warm'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {isLoading && <div className="flex justify-center py-12"><Spinner size="lg" /></div>}
            {error && <ErrorState message={error} onRetry={refetch} />}

            {!isLoading && !error && filtered.length === 0 && (
              <EmptyState
                icon={MessageSquare}
                title="No conversations"
                description="Start a new conversation to get things going."
                action={{ label: 'New Message', onClick: () => setModalOpen(true) }}
              />
            )}

            {!isLoading && !error && filtered.length > 0 && (
              <div className="space-y-1.5">
                {filtered.map((c) => {
                  const unread = Number(c.unread_count) || 0;
                  const busy = rowActionBusy === c.id;
                  return (
                    <div
                      key={c.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelected(c)}
                      onKeyDown={(e) => e.key === 'Enter' && setSelected(c)}
                      className={clsx(
                        'group w-full flex items-center gap-3 text-left p-2.5 rounded-lg border transition-colors cursor-pointer',
                        selected?.id === c.id
                          ? 'border-brand-600 bg-brand-50 dark:bg-brand-500/10'
                          : 'border-transparent hover:bg-surface-subtle dark:hover:bg-surface-dark-subtle'
                      )}
                    >
                      <ConversationAvatar conversation={c} userId={user?.id} size={38} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {c.is_pinned && <Pin size={11} className="text-brand-600 flex-shrink-0" fill="currentColor" />}
                            <p className={clsx(
                              'text-sm truncate',
                              unread > 0 ? 'font-bold text-text-primary dark:text-text-dark-primary' : 'font-medium text-text-primary dark:text-text-dark-primary'
                            )}>
                              {conversationLabel(c, user?.id)}
                            </p>
                            {c.is_group && (
                              <Users size={11} className="text-text-muted dark:text-text-dark-muted flex-shrink-0" />
                            )}
                          </div>
                          {/* Fixed-size box so the timestamp/action swap on hover never
                              reflows the row — both layers are always present, just
                              cross-faded via opacity instead of mounted/unmounted. */}
                          <div className="relative w-14 h-6 flex-shrink-0">
                            <span className="absolute inset-0 flex items-center justify-end text-[11px] text-text-muted dark:text-text-dark-muted opacity-100 group-hover:opacity-0 transition-opacity pointer-events-none">
                              {formatTimestamp(c.last_message_at)}
                            </span>
                            <div className="absolute inset-0 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => handleTogglePin(e, c)}
                                disabled={busy}
                                title={c.is_pinned ? 'Unpin' : 'Pin'}
                                className="w-6 h-6 rounded-md flex items-center justify-center text-text-muted hover:text-brand-600 hover:bg-surface-warm dark:hover:bg-surface-dark-warm transition-colors disabled:opacity-50"
                              >
                                {c.is_pinned ? <PinOff size={13} /> : <Pin size={13} />}
                              </button>
                              <button
                                onClick={(e) => handleToggleRead(e, c)}
                                disabled={busy}
                                title={unread > 0 ? 'Mark as read' : 'Mark as unread'}
                                className="w-6 h-6 rounded-md flex items-center justify-center text-text-muted hover:text-brand-600 hover:bg-surface-warm dark:hover:bg-surface-dark-warm transition-colors disabled:opacity-50"
                              >
                                {unread > 0 ? <MailOpen size={13} /> : <Mail size={13} />}
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <p className="text-xs text-text-secondary dark:text-text-dark-secondary truncate">
                            {c.last_message || conversationSubtitle(c, user?.id)}
                          </p>
                          {unread > 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-brand-600 text-white flex-shrink-0">
                              {unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Right: active thread */}
        <div className={clsx('lg:col-span-2', !selected && 'hidden lg:flex lg:items-center lg:justify-center')}>
          {selected ? (
            <ConversationThread
              conversation={selected}
              onBack={() => setSelected(null)}
              onMessageSent={refetch}
              onOpenGroupInfo={setGroupInfoTarget}
            />
          ) : (
            <EmptyState
              icon={MessageSquare}
              title="Select a conversation"
              description="Choose a conversation from the inbox to view messages."
            />
          )}
        </div>
      </div>

      <NewConversationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleCreated}
        isAdmin={user?.role === 'admin'}
      />

      {groupInfoTarget && (
        <GroupInfoModal
          conversation={groupInfoTarget}
          currentUserId={user?.id}
          canManage={user?.role === 'admin' || groupInfoTarget.created_by === user?.id}
          onClose={() => setGroupInfoTarget(null)}
          onUpdated={refetch}
        />
      )}
    </div>
  );
};

export default Messages;
