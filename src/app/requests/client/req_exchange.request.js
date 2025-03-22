import Joi from 'joi'
import mongoose from 'mongoose'
import {MAX_STRING_SIZE, MAX_STRING_SIZE_TEXT, VALIDATE_PHONE_REGEX} from '@/configs'

export const createExchangeRequestValidate = Joi.object({
    post_id: Joi.string()
        .custom((value, helpers) => {
            if (!mongoose.Types.ObjectId.isValid(value)) {
                return helpers.error('any.invalid')
            }
            return value
        })
        .required()
        .label('ID bài đăng'),

    user_req_id: Joi.string()
        .custom((value, helpers) => {
            if (!mongoose.Types.ObjectId.isValid(value)) {
                return helpers.error('any.invalid')
            }
            return value
        })
        .required()
        .label('ID người yêu cầu'),

    title: Joi.string().trim().max(MAX_STRING_SIZE).required().label('Tiêu đề sản phẩm trao đổi'),

    description: Joi.string()
        .trim()
        .max(MAX_STRING_SIZE_TEXT)
        .optional()
        .label('Mô tả sản phẩm trao đổi'),

    image_url: Joi.array()
        .items(Joi.string())
        .max(10) // Tối đa 10 ảnh
        .required()
        .min(1) // Yêu cầu ít nhất 1 ảnh
        .messages({
            'array.min': 'Vui lòng tải lên ít nhất 1 ảnh',
            'array.max': 'Chỉ được phép tải lên tối đa 10 ảnh',
            'array.base': 'Vui lòng tải lên ảnh',
            'any.required': 'Vui lòng tải lên ảnh'
        })
        .label('Đường dẫn ảnh sản phẩm trao đổi'),

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

    contact_address: Joi.string().trim().max(MAX_STRING_SIZE).allow('').optional().label('Địa chỉ liên hệ'),

    status: Joi.string()
        .valid('pending', 'accepted', 'rejected')
        .optional()
        .default('pending')
        .label('Trạng thái yêu cầu'),
})
    .custom((obj, helpers) => {
        const hasPhone = obj.contact_phone && obj.contact_phone.trim().length > 0
        const hasFacebook = obj.contact_social_media?.facebook && obj.contact_social_media.facebook.trim().length > 0
        
        if (!hasPhone && !hasFacebook) {
            return helpers.message('Vui lòng cung cấp ít nhất một thông tin liên hệ (Số điện thoại hoặc Facebook)')
        }
        
        return obj
    })
