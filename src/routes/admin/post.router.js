import express from 'express'
import * as postController from '@/app/controllers/admin/post.controller'
import * as postRequest from '@/app/requests/admin/post.request'
import requireAuthentication from '@/app/middleware/common/admin/require-authentication'
import { asyncHandler } from '@/utils/helpers'
import validate from '@/app/middleware/common/validate'

const postRouter = express.Router()

postRouter.use(asyncHandler(requireAuthentication))

// Lấy danh sách bài viết
postRouter.get(
    '/',
    // asyncHandler(validate(postRequest.readRoot)),
    asyncHandler(postController.readRoot)
)

// Cập nhật trạng thái duyệt bài viết
postRouter.patch(
    '/:id/approval',
    asyncHandler(validate(postRequest.updateApproval)),
    asyncHandler(postController.updateApproval)
)

export default postRouter
