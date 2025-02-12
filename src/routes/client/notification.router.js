import requireAuthentication from '@/app/middleware/common/client/require-authentication'
import {asyncHandler} from '@/utils/helpers'
import {Router} from 'express'
import * as notificationController from '../../app/controllers/client/notification.controller'

const notificationRouter = Router()

// [GET] : /notifications
// Lấy danh sách notifications của user hiện tại (có phân trang, populate thông tin bài post nếu cần)
notificationRouter.get(
    '/',
    asyncHandler(requireAuthentication),
    asyncHandler(notificationController.readRoot)
)

// // [PUT] : /notifications/:id/read
// // Đánh dấu một notification là đã đọc
// notificationRouter.put(
//     '/:id/read',
//     asyncHandler(requireAuthentication),
//     asyncHandler(notificationController.markNotificationAsRead)
// )

// // [PUT] : /notifications/read-all
// // Đánh dấu tất cả notifications của user là đã đọc
// notificationRouter.put(
//     '/read-all',
//     asyncHandler(requireAuthentication),
//     asyncHandler(notificationController.markAllNotificationsAsRead)
// )

export default notificationRouter
