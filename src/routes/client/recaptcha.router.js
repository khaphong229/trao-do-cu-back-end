import { Router } from 'express'
import * as recaptchaController from '../../app/controllers/client/recaptcha.controller'

const recaptchaRouter = Router()

// [GET] : /recaptcha/site-key
recaptchaRouter.get('/site-key', (recaptchaController.getSiteKey))

export default recaptchaRouter 