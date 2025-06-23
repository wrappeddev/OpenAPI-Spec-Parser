import { useState, useEffect, useRef } from 'react';
import {
  PlayIcon,
  StopIcon,
  PauseIcon,
  TrashIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  ClockIcon,
  WifiIcon
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';

interface WebSocketMessage {
  id: string;
  timestamp: Date;
  direction: 'incoming' | 'outgoing';
  type: 'text' | 'binary' | 'json' | 'ping' | 'pong' | 'close' | 'error';
  data: any;
  parsed?: any;
  size: number;
  event?: string;
}

interface WebSocketViewerProps {
  url: string;
  onMessage?: (message: WebSocketMessage) => void;
  onConnectionChange?: (connected: boolean) => void;
  className?: string;
}

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export function WebSocketViewer({ url, onMessage, onConnectionChange, className }: WebSocketViewerProps) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [messageToSend, setMessageToSend] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [filter, setFilter] = useState<'all' | 'incoming' | 'outgoing'>('all');
  
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, autoScroll]);

  const addMessage = (message: Omit<WebSocketMessage, 'id' | 'timestamp'>) => {
    if (isPaused) return;
    
    const fullMessage: WebSocketMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, fullMessage]);
    onMessage?.(fullMessage);
  };

  const connect = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    setConnectionState('connecting');
    
    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionState('connected');
        onConnectionChange?.(true);
        addMessage({
          direction: 'incoming',
          type: 'text',
          data: 'Connected to WebSocket',
          size: 0
        });
      };

      ws.onmessage = (event) => {
        let messageType: WebSocketMessage['type'] = 'text';
        let parsedData = undefined;
        let eventName = undefined;

        if (event.data instanceof Blob) {
          messageType = 'binary';
        } else if (typeof event.data === 'string') {
          try {
            parsedData = JSON.parse(event.data);
            messageType = 'json';
            
            // Try to detect event name (Socket.IO style)
            if (Array.isArray(parsedData) && parsedData.length > 0) {
              eventName = String(parsedData[0]);
            } else if (parsedData && typeof parsedData === 'object' && (parsedData.event || parsedData.type)) {
              eventName = parsedData.event || parsedData.type;
            }
          } catch {
            // Not JSON, keep as text
          }
        }

        addMessage({
          direction: 'incoming',
          type: messageType,
          data: event.data,
          parsed: parsedData,
          size: new Blob([event.data]).size,
          event: eventName
        });
      };

      ws.onclose = (event) => {
        setConnectionState('disconnected');
        onConnectionChange?.(false);
        addMessage({
          direction: 'incoming',
          type: 'close',
          data: `Connection closed (${event.code}: ${event.reason || 'No reason'})`,
          size: 0
        });
      };

      ws.onerror = () => {
        setConnectionState('error');
        onConnectionChange?.(false);
        addMessage({
          direction: 'incoming',
          type: 'error',
          data: 'WebSocket error occurred',
          size: 0
        });
      };
    } catch (error) {
      setConnectionState('error');
      addMessage({
        direction: 'incoming',
        type: 'error',
        data: `Failed to connect: ${error}`,
        size: 0
      });
    }
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  const sendMessage = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !messageToSend.trim()) {
      return;
    }

    const message = messageToSend.trim();
    let messageType: WebSocketMessage['type'] = 'text';
    let parsedData = undefined;

    try {
      parsedData = JSON.parse(message);
      messageType = 'json';
    } catch {
      // Not JSON, keep as text
    }

    wsRef.current.send(message);
    
    addMessage({
      direction: 'outgoing',
      type: messageType,
      data: message,
      parsed: parsedData,
      size: new Blob([message]).size
    });

    setMessageToSend('');
  };

  const clearMessages = () => {
    setMessages([]);
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }) + '.' + timestamp.getMilliseconds().toString().padStart(3, '0');
  };

  const formatMessageData = (message: WebSocketMessage) => {
    if (message.type === 'json' && message.parsed) {
      return JSON.stringify(message.parsed, null, 2);
    }
    return String(message.data);
  };

  const getMessageTypeColor = (type: WebSocketMessage['type']) => {
    switch (type) {
      case 'json': return 'text-blue-600 bg-blue-50';
      case 'text': return 'text-green-600 bg-green-50';
      case 'binary': return 'text-purple-600 bg-purple-50';
      case 'error': return 'text-red-600 bg-red-50';
      case 'close': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const filteredMessages = messages.filter(msg => {
    if (filter === 'all') return true;
    return msg.direction === filter;
  });

  const connectionStateColors = {
    disconnected: 'text-gray-600 bg-gray-100',
    connecting: 'text-yellow-600 bg-yellow-100',
    connected: 'text-green-600 bg-green-100',
    error: 'text-red-600 bg-red-100'
  };

  return (
    <div className={clsx('bg-white border border-gray-200 rounded-lg flex flex-col', className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <WifiIcon className="h-5 w-5 text-gray-400" />
            <div>
              <h3 className="text-lg font-medium text-gray-900">WebSocket Connection</h3>
              <code className="text-sm text-gray-600">{url}</code>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className={clsx(
              'px-2 py-1 text-xs font-medium rounded',
              connectionStateColors[connectionState]
            )}>
              {connectionState.toUpperCase()}
            </span>
            
            {connectionState === 'connected' ? (
              <button onClick={disconnect} className="btn-outline flex items-center space-x-1">
                <StopIcon className="h-4 w-4" />
                <span>Disconnect</span>
              </button>
            ) : (
              <button onClick={connect} className="btn-primary flex items-center space-x-1">
                <PlayIcon className="h-4 w-4" />
                <span>Connect</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className={clsx(
                'btn flex items-center space-x-1',
                isPaused ? 'btn-primary' : 'btn-outline'
              )}
            >
              {isPaused ? <PlayIcon className="h-4 w-4" /> : <PauseIcon className="h-4 w-4" />}
              <span>{isPaused ? 'Resume' : 'Pause'}</span>
            </button>
            
            <button onClick={clearMessages} className="btn-outline flex items-center space-x-1">
              <TrashIcon className="h-4 w-4" />
              <span>Clear</span>
            </button>
            
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="input text-sm"
            >
              <option value="all">All Messages</option>
              <option value="incoming">Incoming Only</option>
              <option value="outgoing">Outgoing Only</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="mr-2"
              />
              Auto-scroll
            </label>
            <span className="text-sm text-gray-500">
              {filteredMessages.length} messages
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0"
        style={{ maxHeight: '400px' }}
      >
        {filteredMessages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <WifiIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p>No messages yet. Connect to start receiving messages.</p>
          </div>
        ) : (
          filteredMessages.map((message) => (
            <div
              key={message.id}
              className={clsx(
                'flex items-start space-x-3 p-3 rounded-lg border',
                message.direction === 'incoming' 
                  ? 'bg-blue-50 border-blue-200' 
                  : 'bg-green-50 border-green-200'
              )}
            >
              <div className="flex-shrink-0">
                {message.direction === 'incoming' ? (
                  <ArrowDownIcon className="h-4 w-4 text-blue-600" />
                ) : (
                  <ArrowUpIcon className="h-4 w-4 text-green-600" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-xs text-gray-500 flex items-center">
                    <ClockIcon className="h-3 w-3 mr-1" />
                    {formatTimestamp(message.timestamp)}
                  </span>
                  
                  <span className={clsx(
                    'px-2 py-1 text-xs font-medium rounded',
                    getMessageTypeColor(message.type)
                  )}>
                    {message.type}
                  </span>
                  
                  {message.event && (
                    <span className="px-2 py-1 text-xs font-medium text-purple-700 bg-purple-100 rounded">
                      {message.event}
                    </span>
                  )}
                  
                  <span className="text-xs text-gray-500">
                    {message.size} bytes
                  </span>
                </div>
                
                <pre className="text-sm text-gray-900 whitespace-pre-wrap break-words font-mono">
                  {formatMessageData(message)}
                </pre>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Send Message */}
      {connectionState === 'connected' && (
        <div className="p-4 border-t border-gray-200">
          <div className="flex space-x-2">
            <input
              type="text"
              value={messageToSend}
              onChange={(e) => setMessageToSend(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message to send..."
              className="input flex-1"
            />
            <button
              onClick={sendMessage}
              disabled={!messageToSend.trim()}
              className="btn-primary"
            >
              Send
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Tip: Send JSON objects for structured messages
          </p>
        </div>
      )}
    </div>
  );
}
