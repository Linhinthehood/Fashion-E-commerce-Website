import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PaperAirplaneIcon, 
  XMarkIcon, 
  ChatBubbleLeftRightIcon, 
  MinusIcon,
  SparklesIcon 
} from '@heroicons/react/24/outline';
import { chatbotApi, orderApi } from '../utils/apiService';

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

interface Order {
  id: string;
  orderNumber: string;
  totalPrice: number;
  finalPrice: number;
  itemCount: number;
  paymentStatus: string;
  shipmentStatus: string;
  paymentMethod: string;
  createdAt: string;
}

interface OrderItem {
  _id: string;
  productName: string;
  brand: string;
  color: string;
  size: string;
  price: number;
  quantity: number;
  subPrice: number;
  image: string;
  sku?: string;
  categoryInfo: {
    masterCategory: string;
    subCategory: string;
    articleType: string;
  };
}

interface Message {
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
  products?: Product[];
  orders?: Order[];
}

const Chatbot = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      content: "Hello! I'm here to help you find fashion items or check your orders. What can I help you with?",
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Order detail modal state
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const [isClosingModal, setIsClosingModal] = useState(false);
  const [loadingOrderDetail, setLoadingOrderDetail] = useState(false);

  // Generate user ID (Use real authenticated user ID)
  const [userId] = useState(() => {
    const authUser = JSON.parse(localStorage.getItem('user') || '{}');
    return authUser._id || authUser.id || 'anonymous';
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
   */
  const detectProductCategory = (product: Product): string => {
    if (product.categoryId?.articleType) {
      return product.categoryId.articleType;
    }

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
    
    return 'Other';
  };

  /**
   * Smart product filtering for outfit recommendations
   */
  const filterProductsForDisplay = (products: Product[]): Product[] => {
    if (!products || products.length === 0) return [];

    const grouped = products.reduce((acc: { [key: string]: Product[] }, product) => {
      const category = detectProductCategory(product);
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(product);
      return acc;
    }, {});

    const categories = Object.keys(grouped);

    if (categories.length === 1) {
      return products.slice(0, 5);
    }

    const filtered: Product[] = [];
    categories.forEach(category => {
      const categoryProducts = grouped[category].slice(0, 2);
      filtered.push(...categoryProducts);
    });

    return filtered;
  };

  /**
   * Handle order card click - load and show detail modal
   */
  const handleOrderClick = async (orderNumber: string) => {
    try {
      setLoadingOrderDetail(true);
      
      // Find order from messages
      const currentMessage = messages.find(msg => msg.orders && msg.orders.length > 0);
      const order = currentMessage?.orders?.find(o => o.orderNumber === orderNumber);
      
      if (!order) {
        console.error('Order not found:', orderNumber);
        return;
      }

      const response = await orderApi.getById(order.id);
      
      if (response.success && response.data) {
        const data = response.data as any;
        setSelectedOrder(data.order);
        setOrderItems(data.orderItems || []);
        setIsClosingModal(false);
        setShowOrderDetail(true);
      }
    } catch (error) {
      console.error('Error loading order details:', error);
    } finally {
      setLoadingOrderDetail(false);
    }
  };

  /**
   * Close modal with animation
   */
  const handleCloseModal = () => {
    setIsClosingModal(true);
    setTimeout(() => {
      setShowOrderDetail(false);
      setIsClosingModal(false);
      setSelectedOrder(null);
      setOrderItems([]);
    }, 300);
  };

  /**
   * Render message with clickable order numbers
   */
  const renderMessageContent = (content: string, orders?: Order[]) => {
    // If no orders in this message, just return plain text
    if (!orders || orders.length === 0) {
      return <span className="whitespace-pre-wrap break-words">{content}</span>;
    }

    // Match order numbers like **ORD-1763018831567-5f3214** or **ORD-176301**
    const orderRegex = /\*\*(ORD-[\w-]+)\*\*/g;
    const parts = content.split(orderRegex);

    return (
      <span className="whitespace-pre-wrap break-words">
        {parts.map((part, index) => {
          // Check if this part is an order number
          if (part.match(/^ORD-[\w-]+$/)) {
            return (
              <button
                key={index}
                onClick={() => handleOrderClick(part)}
                className="font-bold text-blue-600 hover:text-blue-800 hover:underline transition-colors inline"
                disabled={loadingOrderDetail}
              >
                {part}
              </button>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </span>
    );
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
      
      // Filter products for display
      const allProducts = response.data?.products || [];
      const products = filterProductsForDisplay(allProducts);
      
      // Get orders if available - FIX: Proper type checking
      const ordersData = response.data?.orders;
      const orders: Order[] = Array.isArray(ordersData) && ordersData.length > 0 ? ordersData : [];
      
      const botMessage: Message = {
        role: 'model',
        content: response.data?.message || 'Sorry, I could not process your request.',
        timestamp: new Date(),
        products: products.length > 0 ? products : undefined,
        orders: orders.length > 0 ? orders : undefined
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
          content: "Hello! I'm here to help you find fashion items or check your orders. What can I help you with?",
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  };

  // Helper functions for order modal
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { 
      style: 'currency', 
      currency: 'VND', 
      maximumFractionDigits: 0 
    }).format(amount);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string, type: 'payment' | 'shipment') => {
    if (type === 'payment') {
      switch (status) {
        case 'Paid': return 'text-green-600 bg-green-100';
        case 'Pending': return 'text-yellow-600 bg-yellow-100';
        case 'Failed': return 'text-red-600 bg-red-100';
        default: return 'text-gray-600 bg-gray-100';
      }
    } else {
      switch (status) {
        case 'Delivered': return 'text-green-600 bg-green-100';
        case 'Packed': return 'text-blue-600 bg-blue-100';
        case 'Pending': return 'text-yellow-600 bg-yellow-100';
        default: return 'text-gray-600 bg-gray-100';
      }
    }
  };

  const getStatusText = (status: string, type: 'payment' | 'shipment') => {
    if (type === 'payment') {
      switch (status) {
        case 'Paid': return 'Đã thanh toán';
        case 'Pending': return 'Chờ thanh toán';
        case 'Failed': return 'Thất bại';
        default: return status;
      }
    } else {
      switch (status) {
        case 'Delivered': return 'Đã giao hàng';
        case 'Packed': return 'Đã đóng gói';
        case 'Pending': return 'Chờ xử lý';
        default: return status;
      }
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
    <>
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
                      <p className="text-sm">
                        {renderMessageContent(msg.content, msg.orders)}
                      </p>
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

      {/* Order Detail Modal */}
      {showOrderDetail && selectedOrder && (
        <div 
          className={`fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[60] transition-opacity duration-300 ${
            isClosingModal ? 'opacity-0' : 'opacity-100'
          }`}
          onClick={handleCloseModal}
        >
          <div 
            className={`bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden transition-all duration-300 ${
              isClosingModal ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold text-gray-900">
                Chi tiết đơn hàng #{selectedOrder.orderNumber}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6">
              {/* Order Items */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Sản phẩm đã đặt</h3>
                <div className="space-y-3">
                  {orderItems.map((item) => (
                    <div key={item._id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                      <img 
                        src={item.image} 
                        alt={item.productName}
                        className="w-16 h-16 object-cover rounded-md"
                      />
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 text-sm">{item.productName}</h4>
                        <p className="text-xs text-gray-600">{item.brand} - {item.color} - Size {item.size}</p>
                        <p className="text-xs text-gray-500">
                          {item.categoryInfo.masterCategory} &gt; {item.categoryInfo.subCategory}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-red-600 text-sm">{formatCurrency(item.price)}</p>
                        <p className="text-xs text-gray-500">SL: {item.quantity}</p>
                        <p className="font-bold text-red-600">{formatCurrency(item.subPrice)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Trạng thái</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <h4 className="text-xs font-medium text-gray-700 mb-2">Thanh toán</h4>
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedOrder.paymentStatus, 'payment')}`}>
                      {getStatusText(selectedOrder.paymentStatus, 'payment')}
                    </span>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <h4 className="text-xs font-medium text-gray-700 mb-2">Giao hàng</h4>
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedOrder.shipmentStatus, 'shipment')}`}>
                      {getStatusText(selectedOrder.shipmentStatus, 'shipment')}
                    </span>
                  </div>
                </div>

                {/* Histories */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-semibold mb-3">Lịch sử thanh toán</h4>
                    <div className="space-y-2">
                      {selectedOrder.paymentHistory?.map((payment: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded text-xs">
                          <span className={`px-2 py-1 rounded-full ${getStatusColor(payment.status, 'payment')}`}>
                            {getStatusText(payment.status, 'payment')}
                          </span>
                          <span className="text-gray-500">{formatDateTime(payment.updateAt)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold mb-3">Lịch sử giao hàng</h4>
                    <div className="space-y-2">
                      {selectedOrder.shipmentHistory?.map((shipment: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded text-xs">
                          <span className={`px-2 py-1 rounded-full ${getStatusColor(shipment.status, 'shipment')}`}>
                            {getStatusText(shipment.status, 'shipment')}
                          </span>
                          <span className="text-gray-500">{formatDateTime(shipment.updateAt)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="border-t pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Tóm tắt</h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Tạm tính:</span>
                        <span>{formatCurrency(selectedOrder.totalPrice)}</span>
                      </div>
                      {selectedOrder.discount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Giảm giá:</span>
                          <span>-{formatCurrency(selectedOrder.discount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-base pt-2 border-t">
                        <span>Tổng:</span>
                        <span className="text-red-600">{formatCurrency(selectedOrder.finalPrice)}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Thông tin</h3>
                    <div className="space-y-1 text-xs">
                      <p><span className="font-medium">Số đơn:</span> {selectedOrder.orderNumber}</p>
                      <p><span className="font-medium">Ngày đặt:</span> {formatDateTime(selectedOrder.createdAt)}</p>
                      <p><span className="font-medium">Phương thức:</span> {selectedOrder.paymentMethod}</p>
                      <p><span className="font-medium">Số sản phẩm:</span> {selectedOrder.itemCount}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;