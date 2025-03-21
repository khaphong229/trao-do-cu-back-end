import {Router} from 'express'
import requireAuthentication from '@/app/middleware/common/client/require-authentication'
import validate from '@/app/middleware/common/validate'
import * as authMiddleware from '../../app/middleware/auth.middleware'
import * as authRequest from '../../app/requests/client/auth.request'
import * as authController from '../../app/controllers/client/auth.controller'
import {asyncHandler} from '@/utils/helpers'
import passport from 'passport'
import { verifyRecaptcha } from '@/app/middleware/common/recaptcha.middleware'

const authRouter = Router()

authRouter.post('/login', asyncHandler(validate(authRequest.login)), asyncHandler(authController.login))

authRouter.post(
    '/register',
    asyncHandler(validate(authRequest.register)),
    asyncHandler(verifyRecaptcha),
    asyncHandler(authController.register)
)

authRouter.post('/logout', asyncHandler(requireAuthentication), asyncHandler(authController.logout))

authRouter.get('/me', asyncHandler(requireAuthentication), asyncHandler(authController.me))

authRouter.put(
    '/me',
    asyncHandler(requireAuthentication),
    asyncHandler(validate(authRequest.updateProfile)),
    asyncHandler(authController.updateProfile)
)

authRouter.patch(
    '/change-password',
    asyncHandler(requireAuthentication),
    asyncHandler(validate(authRequest.changePassword)),
    asyncHandler(authController.changePassword)
)

authRouter.post(
    '/forgot-password',
    asyncHandler(validate(authRequest.forgotPassword)),
    authController.forgotPassword
)

authRouter.post(
    '/reset-password/:token',
    asyncHandler(authMiddleware.verifyForgotPasswordToken),
    asyncHandler(validate(authRequest.resetPassword)),
    asyncHandler(authController.resetPassword)
)

// Login GG
authRouter.get('/google', passport.authenticate('google', {scope: ['profile', 'email'], session: false}))

// authRouter.get(
//     '/google/callback',
//     (req, res, next) => {
//         passport.authenticate('google', (err, profile) => {
//             req.currentUser = profile
//             next()
//         })(req, res, next),
//         (req, res) => {
//             const url_Fe = `${process.env.APP_URL_CLIENT}/login-success/${req.currentUser?.id}`
//             res.redirect(url_Fe)
//         }
//     }

//     // function (req, res) {
//     //     // Successful authentication, redirect home.
//     //     res.redirect('/')
//     // }
// )
authRouter.get(
    '/google/callback',
    (req, res, next) => {
        passport.authenticate('google', (err, profile) => {
            req.currentUser = profile
            next()
        })(req, res, next)
    },
    (req, res) => {
        res.redirect(`${process.env.APP_URL_CLIENT}/login-success/${req.currentUser?.googleId}`)
    }
)

authRouter.post('/login-success', asyncHandler(authController.loginSuccess))

authRouter.post(
    '/update-default-address',
    asyncHandler(requireAuthentication),
    asyncHandler(validate(authRequest.updateDefaultAddress)),
    asyncHandler(authController.updateDefaultAddress)
)

export default authRouter
