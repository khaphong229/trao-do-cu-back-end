import Joi from 'joi'
import {category_id_default, MAX_STRING_SIZE} from '@/configs'
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
        .max(5) // Tối đa 5 ảnh
        // .optional()
        .required()
        .default([])
        .label('Đường dẫn ảnh'),

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
