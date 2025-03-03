import requireAuthentication from '@/app/middleware/common/client/require-authentication'
import * as userInteractionRequest from '@/app/requests/client/user_interaction.request'
import * as userInteractionController from '@/app/controllers/client/user_interaction.controller'
import {asyncHandler} from '@/utils/helpers'
import {Router} from 'express'
import validate from '@/app/middleware/common/validate'

const userInteractionRouter = Router()

// [POST] : /user-interactions/batch
userInteractionRouter.post(
    '/batch',
    asyncHandler(requireAuthentication),
    asyncHandler(validate(userInteractionRequest.batchInteractionsValidate)),
    asyncHandler(userInteractionController.saveBatchInteractions)
)

// [GET] : /user-interactions/top-categories
userInteractionRouter.get(
    '/top-categories',
    asyncHandler(requireAuthentication),
    asyncHandler(userInteractionController.getTopCategories)
)

export default userInteractionRouter 