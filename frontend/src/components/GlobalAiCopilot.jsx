import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, X, Sparkles, CheckCircle2, Volume2, VolumeX, FileText, ArrowRight, ShieldCheck } from 'lucide-react';

// Play realistic UI sound chimes using Web Audio API
const playSound = (type = 'send') => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'send') {
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === 'receive') {
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    }
  } catch (e) {
    // Audio Context not allowed or muted
  }
};

function formatAiMessage(text) {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    const parts = line.split(/(\*\*.*?\*\*)/g);
    const formattedLine = parts.map((part, pIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={pIdx} style={{ color: '#ffffff' }}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });

    return (
      <div key={idx} style={{ marginBottom: line.trim() === '' ? '0.3rem' : '0.15rem' }}>
        {formattedLine}
      </div>
    );
  });
}

export default function GlobalAiCopilot({ token, activeTab, setActiveTab, triggerRefresh }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState(null);
  
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: '👋 Hello! I am **FinBot**, your Intelligent Accounting & Billing Assistant.\n\nI can answer accounting questions and interactively draft & generate invoices!\n\nTry commands:\n• "**Create invoice for Hooli Tech for ₹75000**"\n• "**Log expense of ₹15000 for AWS**"\n• "**Who owes me money?**"\n• "**What is the difference between AR and AP?**"',
      followUps: ['Create invoice for Hooli', 'Log AWS expense', 'Who owes me money?', 'AR vs AP']
    }
  ]);

  const [promptInput, setPromptInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStatusText, setLoadingStatusText] = useState('FinBot is querying ledger...');
  const chatBottomRef = useRef(null);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, loading]);

  const speakText = (text, idx) => {
    if ('speechSynthesis' in window) {
      if (speakingIdx === idx) {
        window.speechSynthesis.cancel();
        setSpeakingIdx(null);
        return;
      }

      window.speechSynthesis.cancel();
      const cleanText = text.replace(/\*\*/g, '').replace(/•/g, '').replace(/⚡|👋|📋|💳|📌|📈|🏛️|📚|🔍/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onend = () => setSpeakingIdx(null);

      setSpeakingIdx(idx);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSendPrompt = async (customPrompt = null) => {
    const textToSend = customPrompt || promptInput;
    if (!textToSend.trim()) return;

    if (!isMuted) playSound('send');

    const userMessage = { sender: 'user', text: textToSend };
    setMessages(prev => [...prev, userMessage]);
    if (!customPrompt) setPromptInput('');
    setLoading(true);

    const statusPhrases = [
      'Auditing Chart of Accounts...',
      'Computing 18% GST tax liability...',
      'Verifying double-entry ledger balance...',
      'Formatting FinBot action payload...'
    ];
    let phraseIdx = 0;
    const interval = setInterval(() => {
      setLoadingStatusText(statusPhrases[phraseIdx % statusPhrases.length]);
      phraseIdx++;
    }, 400);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prompt: textToSend })
      });
      const data = await res.json();
      clearInterval(interval);

      if (!isMuted) playSound('receive');

      if (data && data.reply) {
        const isDraft = data.reply.includes('Would you like me to generate this invoice now?');
        let followUps = ['Create invoice for Hooli', 'Log expense', 'Who owes me money?'];
        
        if (textToSend.toLowerCase().includes('ar') || textToSend.toLowerCase().includes('receivable')) {
          followUps = ['Who owes me money?', 'Show ledger', 'Create invoice for Hooli'];
        } else if (textToSend.toLowerCase().includes('expense')) {
          followUps = ['Show expense audit', 'Log AWS expense', 'Financial summary'];
        } else if (isDraft) {
          followUps = ['Yes, generate it now', 'Take me to Invoices'];
        }

        setMessages(prev => [...prev, {
          sender: 'ai',
          text: data.reply,
          isDraft,
          followUps
        }]);

        if (data.executedAction && triggerRefresh) {
          triggerRefresh();
        }

        if (data.navigateTab && setActiveTab) {
          setTimeout(() => {
            setActiveTab(data.navigateTab);
          }, 600);
        }
      } else {
        setMessages(prev => [...prev, {
          sender: 'ai',
          text: '👋 Hello! I am **FinBot**, your Accounting & Billing Assistant.\n\nHow can I help you today?\n\n• Say *"Create invoice for Hooli Tech for ₹75000"*\n• Say *"Log expense of ₹15000 for AWS"*\n• Ask *"Who owes me money?"*'
        }]);
      }
    } catch (err) {
      clearInterval(interval);
      console.error(err);
      setMessages(prev => [...prev, {
        sender: 'ai',
        text: '👋 Hello! I am **FinBot**, your Accounting & Billing Assistant.\n\nHow can I help you today?\n\n• Say *"Create invoice for Hooli Tech for ₹75000"*\n• Say *"Log expense of ₹15000 for AWS"*\n• Ask *"Who owes me money?"*'
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 3000 }}>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-purple) 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: '9999px',
            padding: '0.85rem 1.35rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: 'pointer',
            boxShadow: '0 12px 30px rgba(13, 148, 136, 0.45)',
            transition: 'all 0.25s ease-in-out'
          }}
          className="ai-float-btn"
        >
          <Sparkles size={20} className="pulse-icon" />
          <span>FinBot CFO Assistant</span>
        </button>
      )}

      {/* Floating Chat Modal Window */}
      {isOpen && (
        <div
          style={{
            width: '420px',
            height: '570px',
            background: '#0a0f1d',
            border: '1px solid var(--accent)',
            borderRadius: '18px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.85)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            color: '#fff',
            backdropFilter: 'blur(16px)'
          }}
        >
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #0a0f1d 0%, #1e1b4b 100%)', padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ background: 'rgba(13, 148, 136, 0.2)', padding: '0.4rem', borderRadius: '8px', border: '1px solid var(--accent)' }}>
                <Bot size={22} style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <strong style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  FinBot CFO <ShieldCheck size={14} style={{ color: 'var(--success)' }} />
                </strong>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Real-Time Ledger Action Engine</div>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={() => setIsMuted(!isMuted)}
                title={isMuted ? 'Unmute Audio Chimes' : 'Mute Audio Chimes'}
                style={{ background: 'none', border: 'none', color: isMuted ? '#64748b' : 'var(--accent)', cursor: 'pointer' }}
              >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.85rem' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  background: msg.sender === 'user' ? 'linear-gradient(135deg, var(--accent) 0%, #0d9488 100%)' : 'rgba(255,255,255,0.06)',
                  border: msg.sender === 'user' ? 'none' : '1px solid rgba(255,255,255,0.08)',
                  color: '#fff',
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  maxWidth: '90%',
                  lineHeight: '1.45',
                  boxShadow: msg.sender === 'user' ? '0 4px 15px rgba(13, 148, 136, 0.3)' : 'none'
                }}>
                  {formatAiMessage(msg.text)}

                  {/* Interactive Invoice Draft Card */}
                  {msg.isDraft && (
                    <div style={{ marginTop: '0.75rem', background: 'rgba(13, 148, 136, 0.12)', border: '1px solid var(--accent)', borderRadius: '10px', padding: '0.75rem' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 700, marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <FileText size={14} /> Interactive Draft Summary Voucher
                      </div>
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', background: 'var(--success)', borderColor: 'var(--success)', fontWeight: 700 }}
                        onClick={() => handleSendPrompt('Yes, generate it now')}
                      >
                        <CheckCircle2 size={15} /> Confirm & Post Invoice Now
                      </button>
                    </div>
                  )}

                  {/* Speak Text TTS Button for AI messages */}
                  {msg.sender === 'ai' && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.4rem' }}>
                      <button
                        onClick={() => speakText(msg.text, i)}
                        style={{ background: 'none', border: 'none', color: speakingIdx === i ? 'var(--accent)' : '#64748b', fontSize: '0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                      >
                        <Volume2 size={12} /> {speakingIdx === i ? 'Speaking...' : 'Listen'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Suggested Follow-up Action Pills */}
                {msg.sender === 'ai' && msg.followUps && (
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.4rem', maxWidth: '90%' }}>
                    {msg.followUps.map((pill, pIdx) => (
                      <button
                        key={pIdx}
                        onClick={() => handleSendPrompt(pill)}
                        style={{
                          background: 'rgba(139, 92, 246, 0.12)',
                          border: '1px solid rgba(139, 92, 246, 0.3)',
                          color: '#c4b5fd',
                          borderRadius: '9999px',
                          padding: '0.2rem 0.55rem',
                          fontSize: '0.72rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                      >
                        <span>{pill}</span>
                        <ArrowRight size={10} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Animated Typing Indicator */}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.6rem 0.9rem', borderRadius: '10px', width: 'fit-content' }}>
                <Bot size={16} style={{ color: 'var(--accent)' }} className="spin-slow" />
                <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>{loadingStatusText}</span>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Quick Action Chips */}
          <div style={{ padding: '0.4rem 0.75rem', background: '#060911', display: 'flex', gap: '0.4rem', overflowX: 'auto', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <button className="btn btn-secondary btn-sm" style={{ fontSize: '0.7rem', padding: '0.2rem 0.45rem', whiteSpace: 'nowrap' }} onClick={() => handleSendPrompt('Create invoice for Hooli for ₹50000')}>
              + Bill Hooli ₹50k
            </button>
            <button className="btn btn-secondary btn-sm" style={{ fontSize: '0.7rem', padding: '0.2rem 0.45rem', whiteSpace: 'nowrap' }} onClick={() => handleSendPrompt('Log expense of ₹15000 for AWS')}>
              + AWS ₹15k
            </button>
            <button className="btn btn-secondary btn-sm" style={{ fontSize: '0.7rem', padding: '0.2rem 0.45rem', whiteSpace: 'nowrap' }} onClick={() => handleSendPrompt('Who owes me money?')}>
              🔍 Debtors
            </button>
            <button className="btn btn-secondary btn-sm" style={{ fontSize: '0.7rem', padding: '0.2rem 0.45rem', whiteSpace: 'nowrap' }} onClick={() => handleSendPrompt('What is AR vs AP?')}>
              📚 AR vs AP
            </button>
          </div>

          {/* Input Bar */}
          <div style={{ padding: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '0.5rem', background: '#0a0f1d' }}>
            <input
              type="text"
              placeholder="Ask FinBot or command invoice..."
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendPrompt()}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '8px',
                color: '#fff',
                padding: '0.55rem 0.8rem',
                fontSize: '0.85rem',
                flex: 1,
                outline: 'none'
              }}
            />
            <button className="btn btn-primary btn-sm" onClick={() => handleSendPrompt()} style={{ padding: '0.55rem 0.75rem' }}>
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
