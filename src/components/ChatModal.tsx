import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../domain/store.tsx';
import { X, Send, MessageSquare, Building2, User } from 'lucide-react';
import { ModalShell } from './ModalShell.tsx';

interface ChatModalProps {
  onClose: () => void;
  initialDonationId?: string;
  initialOtherUserId?: string;
}

export const ChatModal: React.FC<ChatModalProps> = ({
  onClose,
  initialDonationId,
  initialOtherUserId,
}) => {
  const { currentUser, conversations, donations, users, sendMessage } = useStore();
  const [inputText, setInputText] = useState('');
  const threadEndRef = useRef<HTMLDivElement | null>(null);

  // Find user's accessible conversations
  const myConversations = conversations.filter(
    (c) => c.donor_id === currentUser?.id || c.receiver_id === currentUser?.id
  );

  const initialConversation = initialDonationId
    ? myConversations.find((c) => c.donation_id === initialDonationId)
    : undefined;

  const [selectedConvId, setSelectedConvId] = useState<string>(
    initialConversation?.id || myConversations[0]?.id || ''
  );

  // Keep the selected thread in sync if this modal was opened for a listing
  // that already has an existing conversation.
  useEffect(() => {
    if (initialConversation && initialConversation.id !== selectedConvId) {
      setSelectedConvId(initialConversation.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialConversation?.id]);

  const activeConv =
    conversations.find((c) => c.id === selectedConvId) ||
    (initialConversation ? undefined : myConversations[0]);

  const activeDonation = activeConv ? donations.find((d) => d.id === activeConv.donation_id) : null;
  const draftDonation = !activeConv && initialDonationId
    ? donations.find((d) => d.id === initialDonationId) || null
    : null;
  const listing = activeDonation || draftDonation;

  const otherUserId = activeConv
    ? activeConv.donor_id === currentUser?.id
      ? activeConv.receiver_id
      : activeConv.donor_id
    : initialOtherUserId;
  const otherUser = users.find((u) => u.id === otherUserId);
  const canCompose = !!activeConv || !!(initialDonationId && initialOtherUserId);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ block: 'end' });
  }, [activeConv?.messages.length, selectedConvId]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !currentUser || !canCompose) return;

    if (activeConv) {
      sendMessage(activeConv.donation_id, otherUserId || '', inputText);
    } else if (initialDonationId && initialOtherUserId) {
      sendMessage(initialDonationId, initialOtherUserId, inputText);
    }
    setInputText('');
  };

  return (
    <ModalShell
      onClose={onClose}
      labelledBy="chat-title"
      maxWidth="max-w-2xl"
      panelClassName="h-[580px] max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#E8DEC9] flex items-center justify-between bg-[#FAF7F2] shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-8 h-8 rounded-lg bg-[#2D6A4F] text-white flex items-center justify-center shrink-0">
            <MessageSquare className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <h2 id="chat-title" className="font-display font-bold text-base text-[#1E1611]">
              Coordination Messages
            </h2>
            {otherUser ? (
              <p className="text-xs text-[#7E7063] truncate">
                {activeConv ? 'Chatting with ' : 'New conversation with '}
                <strong className="text-[#1E1611]">{otherUser.full_name}</strong>
                {otherUser.organization_name ? ` (${otherUser.organization_name})` : ''}
              </p>
            ) : (
              <p className="text-xs text-[#7E7063]">
                Coordinate pickups privately with the other participant
              </p>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-full hover:bg-[#E8DEC9] text-[#7E7063] shrink-0"
          aria-label="Close chat"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Chat Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversation list sidebar (if multiple) */}
        {myConversations.length > 1 && (
          <div className="w-56 border-r border-[#E8DEC9] bg-[#FAF7F2]/50 p-2 overflow-y-auto hidden sm:block shrink-0">
            <p className="text-[10px] uppercase font-mono tracking-wider text-[#7E7063] px-2 py-1">
              Conversations
            </p>
            {myConversations.map((conv) => {
              const don = donations.find((d) => d.id === conv.donation_id);
              return (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConvId(conv.id)}
                  className={`w-full text-left p-2 rounded-xl text-xs mb-1 transition-colors ${
                    conv.id === activeConv?.id
                      ? 'bg-white shadow-xs font-semibold text-[#1E1611] border border-[#E8DEC9]'
                      : 'text-[#4E4035] hover:bg-white/60'
                  }`}
                >
                  <div className="truncate font-medium">{don?.title || 'Donation'}</div>
                  <div className="text-[10px] text-[#7E7063] truncate">
                    {conv.messages[conv.messages.length - 1]?.text || 'No messages'}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Messages Thread */}
        <div className="flex-1 flex flex-col justify-between bg-white min-w-0">
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {listing && (
              <div className="p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E8DEC9] text-xs text-[#7E7063] mb-4 text-center">
                Listing: <strong className="text-[#1E1611]">{listing.title}</strong> · Status:{' '}
                <span className="font-mono uppercase">{listing.status}</span>
              </div>
            )}

            {activeConv && activeConv.messages.length > 0 ? (
              <>
                {activeConv.messages.map((msg) => {
                  const isMe = msg.sender_id === currentUser?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div className="text-[10px] text-[#7E7063] mb-0.5 px-1 font-medium">
                        {isMe ? 'You' : msg.sender_name}
                      </div>
                      <div
                        className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-xs leading-relaxed ${
                          isMe
                            ? 'bg-[#2D6A4F] text-white rounded-br-xs'
                            : 'bg-[#F3ECE1] text-[#1E1611] rounded-bl-xs'
                        }`}
                      >
                        {msg.text}
                      </div>
                      <span className="text-[9px] text-[#7E7063] mt-0.5 px-1 font-mono">
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  );
                })}
                <div ref={threadEndRef} />
              </>
            ) : canCompose ? (
              <div className="h-full flex flex-col items-center justify-center text-center gap-2 px-6">
                <MessageSquare className="w-8 h-8 text-[#D5C9B5]" />
                <p className="text-xs font-semibold text-[#1E1611]">No messages yet</p>
                <p className="text-xs text-[#7E7063] max-w-xs">
                  Say hello and coordinate the handover. Never share your one-time handover code in chat.
                </p>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center gap-2 px-6">
                <MessageSquare className="w-8 h-8 text-[#D5C9B5]" />
                <p className="text-xs font-semibold text-[#1E1611]">No conversations yet</p>
                <p className="text-xs text-[#7E7063] max-w-xs">
                  Open a listing or an active request and choose “Message” to start a private coordination thread.
                </p>
              </div>
            )}
          </div>

          {/* Input Bar */}
          <form onSubmit={handleSend} className="p-3 border-t border-[#E8DEC9] bg-[#FAF7F2] flex gap-2 shrink-0">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={!canCompose}
              placeholder={
                canCompose
                  ? 'Type a coordination message...'
                  : 'Start a conversation from a listing or request'
              }
              className="flex-1 px-3.5 py-2 rounded-xl border border-[#E8DEC9] bg-white text-xs text-[#1E1611] focus:outline-none focus:ring-1 focus:ring-[#2D6A4F] disabled:bg-[#F3ECE1] disabled:text-[#7E7063] disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={!canCompose || !inputText.trim()}
              className="px-4 py-2 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              Send
            </button>
          </form>
        </div>
      </div>
    </ModalShell>
  );
};
