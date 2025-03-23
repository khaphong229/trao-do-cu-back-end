import mongoose, {Schema} from 'mongoose'
import slugify from 'slugify'
import {PCOIN, PCoinHelpers, PCoinMessages} from '@/configs/pcoin-system'

// Tạo schema trước
const postSchema = new Schema(
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
        slug: {
            type: String,
            unique: true,
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
            default: false,
        },
        itemCode: {
            type: String,
            default: null,
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
                facebook: {type: String, default: ''},
                zalo: {type: String, default: ''},
                instagram: {type: String, default: ''},
            },
            default: {
                facebook: '',
                zalo: '',
                instagram: '',
            },
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
            default: '',
        },
        approvedAt: {
            type: Date,
            default: null,
        },
        pcoin_config: {
            reward_amount: {
                // Số P-Coin user nhận được khi post được duyệt
                type: Number,
                default: PCOIN.AMOUNTS.DEFAULT_POST_REWARD,
                validate: {
                    validator: PCoinHelpers.validatePostReward,
                    message: PCoinMessages.INVALID_POST_REWARD(),
                },
            },
            required_amount: {
                // Số P-Coin yêu cầu để xin bài
                type: Number,
                default: PCOIN.AMOUNTS.DEFAULT_REQUEST_COST,
                validate: {
                    validator: PCoinHelpers.validateRequiredAmount,
                    message: PCoinMessages.INVALID_REQUIRED_AMOUNT(),
                },
            },
        },
        display_request_count: {
            // Số hiển thị (đã cộng random)
            type: Number,
            default: 0,
        },
        actual_request_count: {
            // Số lượt yêu cầu thực tế
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
)

// Thêm middleware pre-save để tự động tạo slug
postSchema.pre('save', async function (next) {
    try {
        if (this.isModified('title')) {
            // Tạo slug từ title
            const baseSlug = slugify(this.title, {
                lower: true,
                strict: true,
                locale: 'vi',
            })

            let finalSlug = baseSlug
            let counter = 1

            // Kiểm tra slug tồn tại
            while (
                await mongoose.model('Post').findOne({
                    slug: finalSlug,
                    _id: {$ne: this._id},
                })
            ) {
                finalSlug = `${baseSlug}-${counter}`
                counter++
            }

            this.slug = finalSlug
        }
        next()
    } catch (error) {
        next(error)
    }
})

// Tạo và export model
const Post = mongoose.model('Post', postSchema, 'posts')
export default Post
