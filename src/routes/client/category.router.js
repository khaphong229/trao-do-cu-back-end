import requireAuthentication from '@/app/middleware/common/client/require-authentication'
import validate from '@/app/middleware/common/validate'
import {asyncHandler} from '@/utils/helpers'
import {Router} from 'express'
import * as categoryRequest from '../../app/requests/client/category.request'

const categoryRouter = Router()

categoryRouter.post(
    '/',
    asyncHandler(requireAuthentication),
    asyncHandler(validate(categoryRequest.getAllCategory))
)

categoryRouter.get(
    '/filter',
    // asyncHandler(requireAuthentication),
    asyncHandler(validate(categoryRequest.getAllCategory))
)

export default categoryRouter
