import mongoose from 'mongoose'
import { PCOIN, PCoinMessages } from '@/configs/pcoin-system'

const transactionHistorySchema = new mongoose.Schema({
    type: {
        // XĐ loại giao dịch là gì
        type: String,
        enum: Object.values(PCOIN.TRANSACTION_TYPES),
        required: true
    },
    status: {
        type: String,
        enum: Object.values(PCOIN.TRANSACTION_STATUS),
        default: PCOIN.TRANSACTION_STATUS.PENDING
    },
    amount: {
        // đại khái là tiền/ sao
        type: Number,
        required: true
    },
    balance_after: {  // Số dư sau giao dịch
        type: Number,
        required: true
    },
    from_user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',  // Reference to admin User model
        default: null
    },
    to_user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',  // Reference to admin User model
        required: true
    },
    post_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
        required: true
    },
    request_id: {  // ID của yêu cầu trao đổi/nhận quà
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'request_type'
    },
    request_type: {  // Model của yêu cầu (RequestsExchange hoặc RequestsReceive)
        type: String,
        enum: ['RequestsExchange', 'RequestsReceive'],
        required: function() {
            return this.request_id !== null
        }
    },
    approved_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        default: null
    },
    description: {
        type: String,
        default: function() {
            return PCoinMessages.TRANSACTION_DESCRIPTION[this.type]
        }
    },
    expires_at: {
        type: Date,
        default: function() {
            if (this.type.includes('LOCK')) {
                return new Date(Date.now() + PCOIN.CONFIG.TRANSACTION_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
            }
            return null
        }
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
})

// Indexes
transactionHistorySchema.index({ type: 1, status: 1 })
transactionHistorySchema.index({ from_user: 1, to_user: 1 })
transactionHistorySchema.index({ post_id: 1 })
transactionHistorySchema.index({ request_id: 1 })
transactionHistorySchema.index({ expires_at: 1 })
transactionHistorySchema.index({ created_at: -1 })  // Thêm index cho việc sắp xếp theo thời gian
transactionHistorySchema.index({ from_user: 1, created_at: -1 })

const TransactionHistory = mongoose.model('TransactionHistory', transactionHistorySchema)

export default TransactionHistory 