import Notification from '@/models/client/notification'
import {abort} from '@/utils/helpers'
import aqp from 'api-query-params'

export const filter = async (qs, limit, current, req) => {
    // Sử dụng aqp để phân tích query string thành object filter
    let {filter} = aqp(qs)

    // Loại bỏ các trường phân trang khỏi filter
    delete filter.current
    delete filter.pageSize

    // Bắt buộc filter theo user hiện tại để chỉ trả về notifications của chính họ
    filter.user_id = req.currentUser._id

    // Xử lý tìm kiếm nếu có từ khóa (q)
    let {q} = filter
    delete filter.q
    if (q) {
        // Tạo điều kiện tìm kiếm dạng regex (không phân biệt hoa thường)
        q = {$regex: q, $options: 'i'}
        filter = {
            ...filter,
            ...(q && {$or: [{type: q}]}),
            // Ở đây bạn có thể mở rộng thêm các trường cần tìm kiếm trong Notification nếu cần
        }
    }

    // Lấy thông tin sắp xếp từ query string, nếu không có thì mặc định theo created_at giảm dần
    let {sort} = aqp(qs)
    if (isNaN(current) || current <= 0 || !Number.isInteger(current)) current = 1
    if (isNaN(limit) || limit <= 0 || !Number.isInteger(limit)) limit = 5
    if (!sort) sort = {created_at: -1}

    // Truy vấn danh sách notifications với filter, phân trang, sắp xếp và populate thông tin liên quan
    const data = await Notification.find(filter)
        .populate({
            path: 'post_id',
            select: 'title city image_url description type status itemCode contact_phone specificLocation contact_social_media',
            populate: {
                path: 'user_id',
                select: '_id name avatar status isGoogle phone',
            },
        })
        .populate({
            path: 'user_id',
            select: '_id name avatar status isGoogle phone',
        })
        .populate({
            path: 'source_id',
            select: 'user_req_id reason_receive contact_social_media status',
            populate: [
                {
                    path: 'user_req_id',
                    select: '_id name avatar status isGoogle phone',
                },
                {
                    path: 'post_id',
                    select: '_id title description type status image_url itemCode city contact_phone specificLocation contact_social_media'
                }
            ],
        })
        .skip((current - 1) * limit)
        .limit(limit)
        .sort(sort)
        .lean()

    // Xử lý kết quả để chỉ hiển thị thông tin liên hệ khi status là accepted
    const processedData = data.map(notification => {
        // Xử lý post_id nếu có
        if (notification.post_id) {
            // Nếu không có status hoặc status không phải là accepted, loại bỏ thông tin liên hệ
            if (!notification.post_id.status || notification.post_id.status !== 'accepted') {
                const { contact_phone, specificLocation, contact_social_media, ...restPostData } = notification.post_id
                notification.post_id = restPostData
            }
        }
        
        // Xử lý source_id nếu có và có post_id
        if (notification.source_id && notification.source_id.post_id) {
            // Nếu không có status hoặc status không phải là accepted, loại bỏ thông tin liên hệ
            if (!notification.source_id.status || notification.source_id.status !== 'accepted') {
                const { contact_phone, specificLocation, contact_social_media, ...restPostData } = notification.source_id.post_id
                notification.source_id.post_id = restPostData
            }
        }
        
        return notification
    })

    // Lấy tổng số notifications thỏa filter
    const total = await Notification.countDocuments(filter)
    
    return {total, current, limit, data: processedData}
}

export async function markNotificationAsRead(userId, notificationId) {
    const notification = await Notification.findOneAndUpdate(
        {_id: notificationId, user_id: userId},
        {isRead: true, updated_at: new Date()},
        {new: true} // Trả về document sau khi cập nhật
    )
    if (!notification) {
        return abort(400, 'Không có thông báo nào được tìm thấy!')
    }
    return notification
}

export async function markAllNotificationsAsRead(userId, res) {
    const result = await Notification.updateMany(
        {user_id: userId, isRead: false},
        {isRead: true, updated_at: new Date()}
    )
    if (result.modifiedCount === 0) {
        res.status(201).jsonify('Tất cả đã được đoc!')
    }
    return result
}
