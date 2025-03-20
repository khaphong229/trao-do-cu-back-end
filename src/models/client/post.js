import mongoose, { Schema } from 'mongoose'
import createModel from '../base'
// import { PCOIN } from '../../config'
import { PCOIN, PCoinHelpers, PCoinMessages } from '@/configs/pcoin-system'

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
        isPtiterOnly: {
            type: Boolean,
            default: false
        },
        itemCode: {
            type: String,
            default: null
            // VD : DĐT-001, QA-002,...
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
        isApproved: {
            type: Boolean,
            default: false,
        },
        approvalReason: {
            type: String,
            default: ''
        },
        approvedAt: {
            type: Date,
            default: null
        },
        pcoin_config: {
            reward_amount: {  // Số P-Coin user nhận được khi post được duyệt
                type: Number,
                default: PCOIN.AMOUNTS.DEFAULT_POST_REWARD,
                validate: {
                    validator: PCoinHelpers.validatePostReward,
                    message: PCoinMessages.INVALID_POST_REWARD()
                }
            },
            required_amount: {  // Số P-Coin yêu cầu để tham gia
                type: Number,
                default: null,
                validate: {
                    validator: PCoinHelpers.validateRequiredAmount,
                    message: PCoinMessages.INVALID_REQUIRED_AMOUNT()
                }
            }
        }
    },
    {}
)

export default Post
