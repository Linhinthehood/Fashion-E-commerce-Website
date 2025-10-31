// backend/order-service/utils/exportDatabase.js
// Export Orders and Carts collections to JSON files

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
// Load environment variables from ../.env if present
try {
  require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
} catch (_) {}

const Order = require('../models/Order');
const Cart = require('../models/Cart');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [key, ...rest] = a.replace(/^--/, '').split('=');
      const value = rest.length ? rest.join('=') : argv[i + 1]?.startsWith('--') ? true : argv[++i];
      args[key] = value;
    }
  }
  return args;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function toDateOrNull(input) {
  if (!input) return null;
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

function safeWriteJSON(filePath, data, pretty) {
  const json = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  fs.writeFileSync(filePath, json, 'utf8');
}

(async () => {
  const {
    out = './exports',
    uri,
    pretty = 'true',
    startDate,
    endDate,
    includeCarts = 'true',
    includeOrders = 'true'
  } = parseArgs(process.argv);

  // Determine effective MongoDB URI with precedence: CLI --uri > env MONGODB_URI > default from env.example
  const defaultUri = 'mongodb://localhost:27017/fashion_ecommerce_orders';
  const effectiveUri = uri || process.env.MONGODB_URI || defaultUri;

  if (!effectiveUri) {
    console.error('MONGODB_URI is required. Provide via env or --uri="mongodb://..."');
    process.exit(1);
  }

  const exportRoot = path.resolve(out);
  ensureDir(exportRoot);

  const startedAt = new Date();
  console.log(`Starting export at ${startedAt.toISOString()}`);
  // redact credentials when logging uri
  const redacted = String(effectiveUri).replace(/:\/\/([^:@]+):([^@]+)@/,'://$1:***@');
  console.log(`Connecting to: ${redacted}`);

  try {
    await mongoose.connect(effectiveUri, { useNewUrlParser: true, useUnifiedTopology: true });

    const prettyBool = String(pretty).toLowerCase() === 'true';
    const includeCartsBool = String(includeCarts).toLowerCase() === 'true';
    const includeOrdersBool = String(includeOrders).toLowerCase() === 'true';

    const start = toDateOrNull(startDate);
    const end = toDateOrNull(endDate);

    const dateFilter = {};
    if (start || end) {
      dateFilter.createdAt = {};
      if (start) dateFilter.createdAt.$gte = start;
      if (end) dateFilter.createdAt.$lte = end;
    }

    const results = {
      meta: {
        service: 'order-service',
        startedAt: startedAt.toISOString(),
        filters: {
          startDate: start ? start.toISOString() : null,
          endDate: end ? end.toISOString() : null
        }
      },
      files: {},
      counts: {}
    };

    // Export Orders
    if (includeOrdersBool) {
      console.log('Exporting Orders...');
      const orderQuery = Object.keys(dateFilter).length ? dateFilter : {};
      const orders = await Order.find(orderQuery).lean().exec();
      const ordersFile = path.join(exportRoot, `orders-${Date.now()}.json`);
      safeWriteJSON(ordersFile, orders, prettyBool);
      results.files.orders = ordersFile;
      results.counts.orders = orders.length;
      console.log(`Orders exported: ${orders.length} → ${ordersFile}`);
    }

    // Export Carts
    if (includeCartsBool) {
      console.log('Exporting Carts...');
      const cartQuery = Object.keys(dateFilter).length ? dateFilter : {};
      const carts = await Cart.find(cartQuery).lean().exec();
      const cartsFile = path.join(exportRoot, `carts-${Date.now()}.json`);
      safeWriteJSON(cartsFile, carts, prettyBool);
      results.files.carts = cartsFile;
      results.counts.carts = carts.length;
      console.log(`Carts exported: ${carts.length} → ${cartsFile}`);
    }

    const finishedAt = new Date();
    results.meta.finishedAt = finishedAt.toISOString();
    results.meta.durationMs = finishedAt.getTime() - startedAt.getTime();

    const summaryFile = path.join(exportRoot, `export-summary.json`);
    safeWriteJSON(summaryFile, results, true);
    console.log(`Summary written → ${summaryFile}`);
    console.log('Export completed successfully.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Export failed:', err);
    try { await mongoose.disconnect(); } catch {}
    process.exit(1);
  }
})();