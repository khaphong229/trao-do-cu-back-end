import mongoose from 'mongoose'
import createModel from '../base'
import {enumTypeNotification} from '@/configs/enumDB'

/**
 * Schema Notification:
 *
 * Mục đích: Lưu trữ thông tin thông báo được tạo ra khi có các sự kiện liên quan đến bài đăng,
 * ví dụ:
 *  - Giai đoạn 1 (Khi người dùng gửi yêu cầu):
 *      + 'request_receive': Thông báo gửi cho chủ bài đăng khi có người yêu cầu nhận đồ.
 *      + 'request_exchange': Thông báo gửi cho chủ bài đăng khi có người yêu cầu trao đổi đồ.
 *
 *  - Giai đoạn 2 (Khi chủ bài đăng duyệt yêu cầu):
 *      + 'approve_receive': Thông báo gửi về cho người yêu cầu nhận đồ khi bài của họ được duyệt.
 *      + 'approve_exchange': Thông báo gửi về cho người yêu cầu trao đổi đồ khi bài của họ được duyệt.
 *
 * Các trường chính:
 *  - user_id: ID của người nhận thông báo (chủ bài đăng hoặc người gửi yêu cầu).
 *  - type: Loại thông báo, phân biệt giữa yêu cầu và duyệt (approval).
 *  - post_id: ID của bài đăng liên quan.
 *  - source_id: Lưu trữ ID của document gốc kích hoạt thông báo.
 *               Ví dụ: Nếu là yêu cầu nhận đồ, source_id là _id của document trong bảng Request_receive.
 *  - isRead: Trạng thái đã đọc hay chưa của thông báo.
 *  - created_at, updated_at: Thời gian tạo và cập nhật thông báo.
 */
const Notification = createModel(
    'Notification', // Tên model: Notification
    'notifications', // Tên collection trong MongoDB: notifications
    {
        // user_id: ID của người nhận thông báo.
        // - Ở giai đoạn 1: Chủ bài đăng nhận thông báo khi có yêu cầu mới.
        // - Ở giai đoạn 2: Người gửi yêu cầu nhận thông báo khi bài của họ được duyệt.
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User', // Tham chiếu tới model User
            required: true,
        },
        // type: Loại thông báo xác định sự kiện kích hoạt.
        // Các giá trị:
        // - 'request_receive': Yêu cầu nhận đồ (giai đoạn 1)
        // - 'request_exchange': Yêu cầu trao đổi đồ (giai đoạn 1)
        // - 'approve_receive': Duyệt yêu cầu nhận đồ (giai đoạn 2)
        // - 'approve_exchange': Duyệt yêu cầu trao đổi đồ (giai đoạn 2)
        type: {
            type: String,
            enum: enumTypeNotification,
            required: true,
        },
        // post_id: ID của bài đăng liên quan đến sự kiện thông báo.
        // Giúp xác định bài đăng mà thông báo đề cập.
        post_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Post', // Tham chiếu tới model Post
            required: true,
        },
        // source_id: ID của document gốc kích hoạt thông báo.
        // - Nếu là yêu cầu nhận đồ: source_id là _id của document trong bảng Request_receive.
        // - Nếu là yêu cầu trao đổi: source_id là _id của document trong bảng Request_exchange.
        // Điều này giúp sau này có thể truy xuất chi tiết sự kiện gốc của thông báo.
        source_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        // isRead: Trạng thái đã đọc của thông báo.
        // Mặc định là false khi thông báo mới được tạo.
        isRead: {
            type: Boolean,
            default: false,
        },
        // created_at: Thời gian tạo thông báo.
        // Mặc định là thời điểm hiện tại khi bản ghi được tạo.
        created_at: {
            type: Date,
            default: Date.now,
        },
        // updated_at: Thời gian cập nhật thông báo.
        // Được cập nhật khi thông báo được chỉnh sửa (ví dụ: đánh dấu đã đọc).
        updated_at: {
            type: Date,
            default: Date.now,
        },
    },
    {} // Các options bổ sung nếu cần, hiện tại để trống.
)

export default Notification
