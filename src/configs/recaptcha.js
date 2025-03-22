import dotenv from 'dotenv'
dotenv.config()

export const recaptcha = {
    siteKey: process.env.RECAPTCHA_SITE_KEY,
    secretKey: process.env.RECAPTCHA_SECRET_KEY
} 