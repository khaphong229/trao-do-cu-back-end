import {Router} from 'express'
import * as userInterestController from '@/app/controllers/client/user_interest.controller'
import {updateInterestsValidate} from '@/app/requests/client/user_interest.request'
import requireAuthentication from '@/app/middleware/common/client/require-authentication'
import {asyncHandler} from '@/utils/helpers'
import validate from '@/app/middleware/common/validate'

const userInterestRouter = Router()

// [GET] /user-interests
// Lấy danh sách danh mục quan tâm của user hiện tại
userInterestRouter.get(
    '/',
    asyncHandler(requireAuthentication),
    asyncHandler(userInterestController.getInterests)
)

// [PUT] /user-interests
// Cập nhật danh sách danh mục quan tâm của user
userInterestRouter.put(
    '/',
    asyncHandler(requireAuthentication),
    asyncHandler(validate(updateInterestsValidate)),
    asyncHandler(userInterestController.updateInterests)
)

export default userInterestRouter 