import dotenv from 'dotenv'
dotenv.config()

export default {
    siteKey: process.env.RECAPTCHA_SITE_KEY,
    secretKey: process.env.RECAPTCHA_SECRET_KEY
} 