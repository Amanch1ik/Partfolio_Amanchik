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

app.post('/api/admin/partners', (req, res) => {
  const id = partners.length + 1;
  const p = { id, ...req.body };
  partners.push(p);
  res.status(201).json({ data: p });
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


