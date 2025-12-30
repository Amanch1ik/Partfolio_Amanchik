import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import helmet from 'helmet';
import compression from 'compression';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure uploads dir
const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniq = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${path.basename(file.originalname, ext)}-${uniq}${ext}`);
  },
});
const upload = multer({ storage });

// In-memory stores
let users = [
  { id: 1, username: 'admin', email: 'admin@yessgo.org', role: 'admin' },
];
let partners = [
  { id: 1, name: 'Demo Partner', status: 'active', logo: null },
];
let products = [
  { id: 1, partnerId: 1, name: 'Product A', price: 100, image: null },
];
let orders = [
  {
    id: 1,
    partnerId: 1,
    transactionNumber: 'ORD-1001',
    status: 'pending',
    paymentStatus: 'pending',
    products: [{ productId: 1, productName: 'Product A', quantity: 1, price: 100, subtotal: 100 }],
    subtotal: 100,
    totalAmount: 100,
    createdAt: new Date().toISOString(),
  },
];
let promotions = [
  { id: 1, title: 'Welcome Promo', active: true, startDate: new Date().toISOString(), endDate: null },
];
let settings = {
  siteName: 'Yess!Go Mock',
  maintenanceMode: false,
};

// Routes
app.post('/api/admin/auth/login', (req, res) => {
  const { Username, Password } = req.body;
  if (!Username) return res.status(400).json({ message: 'Missing Username' });
  // simple accept any password in mock
  const admin = users[0];
  return res.json({
    AccessToken: 'mock-access-token',
    Admin: { Id: admin.id, Email: admin.email, Role: admin.role },
  });
});

app.get('/api/admin/users', (req, res) => {
  const page = Number(req.query.page || 1);
  const page_size = Number(req.query.page_size || 20);
  res.json({ data: { items: users.slice(0, page_size), total: users.length, page, page_size } });
});

app.post('/api/admin/users', (req, res) => {
  const id = users.length + 1;
  const u = { id, ...req.body };
  users.push(u);
  res.status(201).json({ data: u });
});

app.get('/api/admin/partners', (req, res) => {
  const page = Number(req.query.page || 1);
  const page_size = Number(req.query.page_size || 20);
  res.json({ data: { items: partners.slice(0, page_size), total: partners.length, page, page_size } });
});

// Transactions endpoints (mock)
app.get('/api/admin/transactions', (req, res) => {
  const page = Number(req.query.page || 1);
  const page_size = Number(req.query.page_size || 20);
  // Build simple transaction objects from orders for the dashboard
  const transactions = orders.map((o) => ({
    id: o.id,
    amount: o.totalAmount ?? o.total_amount ?? o.totalAmount,
    currency: o.currency || 'сом',
    created_at: o.createdAt || o.created_at || new Date().toISOString(),
    status: o.status || 'pending',
    partnerId: o.partnerId,
    transactionNumber: o.transactionNumber,
  }));
  const start = (page - 1) * page_size;
  const paged = transactions.slice(start, start + page_size);
  res.json({ data: { items: paged, total: transactions.length, page, page_size } });
});

app.get('/api/admin/transactions/:id', (req, res) => {
  const id = Number(req.params.id);
  const o = orders.find((x) => x.id === id);
  if (!o) return res.status(404).json({ message: 'Not found' });
  const tx = {
    id: o.id,
    amount: o.totalAmount ?? o.total_amount ?? o.totalAmount,
    currency: o.currency || 'сом',
    created_at: o.createdAt || o.created_at || new Date().toISOString(),
    status: o.status || 'pending',
    partnerId: o.partnerId,
    transactionNumber: o.transactionNumber,
  };
  res.json({ data: tx });
});

app.post('/api/admin/partners', (req, res) => {
  const id = partners.length + 1;
  const p = { id, ...req.body };
  partners.push(p);
  res.status(201).json({ data: p });
});

// Products endpoints
app.get('/api/admin/partners/:partnerId/products', (req, res) => {
  const partnerId = Number(req.params.partnerId);
  const page = Number(req.query.page || 1);
  const page_size = Number(req.query.page_size || 20);
  const items = products.filter((p) => p.partnerId === partnerId);
  res.json({ data: { items: items.slice((page-1)*page_size, page*page_size), total: items.length, page, page_size } });
});

app.post('/api/admin/partners/:partnerId/products', (req, res) => {
  const partnerId = Number(req.params.partnerId);
  const id = products.length + 1;
  const p = { id, partnerId, ...req.body };
  products.push(p);
  res.status(201).json({ data: p });
});

app.put('/api/admin/partners/:partnerId/products/:productId', (req, res) => {
  const productId = Number(req.params.productId);
  const idx = products.findIndex((x) => x.id === productId);
  if (idx === -1) return res.status(404).json({ message: 'Not found' });
  products[idx] = { ...products[idx], ...req.body };
  res.json({ data: products[idx] });
});

app.delete('/api/admin/partners/:partnerId/products/:productId', (req, res) => {
  const productId = Number(req.params.productId);
  products = products.filter((x) => x.id !== productId);
  res.status(204).send();
});

// Orders endpoints
app.get('/api/admin/orders', (req, res) => {
  const page = Number(req.query.page || 1);
  const page_size = Number(req.query.page_size || 20);
  res.json({ data: { items: orders.slice((page-1)*page_size, page*page_size), total: orders.length, page, page_size } });
});

app.get('/api/admin/orders/:id', (req, res) => {
  const id = Number(req.params.id);
  const o = orders.find((x) => x.id === id);
  if (!o) return res.status(404).json({ message: 'Not found' });
  res.json({ data: o });
});

app.put('/api/admin/orders/:id/status', (req, res) => {
  const id = Number(req.params.id);
  const status = req.body.status;
  const o = orders.find((x) => x.id === id);
  if (!o) return res.status(404).json({ message: 'Not found' });
  o.status = status;
  res.json({ data: o });
});

// Promotions endpoints
app.get('/api/admin/promotions', (req, res) => {
  res.json({ data: { items: promotions, total: promotions.length } });
});

app.post('/api/admin/promotions', (req, res) => {
  const id = promotions.length + 1;
  const p = { id, ...req.body };
  promotions.push(p);
  res.status(201).json({ data: p });
});

app.put('/api/admin/promotions/:id', (req, res) => {
  const id = Number(req.params.id);
  const idx = promotions.findIndex((x) => x.id === id);
  if (idx === -1) return res.status(404).json({ message: 'Not found' });
  promotions[idx] = { ...promotions[idx], ...req.body };
  res.json({ data: promotions[idx] });
});

app.delete('/api/admin/promotions/:id', (req, res) => {
  const id = Number(req.params.id);
  promotions = promotions.filter((x) => x.id !== id);
  res.status(204).send();
});

// Settings endpoints
app.get('/api/admin/settings', (req, res) => {
  res.json({ data: settings });
});

app.put('/api/admin/settings', (req, res) => {
  settings = { ...settings, ...req.body };
  res.json({ data: settings });
});

app.post('/api/upload/partner/logo/:partnerId', upload.single('file'), (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ message: 'No file uploaded' });
  const partnerId = Number(req.params.partnerId);
  const partner = partners.find((p) => p.id === partnerId);
  const publicUrl = `/uploads/${path.basename(file.path)}`;
  if (partner) partner.logo = publicUrl;
  return res.json({ data: { logo_url: publicUrl } });
});

// Serve uploads
app.use('/uploads', express.static(uploadsDir));

// Generic fallback for other admin endpoints
app.use('/api/*', (req, res) => {
  res.json({ data: {}, message: 'Mock response' });
});

app.listen(PORT, () => {
  console.log(`Mock backend listening on http://localhost:${PORT}`);
});



