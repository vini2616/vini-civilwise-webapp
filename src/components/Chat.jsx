import React, { useState, useRef, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { checkPermission, canEditDelete } from '../utils/permissions';

const Chat = ({ currentUser }) => {
    const { messages, addMessage, updateMessage, deleteMessage } = useData();
    const permission = checkPermission(currentUser, 'chat'); // Check permission
    const [inputText, setInputText] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [editingMessageId, setEditingMessageId] = useState(null);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendText = (e) => {
        e.preventDefault();
        if (inputText.trim()) {
            if (editingMessageId) {
                updateMessage(editingMessageId, inputText);
                setEditingMessageId(null);
            } else {
                addMessage({
                    type: 'text',
                    content: inputText,
                    senderId: currentUser?.id || 'unknown',
                    senderName: currentUser?.name || 'Unknown User',
                    timestamp: new Date().toISOString()
                });
            }
            setInputText('');
        }
    };

    const handleEdit = (msg) => {
        setInputText(msg.content);
        setEditingMessageId(msg.id);
        fileInputRef.current.focus();
    };

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this message?')) {
            deleteMessage(id);
        }
    };

    const cancelEdit = () => {
        setInputText('');
        setEditingMessageId(null);
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const type = file.type.startsWith('image/') ? 'image' : 'video';
                addMessage({
                    type: type,
                    content: reader.result,
                    senderId: currentUser?.id || 'unknown',
                    senderName: currentUser?.name || 'Unknown User',
                    timestamp: new Date().toISOString()
                });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleLocationShare = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                const { latitude, longitude } = position.coords;
                const mapLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
                addMessage({
                    type: 'location',
                    content: mapLink,
                    senderId: currentUser?.id || 'unknown',
                    senderName: currentUser?.name || 'Unknown User',
                    timestamp: new Date().toISOString()
                });
            }, (error) => {
                alert('Unable to retrieve your location');
            });
        } else {
            alert('Geolocation is not supported by your browser');
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.onloadend = () => {
                    addMessage({
                        type: 'audio',
                        content: reader.result,
                        senderId: currentUser?.id || 'unknown',
                        senderName: currentUser?.name || 'Unknown User',
                        timestamp: new Date().toISOString()
                    });
                };
                reader.readAsDataURL(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Could not access microphone');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const formatTime = (isoString) => {
        const date = new Date(isoString);
        return date.toLocaleString([], {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="chat-container fade-in">
            <div className="chat-header">
                <h2>💬 Team Chat</h2>
                <p>Collaborate with your team</p>
            </div>

            <div className="messages-area">
                {messages.map((msg) => {
                    const isMe = msg.senderId === (currentUser?.id || 'unknown');
                    const msgId = msg.id || msg._id;
                    return (
                        <div key={msgId} className={`message-wrapper ${isMe ? 'me' : 'other'}`}>
                            <div className="message-bubble">
                                {!isMe && <div className="sender-name">{msg.senderName}</div>}

                                {msg.type === 'text' && <p>{msg.content}</p>}

                                {msg.type === 'image' && (
                                    <img src={msg.content} alt="Shared" className="shared-media" />
                                )}

                                {msg.type === 'video' && (
                                    <video src={msg.content} controls className="shared-media" />
                                )}

                                {msg.type === 'location' && (
                                    <a href={msg.content} target="_blank" rel="noopener noreferrer" className="location-link">
                                        📍 View Location
                                    </a>
                                )}

                                {msg.type === 'audio' && (
                                    <audio src={msg.content} controls className="audio-player" />
                                )}

                                <div className="message-time">
                                    {formatTime(msg.timestamp)}
                                    {isMe && (
                                        <div className="message-actions">
                                            {msg.type === 'text' && canEditDelete(permission) && (
                                                <button onClick={() => handleEdit({ ...msg, id: msgId })} className="action-btn" title="Edit">✏️</button>
                                            )}
                                            {canEditDelete(permission) && (
                                                <button onClick={() => handleDelete(msgId)} className="action-btn" title="Delete">🗑️</button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            <div className="input-area">
                <button
                    className="icon-btn"
                    onClick={() => fileInputRef.current.click()}
                    title="Upload Photo/Video"
                >
                    📎
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept="image/*,video/*"
                    onChange={handleFileUpload}
                />

                <button
                    className="icon-btn"
                    onClick={handleLocationShare}
                    title="Share Location"
                >
                    📍
                </button>

                <form onSubmit={handleSendText} className="text-form">
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder={editingMessageId ? "Edit message..." : "Type a message..."}
                        className="chat-input"
                    />
                    {editingMessageId && (
                        <button type="button" onClick={cancelEdit} className="cancel-btn">❌</button>
                    )}
                    <button type="submit" className="send-btn">{editingMessageId ? '💾' : '➤'}</button>
                </form>

                <button
                    className={`icon-btn mic-btn ${isRecording ? 'recording' : ''}`}
                    onMouseDown={startRecording}
                    onMouseUp={stopRecording}
                    onTouchStart={startRecording}
                    onTouchEnd={stopRecording}
                    title="Hold to Record"
                >
                    🎤
                </button>
            </div>

            <style>{`
                .chat-container {
                    display: flex;
                    flex-direction: column;
                    height: calc(100vh - 100px); /* Adjust based on layout */
                    background: #f0f2f5;
                    border-radius: 16px;
                    overflow: hidden;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                }
                .chat-header {
                    padding: 16px;
                    background: white;
                    border-bottom: 1px solid #e2e8f0;
                }
                .chat-header h2 { margin: 0; font-size: 1.25rem; }
                .chat-header p { margin: 4px 0 0; color: #64748b; font-size: 0.875rem; }
                
                .messages-area {
                    flex: 1;
                    padding: 20px;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    background-image: url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png'); /* WhatsApp-like bg pattern */
                    background-blend-mode: soft-light;
                    background-color: #e5ddd5;
                }
                
                .message-wrapper {
                    display: flex;
                    flex-direction: column;
                    max-width: 70%;
                }
                .message-wrapper.me {
                    align-self: flex-end;
                    align-items: flex-end;
                }
                .message-wrapper.other {
                    align-self: flex-start;
                    align-items: flex-start;
                }
                
                .message-bubble {
                    padding: 8px 12px;
                    border-radius: 8px;
                    position: relative;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
                    word-wrap: break-word;
                }
                .me .message-bubble {
                    background: #dcf8c6;
                    border-top-right-radius: 0;
                }
                .other .message-bubble {
                    background: white;
                    border-top-left-radius: 0;
                }
                
                .sender-name {
                    font-size: 0.75rem;
                    font-weight: bold;
                    color: #e542a3; /* Random color logic could be added */
                    margin-bottom: 4px;
                }
                
                .message-time {
                    font-size: 0.65rem;
                    color: #999;
                    text-align: right;
                    margin-top: 4px;
                }
                
                .shared-media {
                    max-width: 100%;
                    border-radius: 8px;
                    margin-top: 4px;
                }
                
                .location-link {
                    color: #3b82f6;
                    text-decoration: none;
                    font-weight: 500;
                }
                
                .audio-player {
                    height: 40px;
                    margin-top: 4px;
                }
                
                .input-area {
                    padding: 12px;
                    background: #f0f2f5;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .icon-btn {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                    padding: 8px;
                    border-radius: 50%;
                    transition: background 0.2s;
                    color: #54656f;
                }
                .icon-btn:hover { background: rgba(0,0,0,0.05); }
                
                .mic-btn.recording {
                    color: #dc2626;
                    animation: pulse 1s infinite;
                }
                
                .text-form {
                    flex: 1;
                    display: flex;
                    gap: 8px;
                }
                
                .chat-input {
                    flex: 1;
                    padding: 12px;
                    border-radius: 24px;
                    border: none;
                    outline: none;
                    font-size: 1rem;
                }
                
                .send-btn {
                    background: #00a884;
                    color: white;
                    border: none;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    font-size: 1.2rem;
                }
                
                @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                    100% { transform: scale(1); }
                }
                
                .message-actions {
                    display: inline-flex;
                    gap: 5px;
                    margin-left: 8px;
                    opacity: 0.7;
                }
                .action-btn {
                    background: none;
                    border: none;
                    cursor: pointer;
                    font-size: 0.8rem;
                    padding: 0;
                }
                .cancel-btn {
                    background: none;
                    border: none;
                    cursor: pointer;
                    font-size: 1.2rem;
                }
                .fade-in { animation: fadeIn 0.3s ease-out; }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default Chat;
