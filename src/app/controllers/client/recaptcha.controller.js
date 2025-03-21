import { recaptcha } from '@/configs'

export const getSiteKey = (req, res) => {
    res.jsonify({ siteKey: recaptcha.siteKey })
} 