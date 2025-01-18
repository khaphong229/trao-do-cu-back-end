import mongoose from 'mongoose'
import createModel from '../base'
import {isDate} from 'lodash'

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
