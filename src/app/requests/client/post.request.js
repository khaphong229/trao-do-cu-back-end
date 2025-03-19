import Joi from 'joi'
import {category_id_default, MAX_STRING_SIZE, VALIDATE_PHONE_REGEX} from '@/configs'
import mongoose from 'mongoose'

export const createPostValidate = Joi.object({
    title: Joi.string().trim().max(MAX_STRING_SIZE).required().label('Tiêu đề bài đăng'),

    description: Joi.string().trim().max(MAX_STRING_SIZE).allow('').optional().label('Mô tả bài đăng'),

    type: Joi.string().valid('gift', 'exchange').required().label('Loại bài đăng'),

    status: Joi.string()
        .valid('active', 'inactive')
        .optional()
        .default('active')
        .label('Trạng thái bài đăng'),

    specificLocation: Joi.string().trim().max(MAX_STRING_SIZE).required().label('Địa điểm cụ thể'),
    city: Joi.string().trim().max(MAX_STRING_SIZE).required().label('Thành phố'),

    image_url: Joi.array()
        .items(Joi.string())
        .max(9) // Tối đa 9 ảnh
        .required()
        .min(1) // Yêu cầu ít nhất 1 ảnh
        .messages({
            'array.min': 'Vui lòng tải lên ít nhất 1 ảnh',
            'array.max': 'Chỉ được phép tải lên tối đa 9 ảnh'
        })
        .label('Đường dẫn ảnh'),

    contact_phone: Joi.string()
        .trim()
        .pattern(VALIDATE_PHONE_REGEX)
        .allow('')
        .optional()
        .label('Số điện thoại liên hệ'),

    contact_social_media: Joi.object({
        facebook: Joi.string().uri().allow('').optional(),
        zalo: Joi.string().allow('').optional(),
        instagram: Joi.string().uri().allow('').optional(),
    })
        .optional()
        .default({}),

    category_id: Joi.string()
        .custom((value, helpers) => {
            if (value && !mongoose.Types.ObjectId.isValid(value)) {
                return helpers.error('any.invalid')
            }
            return value
        })
        .default(category_id_default) // Giá trị mặc định
        .optional()
        .label('ID danh mục'),
})
    .custom((obj, helpers) => {
    // Kiểm tra xem có ít nhất một trong hai thông tin liên hệ
        const hasPhone = obj.contact_phone && obj.contact_phone.trim().length > 0
        const hasFacebook = obj.contact_social_media && obj.contact_social_media.facebook && obj.contact_social_media.facebook.trim().length > 0
    
        if (!hasPhone && !hasFacebook) {
            throw new Error('Vui lòng cung cấp ít nhất một thông tin liên hệ (Số điện thoại hoặc Facebook)')
        }
    
        return obj
    })


export const getAllRequestedPostsByUserValidate = Joi.object({
    userId: Joi.string().required().label('ID người dùng')
})
