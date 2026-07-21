import { Customer, Order, Reservation, DailySales, Employee, InventoryItem, Review, Coupon } from '@/types';

// ──────────────────────────────────────────
// CUSTOMERS
// ──────────────────────────────────────────
export const customers: Customer[] = [
  {
    id: 'c1', name: 'Rahul Sharma', phone: '+91 98765 43210', email: 'rahul.sharma@email.com',
    address: '12, Banjara Hills, Road No. 10', city: 'Hyderabad', totalOrders: 28, totalSpent: 8420,
    loyaltyPoints: 842, joinDate: '2023-03-15', lastVisit: '2026-07-18', avatar: 'RS',
    isVip: true, favoriteItems: ['m20', 'm11', 'm34'],
  },
  {
    id: 'c2', name: 'Priya Reddy', phone: '+91 87654 32109', email: 'priya.reddy@email.com',
    address: '45, Jubilee Hills, Phase 2', city: 'Hyderabad', totalOrders: 19, totalSpent: 5680,
    loyaltyPoints: 568, joinDate: '2023-06-22', lastVisit: '2026-07-17', avatar: 'PR',
    isVip: false, favoriteItems: ['m11', 'm6', 'm30'],
  },
  {
    id: 'c3', name: 'Arjun Kumar', phone: '+91 76543 21098', email: 'arjun.kumar@email.com',
    address: '78, Madhapur, HITEC City', city: 'Hyderabad', totalOrders: 35, totalSpent: 12450,
    loyaltyPoints: 1245, joinDate: '2022-11-08', lastVisit: '2026-07-19', avatar: 'AK',
    isVip: true, favoriteItems: ['m21', 'm4', 'm12'],
  },
  {
    id: 'c4', name: 'Sneha Patel', phone: '+91 65432 10987', email: 'sneha.patel@email.com',
    address: '23, Gachibowli, Financial District', city: 'Hyderabad', totalOrders: 12, totalSpent: 3240,
    loyaltyPoints: 324, joinDate: '2024-01-14', lastVisit: '2026-07-15', avatar: 'SP',
    isVip: false, favoriteItems: ['m2', 'm22', 'm31'],
  },
  {
    id: 'c5', name: 'Rohit Verma', phone: '+91 54321 09876', email: 'rohit.verma@email.com',
    address: '56, Ameerpet, Lane 3', city: 'Hyderabad', totalOrders: 22, totalSpent: 6780,
    loyaltyPoints: 678, joinDate: '2023-08-30', lastVisit: '2026-07-16', avatar: 'RV',
    isVip: false, favoriteItems: ['m20', 'm19', 'm26'],
  },
  {
    id: 'c6', name: 'Ayesha Khan', phone: '+91 43210 98765', email: 'ayesha.khan@email.com',
    address: '89, Tolichowki, Street 5', city: 'Hyderabad', totalOrders: 41, totalSpent: 15200,
    loyaltyPoints: 1520, joinDate: '2022-07-12', lastVisit: '2026-07-20', avatar: 'AK',
    isVip: true, favoriteItems: ['m21', 'm15', 'm24'],
  },
  {
    id: 'c7', name: 'Vikram Singh', phone: '+91 32109 87654', email: 'vikram.singh@email.com',
    address: '34, Kukatpally, Bhavani Nagar', city: 'Hyderabad', totalOrders: 8, totalSpent: 2180,
    loyaltyPoints: 218, joinDate: '2024-04-05', lastVisit: '2026-07-10', avatar: 'VS',
    isVip: false, favoriteItems: ['m12', 'm27', 'm34'],
  },
  {
    id: 'c8', name: 'Divya Nair', phone: '+91 21098 76543', email: 'divya.nair@email.com',
    address: '67, Kondapur, Phase 1', city: 'Hyderabad', totalOrders: 16, totalSpent: 4560,
    loyaltyPoints: 456, joinDate: '2023-09-18', lastVisit: '2026-07-14', avatar: 'DN',
    isVip: false, favoriteItems: ['m6', 'm34', 'm30'],
  },
];

// ──────────────────────────────────────────
// ORDERS
// ──────────────────────────────────────────
export const orders: Order[] = [
  {
    id: 'o1', orderId: 'ORD-2026-0001', customerId: 'c1', customerName: 'Rahul Sharma',
    customerPhone: '+91 98765 43210', customerAddress: '12, Banjara Hills',
    items: [
      { menuItemId: 'm20', name: 'Chicken Dum Biryani', price: 320, quantity: 2, vegStatus: 'non-veg' },
      { menuItemId: 'm11', name: 'Paneer Butter Masala', price: 280, quantity: 1, vegStatus: 'veg' },
      { menuItemId: 'm26', name: 'Butter Naan', price: 45, quantity: 4, vegStatus: 'veg' },
      { menuItemId: 'm34', name: 'Mango Lassi', price: 100, quantity: 2, vegStatus: 'veg' },
    ],
    subtotal: 1300, cgst: 32.5, sgst: 32.5, discount: 0, deliveryCharge: 40, grandTotal: 1405,
    status: 'delivered', paymentMode: 'upi', paymentStatus: 'paid',
    orderDate: '2026-07-20', orderTime: '13:45', deliveredAt: '14:25', tableNumber: 5,
  },
  {
    id: 'o2', orderId: 'ORD-2026-0002', customerId: 'c2', customerName: 'Priya Reddy',
    customerPhone: '+91 87654 32109', customerAddress: '45, Jubilee Hills',
    items: [
      { menuItemId: 'm11', name: 'Paneer Butter Masala', price: 280, quantity: 1, vegStatus: 'veg' },
      { menuItemId: 'm6', name: 'Masala Dosa', price: 120, quantity: 2, vegStatus: 'veg' },
      { menuItemId: 'm30', name: 'Gulab Jamun', price: 90, quantity: 1, vegStatus: 'veg' },
    ],
    subtotal: 610, cgst: 15.25, sgst: 15.25, discount: 0, deliveryCharge: 40, grandTotal: 680.5,
    status: 'preparing', paymentMode: 'card', paymentStatus: 'paid',
    orderDate: '2026-07-20', orderTime: '14:02',
  },
  {
    id: 'o3', orderId: 'ORD-2026-0003', customerId: 'c3', customerName: 'Arjun Kumar',
    customerPhone: '+91 76543 21098', customerAddress: '78, Madhapur',
    items: [
      { menuItemId: 'm21', name: 'Mutton Dum Biryani', price: 420, quantity: 2, vegStatus: 'non-veg' },
      { menuItemId: 'm4', name: 'Seekh Kebab', price: 320, quantity: 1, vegStatus: 'non-veg' },
      { menuItemId: 'm27', name: 'Garlic Naan', price: 55, quantity: 3, vegStatus: 'veg' },
    ],
    subtotal: 1325, cgst: 33.13, sgst: 33.13, discount: 0, deliveryCharge: 0, grandTotal: 1391.25,
    status: 'pending', paymentMode: 'cash', paymentStatus: 'unpaid',
    orderDate: '2026-07-20', orderTime: '14:15', tableNumber: 8,
  },
  {
    id: 'o4', orderId: 'ORD-2026-0004', customerId: 'c6', customerName: 'Ayesha Khan',
    customerPhone: '+91 43210 98765', customerAddress: '89, Tolichowki',
    items: [
      { menuItemId: 'm21', name: 'Mutton Dum Biryani', price: 420, quantity: 1, vegStatus: 'non-veg' },
      { menuItemId: 'm15', name: 'Mutton Rogan Josh', price: 420, quantity: 1, vegStatus: 'non-veg' },
      { menuItemId: 'm26', name: 'Butter Naan', price: 45, quantity: 4, vegStatus: 'veg' },
    ],
    subtotal: 1020, cgst: 25.5, sgst: 25.5, discount: 102, deliveryCharge: 40, grandTotal: 1009,
    status: 'ready', paymentMode: 'upi', paymentStatus: 'paid',
    orderDate: '2026-07-20', orderTime: '14:20', couponCode: 'ROYAL10',
  },
  {
    id: 'o5', orderId: 'ORD-2026-0005', customerId: 'c5', customerName: 'Rohit Verma',
    customerPhone: '+91 54321 09876', customerAddress: '56, Ameerpet',
    items: [
      { menuItemId: 'm20', name: 'Chicken Dum Biryani', price: 320, quantity: 1, vegStatus: 'non-veg' },
      { menuItemId: 'm19', name: 'Chilli Chicken', price: 260, quantity: 1, vegStatus: 'non-veg' },
      { menuItemId: 'm34', name: 'Mango Lassi', price: 100, quantity: 1, vegStatus: 'veg' },
    ],
    subtotal: 680, cgst: 17, sgst: 17, discount: 0, deliveryCharge: 40, grandTotal: 754,
    status: 'delivered', paymentMode: 'cash', paymentStatus: 'paid',
    orderDate: '2026-07-20', orderTime: '12:30', deliveredAt: '13:10',
  },
  {
    id: 'o6', orderId: 'ORD-2026-0006', customerId: 'c4', customerName: 'Sneha Patel',
    customerPhone: '+91 65432 10987', customerAddress: '23, Gachibowli',
    items: [
      { menuItemId: 'm2', name: 'Paneer Tikka', price: 260, quantity: 1, vegStatus: 'veg' },
      { menuItemId: 'm22', name: 'Veg Biryani', price: 220, quantity: 1, vegStatus: 'veg' },
      { menuItemId: 'm31', name: 'Rasmalai', price: 110, quantity: 1, vegStatus: 'veg' },
      { menuItemId: 'm35', name: 'Sweet Lassi', price: 80, quantity: 2, vegStatus: 'veg' },
    ],
    subtotal: 750, cgst: 18.75, sgst: 18.75, discount: 0, deliveryCharge: 40, grandTotal: 827.5,
    status: 'cancelled', paymentMode: 'card', paymentStatus: 'unpaid',
    orderDate: '2026-07-19', orderTime: '19:45',
  },
  {
    id: 'o7', orderId: 'ORD-2026-0007', customerId: 'c7', customerName: 'Vikram Singh',
    customerPhone: '+91 32109 87654', customerAddress: '34, Kukatpally',
    items: [
      { menuItemId: 'm12', name: 'Butter Chicken', price: 340, quantity: 1, vegStatus: 'non-veg' },
      { menuItemId: 'm27', name: 'Garlic Naan', price: 55, quantity: 3, vegStatus: 'veg' },
      { menuItemId: 'm34', name: 'Mango Lassi', price: 100, quantity: 1, vegStatus: 'veg' },
    ],
    subtotal: 605, cgst: 15.13, sgst: 15.13, discount: 0, deliveryCharge: 40, grandTotal: 675.25,
    status: 'delivered', paymentMode: 'upi', paymentStatus: 'paid',
    orderDate: '2026-07-19', orderTime: '20:15', deliveredAt: '21:00',
  },
  {
    id: 'o8', orderId: 'ORD-2026-0008', customerId: 'c8', customerName: 'Divya Nair',
    customerPhone: '+91 21098 76543', customerAddress: '67, Kondapur',
    items: [
      { menuItemId: 'm6', name: 'Masala Dosa', price: 120, quantity: 2, vegStatus: 'veg' },
      { menuItemId: 'm7', name: 'Idli', price: 80, quantity: 1, vegStatus: 'veg' },
      { menuItemId: 'm36', name: 'Filter Coffee', price: 60, quantity: 2, vegStatus: 'veg' },
    ],
    subtotal: 440, cgst: 11, sgst: 11, discount: 0, deliveryCharge: 40, grandTotal: 502,
    status: 'delivered', paymentMode: 'cash', paymentStatus: 'paid',
    orderDate: '2026-07-19', orderTime: '09:00', deliveredAt: '09:35', tableNumber: 3,
  },
];

// ──────────────────────────────────────────
// RESERVATIONS
// ──────────────────────────────────────────
export const reservations: Reservation[] = [
  {
    id: 'r1', customerName: 'Rahul Sharma', customerPhone: '+91 98765 43210',
    email: 'rahul.sharma@email.com', guests: 4, date: '2026-07-21', time: '7:30 PM',
    tableNumber: 5, status: 'confirmed', specialRequest: 'Window seat preferred',
    createdAt: '2026-07-18T10:30:00Z',
  },
  {
    id: 'r2', customerName: 'Priya Reddy', customerPhone: '+91 87654 32109',
    email: 'priya.reddy@email.com', guests: 2, date: '2026-07-21', time: '8:00 PM',
    tableNumber: 2, status: 'confirmed', specialRequest: 'Anniversary celebration',
    createdAt: '2026-07-19T14:15:00Z',
  },
  {
    id: 'r3', customerName: 'Mohan Das', customerPhone: '+91 90123 45678',
    email: 'mohan.das@email.com', guests: 8, date: '2026-07-22', time: '1:00 PM',
    status: 'pending', specialRequest: 'Vegetarian only. Need high chair for baby.',
    createdAt: '2026-07-20T08:00:00Z',
  },
  {
    id: 'r4', customerName: 'Sunita Rao', customerPhone: '+91 89012 34567',
    email: 'sunita.rao@email.com', guests: 6, date: '2026-07-20', time: '7:00 PM',
    tableNumber: 9, status: 'completed', specialRequest: '',
    createdAt: '2026-07-17T16:45:00Z',
  },
  {
    id: 'r5', customerName: 'Arjun Kumar', customerPhone: '+91 76543 21098',
    email: 'arjun.kumar@email.com', guests: 3, date: '2026-07-23', time: '8:30 PM',
    status: 'pending', specialRequest: 'Quiet corner table please',
    createdAt: '2026-07-20T09:00:00Z',
  },
  {
    id: 'r6', customerName: 'Ayesha Khan', customerPhone: '+91 43210 98765',
    email: 'ayesha.khan@email.com', guests: 10, date: '2026-07-25', time: '12:30 PM',
    status: 'confirmed', specialRequest: 'Birthday party. Need decoration.',
    createdAt: '2026-07-19T11:00:00Z',
  },
  {
    id: 'r7', customerName: 'Ravi Kumar', customerPhone: '+91 78901 23456',
    email: 'ravi.kumar@email.com', guests: 2, date: '2026-07-19', time: '7:30 PM',
    status: 'cancelled', specialRequest: '',
    createdAt: '2026-07-16T13:00:00Z',
  },
];

// ──────────────────────────────────────────
// DAILY SALES (last 14 days)
// ──────────────────────────────────────────
export const dailySales: DailySales[] = [
  { date: 'Jul 7',  revenue: 38200, orders: 98,  customers: 72 },
  { date: 'Jul 8',  revenue: 42500, orders: 112, customers: 89 },
  { date: 'Jul 9',  revenue: 35800, orders: 94,  customers: 68 },
  { date: 'Jul 10', revenue: 51200, orders: 138, customers: 105 },
  { date: 'Jul 11', revenue: 48900, orders: 129, customers: 98 },
  { date: 'Jul 12', revenue: 62400, orders: 168, customers: 132 },
  { date: 'Jul 13', revenue: 71800, orders: 192, customers: 148 },
  { date: 'Jul 14', revenue: 44200, orders: 116, customers: 88 },
  { date: 'Jul 15', revenue: 46800, orders: 122, customers: 94 },
  { date: 'Jul 16', revenue: 39500, orders: 104, customers: 79 },
  { date: 'Jul 17', revenue: 53200, orders: 142, customers: 110 },
  { date: 'Jul 18', revenue: 58900, orders: 158, customers: 122 },
  { date: 'Jul 19', revenue: 67400, orders: 178, customers: 138 },
  { date: 'Jul 20', revenue: 48650, orders: 126, customers: 98 },
];

export const categoryRevenue = [
  { name: 'Biryani',       value: 38 },
  { name: 'North Indian',  value: 25 },
  { name: 'Tandoori',      value: 15 },
  { name: 'South Indian',  value: 10 },
  { name: 'Starters',      value: 7  },
  { name: 'Beverages',     value: 3  },
  { name: 'Desserts',      value: 2  },
];

// ──────────────────────────────────────────
// EMPLOYEES
// ──────────────────────────────────────────
export const employees: Employee[] = [
  { id: 'e1', name: 'Rajan Sharma', role: 'admin', phone: '+91 99887 76655',
    email: 'rajan@palapittaruchulu.in', joinDate: '2018-01-15', salary: 65000, avatar: 'RS', isActive: true, shift: 'morning' },
  { id: 'e2', name: 'Suresh Kumar', role: 'manager', phone: '+91 88776 65544',
    email: 'suresh@palapittaruchulu.in', joinDate: '2019-06-20', salary: 48000, avatar: 'SK', isActive: true, shift: 'morning' },
  { id: 'e3', name: 'Anita Reddy', role: 'cashier', phone: '+91 77665 54433',
    email: 'anita@palapittaruchulu.in', joinDate: '2021-03-10', salary: 28000, avatar: 'AR', isActive: true, shift: 'evening' },
  { id: 'e4', name: 'Chef Ramesh', role: 'chef', phone: '+91 66554 43322',
    email: 'ramesh@palapittaruchulu.in', joinDate: '2018-01-15', salary: 52000, avatar: 'CR', isActive: true, shift: 'morning' },
  { id: 'e5', name: 'Chef Pradeep', role: 'chef', phone: '+91 55443 32211',
    email: 'pradeep@palapittaruchulu.in', joinDate: '2020-08-25', salary: 45000, avatar: 'CP', isActive: true, shift: 'evening' },
  { id: 'e6', name: 'Kavya Nair', role: 'waiter', phone: '+91 44332 21100',
    email: 'kavya@palapittaruchulu.in', joinDate: '2022-05-14', salary: 22000, avatar: 'KN', isActive: true, shift: 'morning' },
  { id: 'e7', name: 'Deepak Singh', role: 'waiter', phone: '+91 33221 10099',
    email: 'deepak@palapittaruchulu.in', joinDate: '2023-02-01', salary: 22000, avatar: 'DS', isActive: false, shift: 'evening' },
  { id: 'e8', name: 'Pooja Verma', role: 'manager', phone: '+91 22110 99888',
    email: 'pooja@palapittaruchulu.in', joinDate: '2020-11-15', salary: 45000, avatar: 'PV', isActive: true, shift: 'night' },
];

// ──────────────────────────────────────────
// INVENTORY
// ──────────────────────────────────────────
export const inventory: InventoryItem[] = [
  { id: 'i1', name: 'Basmati Rice', quantity: 45, unit: 'kg', minQuantity: 20, lastUpdated: '2026-07-20', category: 'Grains', costPerUnit: 120 },
  { id: 'i2', name: 'Chicken', quantity: 18, unit: 'kg', minQuantity: 25, lastUpdated: '2026-07-20', category: 'Meat', costPerUnit: 280 },
  { id: 'i3', name: 'Paneer', quantity: 8, unit: 'kg', minQuantity: 10, lastUpdated: '2026-07-20', category: 'Dairy', costPerUnit: 380 },
  { id: 'i4', name: 'Tomatoes', quantity: 32, unit: 'kg', minQuantity: 15, lastUpdated: '2026-07-19', category: 'Vegetables', costPerUnit: 40 },
  { id: 'i5', name: 'Onions', quantity: 55, unit: 'kg', minQuantity: 20, lastUpdated: '2026-07-19', category: 'Vegetables', costPerUnit: 35 },
  { id: 'i6', name: 'Ghee', quantity: 5, unit: 'litre', minQuantity: 8, lastUpdated: '2026-07-18', category: 'Dairy', costPerUnit: 620 },
  { id: 'i7', name: 'Cooking Oil', quantity: 25, unit: 'litre', minQuantity: 10, lastUpdated: '2026-07-18', category: 'Oils', costPerUnit: 160 },
  { id: 'i8', name: 'Mutton', quantity: 6, unit: 'kg', minQuantity: 10, lastUpdated: '2026-07-20', category: 'Meat', costPerUnit: 750 },
  { id: 'i9', name: 'Saffron', quantity: 0.08, unit: 'kg', minQuantity: 0.05, lastUpdated: '2026-07-15', category: 'Spices', costPerUnit: 45000 },
  { id: 'i10', name: 'Butter', quantity: 3, unit: 'kg', minQuantity: 5, lastUpdated: '2026-07-20', category: 'Dairy', costPerUnit: 520 },
];

// ──────────────────────────────────────────
// REVIEWS
// ──────────────────────────────────────────
export const reviews: Review[] = [
  { id: 'rv1', customerName: 'Rahul Sharma', avatar: 'RS', rating: 5,
    comment: 'Absolutely divine Biryani! The dum-cooked rice with tender mutton was perfectly spiced. Service was warm and welcoming. Will definitely return!',
    date: 'July 18, 2026', dish: 'Mutton Dum Biryani' },
  { id: 'rv2', customerName: 'Priya Reddy', avatar: 'PR', rating: 5,
    comment: 'The Paneer Butter Masala here is hands down the best in Hyderabad. Creamy, rich and just the right amount of spice. The naan was perfectly soft.',
    date: 'July 15, 2026', dish: 'Paneer Butter Masala' },
  { id: 'rv3', customerName: 'Arjun Kumar', avatar: 'AK', rating: 4,
    comment: 'Great ambiance, authentic flavors. The Seekh Kebabs were smoky and juicy. Mango Lassi was a refreshing finish. Recommended for special occasions.',
    date: 'July 12, 2026', dish: 'Seekh Kebab' },
  { id: 'rv4', customerName: 'Sneha Patel', avatar: 'SP', rating: 5,
    comment: 'Visited for my birthday and the staff made it extra special. The food is consistently excellent. Masala Dosa was crispy and the sambar was brilliant!',
    date: 'July 10, 2026', dish: 'Masala Dosa' },
  { id: 'rv5', customerName: 'Ayesha Khan', avatar: 'AK', rating: 5,
    comment: 'Pala Pitta Ruchulu truly lives up to its name! The Butter Chicken was rich and velvety. The Rasmalai dessert was melt-in-mouth. Excellent dining experience.',
    date: 'July 8, 2026', dish: 'Butter Chicken' },
  { id: 'rv6', customerName: 'Vikram Singh', avatar: 'VS', rating: 4,
    comment: 'Solid North Indian cuisine with authentic spice profiles. The Dal Makhani tasted just like home. Good portions and fair pricing.',
    date: 'July 5, 2026', dish: 'Dal Makhani' },
];

// ──────────────────────────────────────────
// COUPONS
// ──────────────────────────────────────────
export const coupons: Coupon[] = [
  { code: 'ROYAL10', discount: 10, maxDiscount: 150, minOrder: 500, description: '10% off on orders above ₹500', isActive: true },
  { code: 'NEWUSER20', discount: 20, maxDiscount: 200, minOrder: 300, description: '20% off for new customers', isActive: true },
  { code: 'BIRYANI50', discount: 50, maxDiscount: 50, minOrder: 400, description: '₹50 off on Biryani orders', isActive: true },
  { code: 'FESTIVE15', discount: 15, maxDiscount: 250, minOrder: 800, description: '15% off for festive season', isActive: false },
];
