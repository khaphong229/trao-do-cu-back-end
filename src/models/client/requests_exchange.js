import mongoose from 'mongoose'
import createModel from '../base'

const RequestsExchange = createModel('RequestsExchange', 'requests_exchange', {
    post_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Post',
    },
    user_req_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    status: {
        type: String,
        default: 'pending',
        enum: ['pending', 'accepted', 'rejected'],
    },
    title: {
        type: String,
    },
    description: {
        type: String,
    },
    image_url: {
        type: [String],
    },
    requestAt: {type: Date, default: Date.now},
    contact_phone: {
        type: String,
    },
    contact_social_media: {
        type: mongoose.Schema.Types.Mixed,
    },
    contact_address: {
        type: String,
    },
    qrCode: {
        type: String,
        default: null,
    },
    deletedAt: Date,
    isDeleted: {
        type: Boolean,
        default: false,
    },
    pcoin_amount_block: {
        type: Number,
        default: 0
    },
})

export default RequestsExchange
