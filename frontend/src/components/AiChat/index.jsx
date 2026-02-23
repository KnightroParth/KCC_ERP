import { useState, useRef, useEffect } from 'react';
import { FloatButton, Drawer, Input, Button, Avatar, Tooltip, Popconfirm } from 'antd';
import { RobotOutlined, SendOutlined, CloseOutlined, DeleteOutlined, UserOutlined, LoadingOutlined } from '@ant-design/icons';
import { useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { request } from '@/request';

const TypingIndicator = () => (
    <div style={{ display: 'flex', gap: '4px', padding: '10px 12px' }}>
        <style>
            {`
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); opacity: 0.5; }
                    50% { transform: translateY(-4px); opacity: 1; }
                }
            `}
        </style>
        {[0, 1, 2].map(i => (
            <div key={i} style={{
                width: '6px', height: '6px', background: '#1677ff', borderRadius: '50%',
                animation: `bounce 1s infinite ${i * 0.2}s`
            }} />
        ))}
    </div>
);

export default function AiChat() {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState(() => {
        const saved = localStorage.getItem('ai_chat_history');
        return saved ? JSON.parse(saved) : [];
    });
    const [inputValue, setInputValue] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const location = useLocation();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
        localStorage.setItem('ai_chat_history', JSON.stringify(messages));
    }, [messages]);

    const handleClearChat = () => {
        setMessages([]);
        localStorage.removeItem('ai_chat_history');
    };

    const handleSend = async () => {
        if (!inputValue.trim() || loading) return;

        const userMessage = {
            id: Date.now(),
            type: 'user',
            content: inputValue.trim(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputValue('');
        setLoading(true);

        try {
            const response = await request.post({
                entity: '/ai/chat',
                jsonData: {
                    question: userMessage.content,
                    history: messages.map(m => ({ role: m.type === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })),
                    pageContext: location.pathname
                },
            });

            const aiMessage = {
                id: Date.now() + 1,
                type: 'ai',
                content: response.success
                    ? response.result
                    : response.message || 'Sorry, I could not process your request.',
            };

            setMessages((prev) => [...prev, aiMessage]);
        } catch (error) {
            const errorMessage = {
                id: Date.now() + 1,
                type: 'ai',
                content: 'Sorry, something went wrong. Please try again later.',
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const styles = {
        drawer: {
            background: 'transparent',
        },
        body: {
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
        },
        header: {
            background: 'linear-gradient(135deg, #1677ff 0%, #4096ff 100%)',
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            zIndex: 10,
        },
        title: {
            color: 'white',
            fontWeight: 600,
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
        },
        messagesContainer: {
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            background: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
        },
        messageRow: {
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start',
            animation: 'fadeIn 0.3s ease-out',
        },
        userRow: {
            justifyContent: 'flex-end',
        },
        aiRow: {
            justifyContent: 'flex-start',
        },
        avatar: {
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            border: '2px solid white',
            flexShrink: 0,
        },
        bubble: {
            maxWidth: '85%',
            padding: '14px 18px',
            fontSize: '15px',
            lineHeight: '1.6',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            position: 'relative',
        },
        userBubble: {
            background: 'linear-gradient(135deg, #1677ff 0%, #1668dc 100%)',
            color: 'white',
            borderRadius: '16px 16px 2px 16px',
        },
        aiBubble: {
            background: 'white',
            color: '#1e293b',
            borderRadius: '2px 16px 16px 16px',
            border: '1px solid #eef2f6',
        },
        inputContainer: {
            padding: '20px',
            background: 'white',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            boxShadow: '0 -4px 12px rgba(0,0,0,0.03)',
        },
        input: {
            borderRadius: '24px',
            padding: '10px 20px',
            border: '1px solid #e2e8f0',
            background: '#f8fafc',
            fontSize: '15px',
            transition: 'all 0.2s',
        },
        sendBtn: {
            height: '42px',
            width: '42px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #1677ff 0%, #4096ff 100%)',
            border: 'none',
            boxShadow: '0 4px 12px rgba(22, 119, 255, 0.3)',
        }
    };

    return (
        <>
            <style>
                {`
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    /* Custom Scrollbar */
                    .ai-chat-scroll::-webkit-scrollbar { width: 6px; }
                    .ai-chat-scroll::-webkit-scrollbar-track { background: transparent; }
                    .ai-chat-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
                    .ai-chat-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
                `}
            </style>

            <FloatButton
                icon={<RobotOutlined style={{ fontSize: '24px' }} />}
                type="primary"
                onClick={() => setOpen(true)}
                style={{ right: 30, bottom: 30, width: 60, height: 60 }}
                badge={{ dot: true, color: '#f5222d' }}
            />

            <Drawer
                title={null}
                placement="right"
                width={480}
                onClose={() => setOpen(false)}
                open={open}
                closable={false}
                styles={{ body: styles.body }}
                headerStyle={{ display: 'none' }}
                maskStyle={{ backdropFilter: 'blur(3px)', background: 'rgba(0,0,0,0.25)' }}
            >
                {/* Header */}
                <div style={styles.header}>
                    <div style={styles.title}>
                        <Avatar
                            style={{ backgroundColor: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)' }}
                            icon={<RobotOutlined />}
                        />
                        <div>
                            <div>KCC Assistant</div>
                            <div style={{ fontSize: '11px', opacity: 0.8, fontWeight: 400 }}>Pro Edition</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <Popconfirm
                            title="Clear conversation?"
                            onConfirm={handleClearChat}
                            okText="Yes"
                            cancelText="No"
                            placement="bottomRight"
                        >
                            <Tooltip title="Clear Chat">
                                <Button
                                    type="text"
                                    shape="circle"
                                    icon={<DeleteOutlined style={{ color: 'white' }} />}
                                    style={{ background: 'rgba(255,255,255,0.1)' }}
                                />
                            </Tooltip>
                        </Popconfirm>
                        <Button
                            type="text"
                            shape="circle"
                            icon={<CloseOutlined style={{ color: 'white' }} />}
                            onClick={() => setOpen(false)}
                        />
                    </div>
                </div>

                {/* Messages */}
                <div style={styles.messagesContainer} className="ai-chat-scroll">
                    {messages.length === 0 && (
                        <div style={{ textAlign: 'center', color: '#64748b', marginTop: '80px', padding: '0 40px', animation: 'fadeIn 0.5s' }}>
                            <div style={{
                                width: '100px', height: '100px',
                                background: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 100%)',
                                borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 24px',
                                boxShadow: '0 10px 25px rgba(186, 230, 253, 0.5)'
                            }}>
                                <RobotOutlined style={{ fontSize: '48px', color: '#0ea5e9' }} />
                            </div>
                            <h3 style={{ color: '#1e293b', marginBottom: '12px', fontSize: '18px' }}>Checking project status?</h3>
                            <p style={{ lineHeight: '1.6' }}>I can analyze projects, track invoices, or summarize client details for you.</p>
                        </div>
                    )}

                    {messages.map((msg) => (
                        <div key={msg.id} style={{ ...styles.messageRow, ...(msg.type === 'user' ? styles.userRow : styles.aiRow) }}>
                            {msg.type === 'ai' && (
                                <Avatar size="small" icon={<RobotOutlined />} style={{ ...styles.avatar, backgroundColor: '#1677ff' }} />
                            )}
                            <div style={{ ...styles.bubble, ...(msg.type === 'user' ? styles.userBubble : styles.aiBubble) }}>
                                {msg.type === 'user' ? (
                                    msg.content
                                ) : (
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            h1: ({ node, ...props }) => <h3 style={{ fontSize: '18px', margin: '0 0 12px', color: '#0f172a' }} {...props} />,
                                            h2: ({ node, ...props }) => <h4 style={{ fontSize: '16px', margin: '16px 0 8px', color: '#334155' }} {...props} />,
                                            p: ({ node, ...props }) => <p style={{ margin: '0 0 8px' }} {...props} />,
                                            ul: ({ node, ...props }) => <ul style={{ paddingLeft: '20px', margin: '0 0 12px' }} {...props} />,
                                            li: ({ node, ...props }) => <li style={{ marginBottom: '4px' }} {...props} />,
                                            table: ({ node, ...props }) => <div style={{ overflowX: 'auto', marginBottom: '12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }} {...props} /></div>,
                                            th: ({ node, ...props }) => <th style={{ background: '#f8fafc', padding: '10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '13px' }} {...props} />,
                                            td: ({ node, ...props }) => <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', color: '#334155' }} {...props} />,
                                            strong: ({ node, ...props }) => <strong style={{ color: '#0f172a', fontWeight: 600 }} {...props} />,
                                        }}
                                    >
                                        {msg.content}
                                    </ReactMarkdown>
                                )}
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div style={{ ...styles.messageRow, ...styles.aiRow }}>
                            <Avatar size="small" icon={<RobotOutlined />} style={{ ...styles.avatar, backgroundColor: '#1677ff' }} />
                            <div style={{ ...styles.bubble, ...styles.aiBubble, padding: '4px' }}>
                                <TypingIndicator />
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div style={styles.inputContainer}>
                    <Input
                        placeholder="Ask anything..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={loading}
                        style={styles.input}
                        variant="borderless"
                    />
                    <Button
                        type="primary"
                        shape="circle"
                        icon={loading ? <LoadingOutlined /> : <SendOutlined />}
                        onClick={handleSend}
                        loading={loading}
                        disabled={!inputValue.trim()}
                        style={styles.sendBtn}
                    />
                </div>
            </Drawer>
        </>
    );
}
