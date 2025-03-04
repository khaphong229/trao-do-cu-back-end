import mongoose from 'mongoose'
import createModel from '../base'

const UserInterest = createModel(
    'UserInterest',
    'user_interests',
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        interests: [
            {
                category_id: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Category',
                    required: true,
                },
                category_name: {
                    type: String,
                    required: true,
                },
                selected_at: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
        created_at: {
            type: Date,
            default: Date.now,
        },
        updated_at: {
            type: Date,
            default: Date.now,
        },
    },
    {
        // Thêm index cho user_id để tối ưu tìm kiếm
        indexes: [{ user_id: 1 }]
    }
)

export default UserInterest 