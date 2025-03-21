import axios from 'axios'
import { abort } from '@/utils/helpers'
import { recaptcha } from '@/configs'

/**
 * Middleware xác thực reCAPTCHA
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware
 */
export const verifyRecaptcha = async (req, res, next) => {
    try {
        // Lấy token reCAPTCHA từ request body
        const { recaptchaToken } = req.body

        // Kiểm tra token có tồn tại không
        if (!recaptchaToken) {
            return abort(400, 'Vui lòng xác nhận bạn không phải là robot')
        }

        // Gửi request đến Google để xác thực token
        const response = await axios.post(
            'https://www.google.com/recaptcha/api/siteverify',
            null,
            {
                params: {
                    secret: recaptcha.secretKey,
                    response: recaptchaToken
                }
            }
        )

        // Kiểm tra kết quả xác thực
        if (!response.data.success) {
            console.log('reCAPTCHA verification failed:', response.data)
            return abort(400, 'Xác thực reCAPTCHA thất bại. Vui lòng thử lại.')
        }

        // Nếu xác thực thành công, tiếp tục xử lý request
        next()
    } catch (error) {
        console.error('reCAPTCHA verification error:', error)
        return abort(500, 'Có lỗi xảy ra khi xác thực reCAPTCHA')
    }
} 