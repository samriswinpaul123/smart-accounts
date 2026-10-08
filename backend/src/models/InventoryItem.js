import mongoose from 'mongoose';

const inventoryItemSchema = new mongoose.Schema({
  sku: {
    type: String,
    required: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    default: 'Services & Products',
    trim: true
  },
  costPrice: {
    type: Number,
    required: true,
    validate: { validator: Number.isInteger, message: '{VALUE} must be integer cents' }
  },
  sellingPrice: {
    type: Number,
    required: true,
    validate: { validator: Number.isInteger, message: '{VALUE} must be integer cents' }
  },
  stockQuantity: {
    type: Number,
    default: 100,
    required: true
  },
  reorderLevel: {
    type: Number,
    default: 15
  },
  unit: {
    type: String,
    default: 'Nos'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

inventoryItemSchema.index({ user: 1, sku: 1 }, { unique: true });

const InventoryItem = mongoose.model('InventoryItem', inventoryItemSchema);
export default InventoryItem;
