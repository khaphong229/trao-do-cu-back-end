import Notification from '@/models/client/notification'
import Post from '@/models/client/post'
import RequestsExchange from '@/models/client/requests_exchange'
import {abort} from '@/utils/helpers'
import aqp from 'api-query-params'

export async function create(requestBody) {
    const {
        post_id,
        user_req_id,
        title,
        description,
        contact_social_media,
        image_url,
        contact_phone,
        contact_address,
    } = requestBody

    // 1. Kiểm tra bài post tồn tại và đúng trạng thái (loại bài là 'exchange')
    const postIsValid = await Post.findOne({_id: post_id, type: 'exchange'})
    if (!postIsValid) {
        return abort(404, 'Bài post không tồn tại hoặc đây là bài cho nhận.')
    }

    // 2. Kiểm tra xem người dùng đã gửi yêu cầu cho bài post này chưa
    const existingRequest = await RequestsExchange.findOne({
        post_id,
        user_req_id,
    })

    // 3. Kiểm tra xem người yêu cầu có trùng với người đăng bài hay không
    if (postIsValid.user_id.toString() === user_req_id.toString()) {
        return abort(400, 'Bạn không thể gửi yêu cầu cho chính bài post của mình.')
    }

    if (existingRequest) {
        return abort(400, 'Bạn đã gửi yêu cầu cho bài post này')
    }

    // 4. Tạo yêu cầu trao đổi mới (RequestsExchange)
    const newExchangeRequest = new RequestsExchange({
        post_id,
        user_req_id,
        title,
        description,
        image_url,
        contact_phone,
        contact_social_media,
        contact_address,
        status: 'pending', // Trạng thái ban đầu là pending
        requestAt: new Date(), // Thời gian gửi yêu cầu
    })

    // Lưu yêu cầu trao đổi
    await newExchangeRequest.save()

    // 5. Tạo thông báo mới (Notification)
    //    - Người nhận thông báo: Chủ bài đăng (postIsValid.user_id)
    //    - Loại thông báo: 'request_exchange'
    //    - post_id: ID của bài đăng liên quan
    //    - source_id: _id của yêu cầu trao đổi vừa tạo
    //    - isRead: Mặc định là false => Vì user chưa đọc
    const newNotification = new Notification({
        user_id: postIsValid.user_id, // Chủ bài đăng nhận thông báo
        type: 'request_exchange', // Loại thông báo dành cho yêu cầu trao đổi
        post_id: post_id, // Liên kết với bài đăng
        source_id: newExchangeRequest._id, // Liên kết với bản ghi yêu cầu trao đổi
        isRead: false,
        source_model: 'RequestsExchange',
        created_at: new Date(),
        updated_at: new Date(),
    })

    // Lưu notification
    await newNotification.save()

    // 6. Trả về yêu cầu trao đổi mới được tạo
    return newExchangeRequest
}

export const filter = async (qs, limit, current, req) => {
    // Kiểm tra user hiện tại
    const userId = req.currentUser._id

    // Tìm các bài post của user hiện tại với type 'exchange'
    const userPosts = await Post.find({
        user_id: userId,
        type: 'exchange',
    })

    let {filter} = aqp(qs)
    const {statusPotsId} = filter // Lấy statusPotsId (đại diện cho status của post_id)
    delete filter.statusPotsId // Xóa statusPotsId khỏi filter chính để xử lý riêng
    delete filter.current
    delete filter.pageSize
    filter.isDeleted = false

    let {q} = filter
    delete filter.q
    if (q) {
        q = q ? {$regex: q, $options: 'i'} : null
        filter = {
            ...(q && {$or: [{title: q}, {description: q}]}),
        }
        filter.isDeleted = false
    }

    let {sort} = aqp(qs)
    if (isNaN(current) || current <= 0 || !Number.isInteger(current)) current = 1
    if (isNaN(limit) || limit <= 0 || !Number.isInteger(limit)) limit = 5
    if (!sort) sort = {created_at: -1}

    // Lấy các yêu cầu liên quan đến các bài post
    const exchangeRequests = await RequestsExchange.find({
        post_id: {$in: userPosts.map((post) => post._id)},
        ...filter,
    })
        .skip((current - 1) * limit)
        .limit(limit)
        .sort(sort)
        .populate({
            path: 'post_id',
            match: statusPotsId ? {status: statusPotsId} : {}, // Lọc thêm theo status nếu statusPotsId tồn tại
        })
        .populate('user_req_id')

    // Lọc các kết quả không có post_id sau khi populate
    const filteredExchangeRequests = exchangeRequests.filter((req) => req.post_id)

    // Đếm số tài liệu liên quan sau khi áp dụng điều kiện
    const total = await RequestsExchange.find({
        post_id: {$in: userPosts.map((post) => post._id)}, // Lọc theo các bài viết của user
        ...filter,
    })
        .populate({
            path: 'post_id',
            match: statusPotsId ? {status: statusPotsId} : {}, // Áp dụng bộ lọc statusPotsId
        })
        .then((docs) => docs.filter((doc) => doc.post_id).length) // Đếm các tài liệu có post_id hợp lệ

    return {total: filteredExchangeRequests, current, limit, exchangeRequests: filteredExchangeRequests}
}

export const filterMe = async (qs, limit, current, req) => {
    const userId = req.currentUser._id

    let {filter} = aqp(qs)
    delete filter.current
    delete filter.pageSize
    let {q} = filter
    delete filter.q

    if (q) {
        q = q ? {$regex: q, $options: 'i'} : null
        filter = {
            ...(q && {$or: [{contact_phone: q}, {contact_address: q}, {contact_social_media: q}]}),
        }
    }

    let {sort} = aqp(qs)
    if (isNaN(current) || current <= 0 || !Number.isInteger(current)) current = 1
    if (isNaN(limit) || limit <= 0 || !Number.isInteger(limit)) limit = 5
    if (!sort) sort = {created_at: -1}

    const requests = await RequestsExchange.find({
        user_req_id: userId,
        ...filter,
    })
        .skip((current - 1) * limit)
        .limit(limit)
        .sort(sort)
        .populate({
            path: 'post_id',
            populate: {
                path: 'user_id',
            },
        })
        .populate('user_req_id')

    const total = await RequestsExchange.countDocuments({
        user_req_id: userId,
        ...filter,
    })

    return {
        total,
        current,
        limit,
        requests,
    }
}

export const updateStatus = async (req) => {
    // Lấy _id và status từ body của request
    const {_id, status} = req.body

    // Kiểm tra các trường bắt buộc
    if (!_id) {
        return abort(400, 'ID không được để trống')
    }
    if (!status) {
        return abort(400, 'Status không được để trống')
    }

    // Tìm document yêu cầu trao đổi theo _id
    const requestDoc = await RequestsExchange.findOne({_id: _id}).lean()
    if (!requestDoc) {
        return abort(400, 'Không tìm thấy yêu cầu trao đổi')
    }

    // Nếu trạng thái được cập nhật thành "approved",
    // cập nhật trạng thái của bài post liên quan (ví dụ: set thành "inactive")
    if (status === 'accepted') {
        // Lưu ý: post_id có thể là ObjectId trực tiếp hoặc đã populate.
        // Ở đây chúng ta giả định post_id là ObjectId.
        await Post.updateOne({_id: requestDoc.post_id}, {status: 'inactive'})
    }

    // Cập nhật trạng thái của yêu cầu trao đổi
    const updateResult = await RequestsExchange.updateOne({_id: _id}, {status: status})
    if (!updateResult) {
        return abort(400, 'Không tìm thấy document')
    }

    // Nếu trạng thái được cập nhật là "accepted", tạo mới thông báo cho người gửi yêu cầu.
    // Ở giai đoạn này, thông báo sẽ được gửi đến người đi xin (user_req_id)
    if (status === 'accepted') {
        const newNotification = new Notification({
            // Người nhận thông báo là người gửi yêu cầu (user_req_id)
            user_id: requestDoc.user_req_id,
            // Loại thông báo cho việc duyệt yêu cầu trao đổi
            type: 'approve_exchange',
            source_model: 'RequestsExchange',
            // Liên kết thông báo với bài post liên quan
            post_id: requestDoc.post_id,
            // Lưu trữ ID của yêu cầu trao đổi đã được duyệt
            source_id: _id,
            // Mặc định thông báo chưa được đọc
            isRead: false,
            // Thiết lập thời gian tạo và cập nhật
            created_at: new Date(),
            updated_at: new Date(),
        })
        await newNotification.save()
    }

    // Trả về kết quả cập nhật (có thể là một object chứa thông tin về số lượng document được cập nhật)
    return updateResult
}

// Xóa bản ghi
export const remove = async (_id) => {
    if (!_id) {
        return abort(400, 'ID không được để trống')
    }

    const request = await RequestsExchange.findByIdAndDelete(_id)

    if (!request) {
        return abort(400, 'Không tìm thấy document')
    }

    return request
}
