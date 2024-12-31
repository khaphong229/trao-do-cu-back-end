import requireAuthentication from '@/app/middleware/common/client/require-authentication'
import validate from '@/app/middleware/common/validate'
import * as giftRequest from '../../app/requests/client/req_receive.request'
import * as giftController from '../../app/controllers/client/reqGift.controller'
import * as giftMiddleware from '../../app/middleware/common/client/reqReceiveCheckId.middeware'
import {asyncHandler} from '@/utils/helpers'
import {Router} from 'express'

const giftRouter = Router()

// [POST] : /gifts
giftRouter.post(
    '/',
    asyncHandler(requireAuthentication),
    asyncHandler(validate(giftRequest.createReceiveRequestValidate)),
    asyncHandler(giftController.createPost)
)

// [GET] : /request_gift
giftRouter.get('/', asyncHandler(requireAuthentication), asyncHandler(giftController.readList))

// [GET] : /request_gift/me
giftRouter.get('/me', asyncHandler(requireAuthentication), asyncHandler(giftController.readListMe))

// [PATCH] : /request_gift?
giftRouter.patch('/', asyncHandler(requireAuthentication), asyncHandler(giftController.success))

// [DELETE] : /request_gift/:id
giftRouter.delete(
    '/:id',
    asyncHandler(giftMiddleware.checkId),
    asyncHandler(requireAuthentication),
    asyncHandler(giftController.deleted)
)

export default giftRouter
