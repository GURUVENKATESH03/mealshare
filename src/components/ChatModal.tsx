import React, { useState } from 'react';
import { useStore } from '../domain/store.tsx';
import { X, Send, MessageSquare, Building2, User } from 'lucide-react';

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

  // Find user's accessible conversations
  const myConversations = conversations.filter(
    (c) => c.donor_id === currentUser?.id || c.receiver_id === currentUser?.id
  );

  const [selectedConvId, setSelectedConvId] = useState<string>(
    myConversations[0]?.id || ''
  );

  const activeConv = conversations.find((c) => c.id === selectedConvId) || myConversations[0];
  const activeDonation = activeConv ? donations.find((d) => d.id === activeConv.donation_id) : null;
  const otherUserId = activeConv
    ? activeConv.donor_id === currentUser?.id
      ? activeConv.receiver_id
      : activeConv.donor_id
    : initialOtherUserId;
  const otherUser = users.find((u) => u.id === otherUserId);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !currentUser) return;

    if (activeConv) {
      sendMessage(activeConv.donation_id, otherUserId || '', inputText);
    } else if (initialDonationId && initialOtherUserId) {
      sendMessage(initialDonationId, initialOtherUserId, inputText);
    }
    setInputText('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="chat-title"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-3xl border border-[#E8DEC9] shadow-2xl h-[580px] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E8DEC9] flex items-center justify-between bg-[#FAF7F2]">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#2D6A4F] text-white flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </span>
            <div>
              <h2 id="chat-title" className="font-display font-bold text-base text-[#1E1611]">
                Coordination Messages
              </h2>
              {otherUser && (
                <p className="text-xs text-[#7E7063]">
                  Chatting with <strong className="text-[#1E1611]">{otherUser.full_name}</strong>
                  {otherUser.organization_name ? ` (${otherUser.organization_name})` : ''}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#E8DEC9] text-[#7E7063]"
            aria-label="Close chat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Conversation list sidebar (if multiple) */}
          {myConversations.length > 1 && (
            <div className="w-56 border-r border-[#E8DEC9] bg-[#FAF7F2]/50 p-2 overflow-y-auto hidden sm:block">
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
          <div className="flex-1 flex flex-col justify-between bg-white">
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {activeDonation && (
                <div className="p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E8DEC9] text-xs text-[#7E7063] mb-4 text-center">
                  Listing: <strong className="text-[#1E1611]">{activeDonation.title}</strong> · Status:{' '}
                  <span className="font-mono uppercase">{activeDonation.status}</span>
                </div>
              )}

              {activeConv && activeConv.messages.length > 0 ? (
                activeConv.messages.map((msg) => {
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
                })
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-[#7E7063]">
                  No messages yet. Say hello to coordinate the handover!
                </div>
              )}
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSend} className="p-3 border-t border-[#E8DEC9] bg-[#FAF7F2] flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type a coordination message..."
                className="flex-1 px-3.5 py-2 rounded-xl border border-[#E8DEC9] bg-white text-xs text-[#1E1611] focus:outline-none focus:ring-1 focus:ring-[#2D6A4F]"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="px-4 py-2 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-semibold disabled:opacity-50 transition-colors flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
