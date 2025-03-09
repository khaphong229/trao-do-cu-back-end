import mongoose from 'mongoose'
import createModel from '../base'

const Post = createModel(
    'Post',
    'posts',
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: false,
        },
        type: {
            type: String,
            enum: ['gift', 'exchange'],
            required: true,
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
        },
        specificLocation: {
            type: String,
            required: true,
        },
        city: {
            type: String,
            required: true,
        },
        image_url: {
            type: [String],
            default: [],
        },
        contact_phone: {
            type: String,
        },
        contact_social_media: {
            type: {
                facebook: { type: String, default: '' },
                zalo: { type: String, default: '' },
                instagram: { type: String, default: '' }
            },
            default: {
                facebook: '',
                zalo: '',
                instagram: ''
            }
        },
        category_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            required: true,
        },
        created_at: {
            type: Date,
            default: Date.now,
        },
        updated_at: {
            type: Date,
            default: Date.now,
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
    },
    {}
)

export default Post
