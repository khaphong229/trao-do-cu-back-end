import Joi from 'joi'
import mongoose from 'mongoose'
import {MAX_STRING_SIZE, VALIDATE_PHONE_REGEX} from '@/configs'

export const createExchangeRequestValidate = Joi.object({
    post_id: Joi.string()
        .custom((value, helpers) => {
            if (!mongoose.Types.ObjectId.isValid(value)) {
                return helpers.error('any.invalid')
            }
            return value
        })
        .required()
        .label('ID bài post'),

    user_req_id: Joi.string()
        .custom((value, helpers) => {
            if (!mongoose.Types.ObjectId.isValid(value)) {
                return helpers.error('any.invalid')
            }
            return value
        })
        .required()
        .label('ID người yêu cầu'),

    title: Joi.string().trim().max(MAX_STRING_SIZE).required().label('Tiêu đề yêu cầu trao đổi'),

    description: Joi.string()
        .trim()
        .max(MAX_STRING_SIZE)
        .optional()
        .allow('')
        .label('Mô tả yêu cầu trao đổi'),

    image_url: Joi.array()
        .items(Joi.string())
        .max(10) // Tối đa 5 ảnh
        // .optional()
        .required()
        .default([])
        .label('Đường dẫn ảnh'),

    contact_phone: Joi.string()
        .trim()
        .pattern(VALIDATE_PHONE_REGEX)
        .optional()
        .label('Số điện thoại liên hệ'),

    contact_social_media: Joi.object({
        facebook: Joi.string().uri().optional(),
        zalo: Joi.string().optional(),
        instagram: Joi.string().uri().optional(),
    })
        .optional()
        .allow('')
        .label('Danh sách liên kết mạng xã hội'),

    contact_address: Joi.string().trim().max(MAX_STRING_SIZE).optional().label('Địa chỉ liên hệ'),

    status: Joi.string()
        .valid('pending', 'accepted', 'rejected')
        .optional()
        .default('pending')
        .label('Trạng thái yêu cầu'),
})
    .custom((obj, helpers) => {
        const hasPhone = !!obj.contact_phone
        const hasSocialMedia =
            obj.contact_social_media &&
            (obj.contact_social_media.facebook ||
                obj.contact_social_media.zalo ||
                obj.contact_social_media.instagram)

        if (!hasPhone && !hasSocialMedia) {
            return helpers.error('custom.contact')
        }

        return obj
    })
    .messages({
        'custom.contact': 'Bạn phải cung cấp ít nhất một trong hai thông tin: Số điện thoại hoặc Mạng xã hội',
    })
