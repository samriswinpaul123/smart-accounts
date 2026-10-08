import mongoose from 'mongoose';

const apiKeySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  keyPrefix: {
    type: String,
    required: true
  },
  keyHash: {
    type: String,
    required: true
  },
  rawKey: {
    type: String,
    default: ''
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  permissions: {
    type: [String],
    default: ['read', 'write']
  },
  lastUsedAt: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const ApiKey = mongoose.model('ApiKey', apiKeySchema);
export default ApiKey;
