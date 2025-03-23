import { recaptcha } from '@/configs'

export const getSiteKey = (req, res) => {
    // Đảm bảo biến môi trường RECAPTCHA_SITE_KEY đã được cấu hình
    const siteKey = process.env.RECAPTCHA_SITE_KEY
    
    if (!siteKey) {
        return res.status(500).json({
            success: false,
            message: 'reCAPTCHA site key not configured'
        })
    }
    
    return res.json({
        success: true,
        siteKey: siteKey
    })
} 