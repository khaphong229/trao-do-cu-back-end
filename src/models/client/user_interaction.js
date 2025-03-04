import mongoose from 'mongoose'
import createModel from '../base'
import { enumTypeEvent } from '@/configs/enumDB'

const UserInteraction = createModel(
    'UserInteraction',
    'user_interactions',
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true 
        },
        interactions: [{
            event_type: {
                type: String,
                required: true,
                enum: enumTypeEvent
            },
            category: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Category',
                required: true
            },
            time_event: {
                type: Date,
                default: Date.now
            }
        }],
        date: {
            type: Date,
            default: Date.now, // Ngày của batch tương tác
            required: true
        },
        created_at: {
            type: Date,
            default: Date.now
        },
        updated_at: {
            type: Date,
            default: Date.now
        }
    },
    {
        // Thêm compound index cho user_id và date để tối ưu query thống kê
        indexes: [
            { user_id: 1, date: -1 },
            { 'interactions.category': 1, date: -1 }
        ]
    }
)

export default UserInteraction 