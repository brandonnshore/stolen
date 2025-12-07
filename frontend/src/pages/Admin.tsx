import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { adminAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Package,
  Users,
  ShoppingBag,
  TrendingUp,
  Eye,
  X,
  Save,
  Mail,
  MapPin,
  Phone,
  DollarSign
} from 'lucide-react';
import { getFullAssetUrl } from '../utils/urlHelpers';

interface OrderItem {
  id: string;
  product_name: string;
  product_slug: string;
  size: string;
  color: string;
  quantity: number;
  price: number;
  design_image_url?: string;
}

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  shipping_address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  phone?: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  tracking_number?: string;
  created_at: string;
  updated_at: string;
}

type TabView = 'orders' | 'products' | 'customers';

export default function Admin() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabView>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 10;

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await adminAPI.getAllOrders();
      setOrders(data);
    } catch (err) {
      console.error('Error loading orders:', err);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string, trackingNumber?: string) => {
    try {
      await adminAPI.updateOrderStatus(
        orderId,
        status,
        trackingNumber ? { tracking_number: trackingNumber } : undefined
      );
      await loadOrders();
      setIsModalOpen(false);
      setEditingOrder(null);
      toast.success('Order updated successfully');
    } catch (err) {
      console.error('Error updating order:', err);
      toast.error('Failed to update order');
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch =
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Pagination
  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      processing: 'bg-blue-100 text-blue-800 border-blue-200',
      shipped: 'bg-green-100 text-green-800 border-green-200',
      delivered: 'bg-gray-100 text-gray-800 border-gray-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
    };
    return badges[status as keyof typeof badges] || badges.pending;
  };

  const stats = {
    totalOrders: orders.length,
    pendingOrders: orders.filter(o => o.status === 'pending').length,
    processingOrders: orders.filter(o => o.status === 'processing').length,
    shippedOrders: orders.filter(o => o.status === 'shipped').length,
    totalRevenue: orders.reduce((sum, order) => sum + order.total, 0),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[1400px] mx-auto px-6 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-gray-600 mt-1">Manage your Stolen Tee store</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Logged in as</p>
              <p className="font-medium">{user?.name}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Orders</p>
                <p className="text-2xl font-bold mt-1">{stats.totalOrders}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <ShoppingBag className="text-blue-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Pending</p>
                <p className="text-2xl font-bold mt-1">{stats.pendingOrders}</p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-lg">
                <Package className="text-yellow-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Processing</p>
                <p className="text-2xl font-bold mt-1">{stats.processingOrders}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <TrendingUp className="text-blue-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Shipped</p>
                <p className="text-2xl font-bold mt-1">{stats.shippedOrders}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <Package className="text-green-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Revenue</p>
                <p className="text-2xl font-bold mt-1">${stats.totalRevenue.toFixed(2)}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <DollarSign className="text-green-600" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('orders')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'orders'
                    ? 'border-black text-black'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ShoppingBag size={18} />
                  <span>Orders</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('products')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'products'
                    ? 'border-black text-black'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Package size={18} />
                  <span>Products</span>
                  <span className="ml-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">Coming Soon</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('customers')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'customers'
                    ? 'border-black text-black'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Users size={18} />
                  <span>Customers</span>
                  <span className="ml-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">Coming Soon</span>
                </div>
              </button>
            </nav>
          </div>

          {/* Orders Tab Content */}
          {activeTab === 'orders' && (
            <div>
              {/* Search and Filter Bar */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      placeholder="Search by order #, customer name, or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                  </div>
                  <div className="relative min-w-[200px]">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent appearance-none bg-white"
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Orders Table */}
              {loading ? (
                <div className="p-12 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading orders...</p>
                </div>
              ) : currentOrders.length === 0 ? (
                <div className="p-12 text-center">
                  <ShoppingBag className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
                  <p className="text-gray-500">
                    {searchQuery || statusFilter !== 'all'
                      ? 'Try adjusting your search or filters'
                      : 'Orders will appear here when customers make purchases'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Order
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Customer
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Items
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {currentOrders.map((order) => (
                          <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="font-medium text-gray-900">#{order.order_number}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm">
                                <div className="font-medium text-gray-900">{order.customer_name}</div>
                                <div className="text-gray-500">{order.customer_email}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {order.items.reduce((sum, item) => sum + item.quantity, 0)} items
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              ${order.total.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusBadge(order.status)}`}>
                                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(order.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setEditingOrder({ ...order });
                                  setIsModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 text-black hover:text-gray-700 transition-colors"
                              >
                                <Eye size={16} />
                                <span>View</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                      <div className="text-sm text-gray-700">
                        Showing {indexOfFirstOrder + 1} to {Math.min(indexOfLastOrder, filteredOrders.length)} of {filteredOrders.length} orders
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft size={20} />
                        </button>
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`px-4 py-2 border rounded-md ${
                                currentPage === pageNum
                                  ? 'bg-black text-white border-black'
                                  : 'border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronRight size={20} />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Products Tab - Coming Soon */}
          {activeTab === 'products' && (
            <div className="p-12 text-center">
              <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Products Management</h3>
              <p className="text-gray-500">Coming soon - manage your product catalog here</p>
            </div>
          )}

          {/* Customers Tab - Coming Soon */}
          {activeTab === 'customers' && (
            <div className="p-12 text-center">
              <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Customer Management</h3>
              <p className="text-gray-500">Coming soon - view and manage customers here</p>
            </div>
          )}
        </div>
      </div>

      {/* Order Detail Modal */}
      {isModalOpen && selectedOrder && editingOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setIsModalOpen(false)} />

          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Order #{selectedOrder.order_number}</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Created {new Date(selectedOrder.created_at).toLocaleDateString()} at {new Date(selectedOrder.created_at).toLocaleTimeString()}
                  </p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6">
                {/* Customer Information */}
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Users size={20} />
                    Customer Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <Mail className="text-gray-400 mt-1" size={18} />
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-medium">{selectedOrder.customer_email}</p>
                      </div>
                    </div>
                    {selectedOrder.phone && (
                      <div className="flex items-start gap-3">
                        <Phone className="text-gray-400 mt-1" size={18} />
                        <div>
                          <p className="text-sm text-gray-500">Phone</p>
                          <p className="font-medium">{selectedOrder.phone}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-3 md:col-span-2">
                      <MapPin className="text-gray-400 mt-1" size={18} />
                      <div>
                        <p className="text-sm text-gray-500">Shipping Address</p>
                        <p className="font-medium">{selectedOrder.shipping_address.street}</p>
                        <p className="font-medium">
                          {selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.state} {selectedOrder.shipping_address.zip}
                        </p>
                        <p className="font-medium">{selectedOrder.shipping_address.country}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Package size={20} />
                    Order Items
                  </h3>
                  <div className="space-y-4">
                    {selectedOrder.items.map((item) => (
                      <div key={item.id} className="flex gap-4 p-4 border border-gray-200 rounded-lg">
                        {item.design_image_url ? (
                          <img
                            src={getFullAssetUrl(item.design_image_url)}
                            alt={item.product_name}
                            className="w-20 h-20 object-cover rounded-md border border-gray-200"
                          />
                        ) : (
                          <div className="w-20 h-20 bg-gray-100 rounded-md flex items-center justify-center border border-gray-200">
                            <Package className="text-gray-400" size={32} />
                          </div>
                        )}
                        <div className="flex-1">
                          <h4 className="font-semibold">{item.product_name}</h4>
                          <div className="text-sm text-gray-600 mt-1 space-y-1">
                            <p>Size: {item.size}</p>
                            <p>Color: {item.color}</p>
                            <p>Quantity: {item.quantity}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">${item.price.toFixed(2)}</p>
                          <p className="text-sm text-gray-500">each</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Order Total */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">Total</span>
                      <span className="text-2xl font-bold">${selectedOrder.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Order Status Update */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <ShoppingBag size={20} />
                    Update Order Status
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Order Status
                      </label>
                      <select
                        value={editingOrder.status}
                        onChange={(e) => setEditingOrder({ ...editingOrder, status: e.target.value as any })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tracking Number (optional)
                      </label>
                      <input
                        type="text"
                        value={editingOrder.tracking_number || ''}
                        onChange={(e) => setEditingOrder({ ...editingOrder, tracking_number: e.target.value })}
                        placeholder="Enter tracking number"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setEditingOrder({ ...selectedOrder });
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Reset
                    </button>
                    <button
                      onClick={() => handleUpdateOrderStatus(
                        selectedOrder.id,
                        editingOrder.status,
                        editingOrder.tracking_number
                      )}
                      className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
                    >
                      <Save size={18} />
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
