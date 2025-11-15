import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PaperAirplaneIcon, 
  XMarkIcon, 
  ChatBubbleLeftRightIcon, 
  MinusIcon,
  SparklesIcon 
} from '@heroicons/react/24/outline';
import { chatbotApi } from '../utils/apiService';

interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  gender: string;
  color: string;
  image: string;
  categoryId?: {
    articleType?: string;
    masterCategory?: string;
  };
}

interface Message {
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
  products?: Product[];
}

const Chatbot = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      content: "Hello! I'm here to help you find fashion items. What are you looking for today?",
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Generate user ID (simple approach - could use auth context in production)
  const [userId] = useState(() => {
    const stored = localStorage.getItem('chatbot_user_id');
    if (stored) return stored;
    const newId = `user-${Date.now()}`;
    localStorage.setItem('chatbot_user_id', newId);
    return newId;
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  /**
   * Detect product category from product name
   * Fallback method when categoryId is not populated
   */
  const detectProductCategory = (product: Product): string => {
    // First try to get from categoryId
    if (product.categoryId?.articleType) {
      return product.categoryId.articleType;
    }

    // Fallback: Detect from product name
    const name = product.name.toLowerCase();
    
    if (name.includes('shirt') || name.includes('tee') || name.includes('top') || 
        name.includes('hoodie') || name.includes('jacket') || name.includes('sweater') ||
        name.includes('blouse') || name.includes('polo')) {
      return 'Shirt';
    }
    
    if (name.includes('pant') || name.includes('trouser') || name.includes('jean') || 
        name.includes('short') || name.includes('chino')) {
      return 'Pants';
    }
    
    if (name.includes('shoe') || name.includes('sneaker') || name.includes('boot') || 
        name.includes('loafer')) {
      return 'Shoes';
    }
    
    if (name.includes('sandal') || name.includes('slipper') || name.includes('flip')) {
      return 'Sandals';
    }
    
    if (name.includes('watch')) {
      return 'Watch';
    }
    
    if (name.includes('cap') || name.includes('hat') || name.includes('beanie')) {
      return 'Hat';
    }
    
    if (name.includes('wallet') || name.includes('purse')) {
      return 'Wallet';
    }
    
    if (name.includes('bag') || name.includes('backpack')) {
      return 'Bag';
    }
    
    if (name.includes('belt')) {
      return 'Belt';
    }
    
    if (name.includes('sock')) {
      return 'Socks';
    }
    
    // Default fallback
    return 'Other';
  };

  /**
   * Smart product filtering for outfit recommendations
   * Shows ONLY 2 products per category for mixed requests
   */
  const filterProductsForDisplay = (products: Product[]): Product[] => {
    if (!products || products.length === 0) return [];

    console.log('🔍 Filtering products:', products.length);

    // Group products by detected category
    const grouped = products.reduce((acc: { [key: string]: Product[] }, product) => {
      const category = detectProductCategory(product);
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(product);
      return acc;
    }, {});

    const categories = Object.keys(grouped);
    console.log('📦 Categories found:', categories);
    console.log('📊 Products per category:', Object.keys(grouped).map(cat => ({
      category: cat,
      count: grouped[cat].length
    })));

    // If only one category, show up to 5 products
    if (categories.length === 1) {
      console.log('✅ Single category - showing up to 5 products');
      return products.slice(0, 5);
    }

    // Multiple categories (outfit recommendation) - show ONLY 2 from each
    console.log('🎨 Multiple categories detected - showing 2 per category');
    const filtered: Product[] = [];

    categories.forEach(category => {
      const categoryProducts = grouped[category].slice(0, 2); // ONLY 2 products per category
      console.log(`  - ${category}: taking ${categoryProducts.length} products`);
      filtered.push(...categoryProducts);
    });

    console.log('✅ Final filtered count:', filtered.length);
    return filtered;
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const messageToSend = inputMessage;
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await chatbotApi.sendMessage(messageToSend, userId);
      
      if (!response.success) {
        console.error('API Error:', response.message);
        throw new Error(response.message || 'Failed to get response');
      }

      console.log('📨 Bot response:', response.data);
      
      // Smart filtering: ONLY 2 products per category for outfit recommendations
      const allProducts = response.data?.products || [];
      console.log('📦 Total products from backend:', allProducts.length);
      
      const products = filterProductsForDisplay(allProducts);
      console.log('✨ Products after filtering:', products.length);
      
      const botMessage: Message = {
        role: 'model',
        content: response.data?.message || 'Sorry, I could not process your request.',
        timestamp: new Date(),
        products: products.length > 0 ? products : undefined
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        role: 'model',
        content: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearHistory = async () => {
    try {
      const response = await chatbotApi.clearHistory(userId);
      
      if (response.success) {
        setMessages([{
          role: 'model',
          content: "Hello! I'm here to help you find fashion items. What are you looking for today?",
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all duration-300 hover:scale-110 z-50 group"
        aria-label="Open chat"
      >
        <ChatBubbleLeftRightIcon className="w-6 h-6" />
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          <SparklesIcon className="w-3 h-3" />
        </span>
        <span className="absolute right-full mr-3 bg-gray-800 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          Need help? Chat with us!
        </span>
      </button>
    );
  }

  return (
    <div 
      className={`fixed bottom-6 right-6 bg-white rounded-2xl shadow-2xl z-50 transition-all duration-300 ${
        isMinimized ? 'w-80 h-16' : 'w-96 h-[600px]'
      }`}
      style={{ maxWidth: 'calc(100vw - 3rem)' }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-2xl flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-white/20 rounded-full p-2">
            <ChatBubbleLeftRightIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold">Fashion Assistant</h3>
            <p className="text-xs text-blue-100">Always here to help</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="hover:bg-white/20 rounded-full p-1.5 transition-colors"
            aria-label={isMinimized ? 'Maximize' : 'Minimize'}
          >
            <MinusIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="hover:bg-white/20 rounded-full p-1.5 transition-colors"
            aria-label="Close chat"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="h-[calc(100%-8rem)] overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] ${
                    msg.role === 'user' ? '' : 'w-full'
                  }`}
                >
                  <div
                    className={`rounded-2xl px-4 py-2 ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-sm'
                        : 'bg-white text-gray-800 shadow-sm rounded-bl-sm'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                    <p className={`text-xs mt-1 ${
                      msg.role === 'user' ? 'text-blue-100' : 'text-gray-400'
                    }`}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  
                  {/* Product Cards */}
                  {msg.products && msg.products.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {msg.products.map((product) => (
                        <div
                          key={product.id}
                          onClick={() => navigate(`/products/${product.id}`)}
                          className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer p-2 flex space-x-3 border border-gray-100"
                        >
                          <div className="flex-shrink-0 w-20 h-20 bg-gray-100 rounded-md overflow-hidden">
                            <img
                              src={product.image || '/placeholder-image.jpg'}
                              alt={product.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/placeholder-image.jpg';
                              }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-gray-900 truncate">
                              {product.name}
                            </h4>
                            <p className="text-xs text-gray-500">{product.brand}</p>
                            <p className="text-sm font-bold text-blue-600 mt-1">
                              ₫{product.price?.toLocaleString()}
                            </p>
                            <div className="flex space-x-2 mt-1">
                              {product.color && (
                                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                                  {product.color}
                                </span>
                              )}
                              {product.gender && (
                                <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded">
                                  {product.gender}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t border-gray-200 rounded-b-2xl">
            <div className="flex space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !inputMessage.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-full p-2 transition-colors"
                aria-label="Send message"
              >
                <PaperAirplaneIcon className="w-5 h-5" />
              </button>
            </div>
            <button
              onClick={clearHistory}
              className="text-xs text-gray-500 hover:text-gray-700 mt-2 mx-auto block"
            >
              Clear conversation
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Chatbot;