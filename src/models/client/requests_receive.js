import mongoose from 'mongoose'
import createModel from '../base'

const RequestsReceive = createModel(
    'RequestsReceive',
    'requests_receive',
    {
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
        reason_receive: {
            type: String,
            required: false,
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
    },
    {}
)

export default RequestsReceive
