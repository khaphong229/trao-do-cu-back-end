import Notification from '@/models/client/notification'
import Post from '@/models/client/post'
import RequestsReceive from '@/models/client/requests_receive'
import {abort} from '@/utils/helpers'
import aqp from 'api-query-params'

export async function create(requestBody) {
    // Lấy các thông tin cần thiết từ requestBody
    const {post_id, user_req_id, contact_phone, contact_social_media, contact_address, reason_receive} =
        requestBody

    // 1. Kiểm tra bài post tồn tại và đúng trạng thái: phải là bài cho 'gift'
    const postIsValid = await Post.findOne({_id: post_id, type: 'gift'})
    if (!postIsValid) {
        return abort(404, 'Bài post không tồn tại hoặc đây là bài trao đổi.')
    }

    // 2. Kiểm tra xem người dùng đã gửi yêu cầu cho bài post này chưa
    const existingRequest = await RequestsReceive.findOne({
        post_id,
        user_req_id,
    })

    // 3. Kiểm tra xem người yêu cầu có trùng với người đăng bài hay không
    if (postIsValid.user_id.toString() === user_req_id.toString()) {
        return abort(400, 'Bạn không thể gửi yêu cầu cho chính bài post này')
    }

    if (existingRequest) {
        return abort(400, 'Bạn đã gửi yêu cầu cho bài đăng của mình!')
    }

    // 4. Tạo mới yêu cầu nhận đồ (RequestsReceive)
    const newRequest = new RequestsReceive({
        post_id,
        user_req_id,
        contact_phone,
        contact_social_media,
        contact_address,
        reason_receive,
        status: 'pending', // Trạng thái ban đầu là pending
    })
    await newRequest.save()

    // 5. Tạo mới thông báo (Notification) cho chủ bài đăng
    //    - Người nhận thông báo: Chủ bài đăng (postIsValid.user_id)
    //    - Loại thông báo: 'request_receive' (yêu cầu nhận đồ)
    //    - post_id: Liên kết đến bài post
    //    - source_id: _id của yêu cầu nhận mới tạo (newRequest._id)
    const newNotification = new Notification({
        user_id: postIsValid.user_id, // Chủ bài đăng nhận thông báo
        type: 'request_receive', // Loại thông báo cho yêu cầu nhận đồ
        post_id: post_id, // Liên kết với bài post
        source_id: newRequest._id, // Liên kết đến yêu cầu nhận vừa tạo
        isRead: false, // Mặc định thông báo chưa được đọc
        created_at: new Date(),
        updated_at: new Date(),
    })
    await newNotification.save()

    // 6. Trả về bản ghi yêu cầu nhận mới tạo
    return newRequest
}

// export const filter = async (qs, limit, current, req) => {
//     const userId = req.currentUser._id
//     // Tìm các bài post của user của người dăng
//     const userPosts = await Post.find({
//         user_id: userId,
//         type: 'gift',
//     })
//     // console.log('userPosts : ', userPosts)
//     let {filter} = aqp(qs)
//     const {statusPotsId} = filter
//     delete filter.current
//     delete filter.pageSize
//     filter.isDeleted = false
//     let {q} = filter
//     delete filter.q
//     console.log('filter', filter)
//     if (q) {
//         q = q ? {$regex: q, $options: 'i'} : null
//         filter = {
//             ...(q && {$or: [{contact_phone: q}, {contact_address: q}, {contact_social_media: q}]}),
//         }
//         filter.isDeleted = false
//     }
//     let {sort} = aqp(qs)
//     if (isNaN(current) || current <= 0 || !Number.isInteger(current)) current = 1
//     if (isNaN(limit) || limit <= 0 || !Number.isInteger(limit)) limit = 5
//     if (!sort) sort = {created_at: -1}
//     // console.log({sort, current, limit, q, filter})
//     // console.log(userPosts.map((post) => post._id)) => tạo ra mảng mới chỉ lưu id thôi.
//     // Lấy các yêu cầu nhận liên quan đến các bài post đó
//     const receiveRequests = await RequestsReceive.find({
//         post_id: {$in: userPosts.map((post) => post._id)},
//         ...filter,
//         // post_id: '6761a5a5eaa1e41fa5afbc45',
//     })
//         .skip((current - 1) * limit)
//         .limit(limit)
//         .sort(sort)
//         .populate('post_id')
//         .populate('user_req_id')
//     // console.log('receiveRequests : ', receiveRequests)

//     // Lấy danh sách post_id từ bài viết
//     const postIds = userPosts.map((post) => post._id)

//     // Đảm bảo `filter` chỉ chứa bản ghi của người dùng hiện tại
//     const adjustedFilter = {
//         ...filter,
//         post_id: {$in: postIds}, // Chỉ lấy các bản ghi liên quan đến post của người dùng
//     }

//     // Đếm các tài liệu liên quan trong RequestsReceive
//     const total = await RequestsReceive.countDocuments(adjustedFilter)
//     return {total, current, limit, receiveRequests}
// }
export const filter = async (qs, limit, current, req) => {
    const userId = req.currentUser._id

    // Tìm các bài post của user hiện tại
    const userPosts = await Post.find({
        user_id: userId,
        type: 'gift',
    })

    // Lấy và xử lý filter từ qs
    let {filter} = aqp(qs)
    const {statusPotsId} = filter // Lấy statusPotsId từ filter
    delete filter.statusPotsId // Xóa statusPotsId khỏi filter chính để xử lý riêng
    delete filter.current
    delete filter.pageSize
    filter.isDeleted = false

    let {q} = filter
    delete filter.q
    if (q) {
        q = q ? {$regex: q, $options: 'i'} : null
        filter = {
            ...(q && {$or: [{contact_phone: q}, {contact_address: q}, {contact_social_media: q}]}),
        }
        filter.isDeleted = false
    }

    let {sort} = aqp(qs)
    if (isNaN(current) || current <= 0 || !Number.isInteger(current)) current = 1
    if (isNaN(limit) || limit <= 0 || !Number.isInteger(limit)) limit = 5
    if (!sort) sort = {created_at: -1}

    // Lấy các yêu cầu nhận liên quan đến các bài post
    const receiveRequests = await RequestsReceive.find({
        post_id: {$in: userPosts.map((post) => post._id)},
        ...filter, // Các điều kiện khác từ filter
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
    const filteredReceiveRequests = receiveRequests.filter((req) => req.post_id)

    // Đếm tổng số tài liệu liên quan trong RequestsReceive
    const total = await RequestsReceive.countDocuments({
        ...filter,
        post_id: {$in: userPosts.map((post) => post._id)}, // Không áp dụng status tại đây
    })

    return {total: filteredReceiveRequests.length, current, limit, receiveRequests: filteredReceiveRequests}
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

    const requests = await RequestsReceive.find({
        user_req_id: userId,
        ...filter,
    })
        .skip((current - 1) * limit)
        .limit(limit)
        .sort(sort)
        .populate({path: 'post_id', populate: {path: 'user_id'}})
        .populate('user_req_id')

    const total = await RequestsReceive.countDocuments({
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
    const {_id, status} = req.body

    // Kiểm tra bắt buộc: _id và status không được để trống
    if (!_id) {
        return abort(400, 'ID không được để trống')
    }
    if (!status) {
        return abort(400, 'Status không được để trống')
    }

    // Tìm bản ghi yêu cầu nhận đồ trong RequestsReceive theo _id
    const requestDoc = await RequestsReceive.findOne({_id: _id}).lean()
    if (!requestDoc) {
        return abort(400, 'Không tìm thấy bài viết này')
    } else {
        // Cập nhật trạng thái của bài post liên quan:
        // Nếu yêu cầu nhận được duyệt, bài post chuyển sang trạng thái "inactive"
        await Post.updateMany({_id: requestDoc.post_id}, {status: 'inactive'})
    }

    // Cập nhật trạng thái của yêu cầu nhận đồ
    const updateResult = await RequestsReceive.updateOne({_id: _id}, {status: status})
    if (!updateResult) {
        return abort(400, 'Không tìm thấy document')
    }

    // Nếu trạng thái mới là "accepted", tạo thông báo cho người gửi yêu cầu (user_req_id)
    if (status === 'accepted') {
        const newNotification = new Notification({
            // Người nhận thông báo là người đã gửi yêu cầu nhận đồ
            user_id: requestDoc.user_req_id,
            // Loại thông báo: approve_receive (chấp nhận yêu cầu nhận đồ)
            type: 'approve_receive',
            // Liên kết thông báo với bài post gốc
            post_id: requestDoc.post_id,
            // source_id là ID của yêu cầu nhận đồ đã được duyệt
            source_id: _id,
            // Mặc định thông báo chưa được đọc
            isRead: false,
            // Thiết lập thời gian tạo và cập nhật
            created_at: new Date(),
            updated_at: new Date(),
        })
        await newNotification.save()
    }

    return updateResult
}

// Xóa bản ghi
export const remove = async (_id) => {
    if (!_id) {
        return abort(400, 'ID không được để trống')
    }

    const request = await RequestsReceive.findByIdAndDelete(_id)

    if (!request) {
        return abort(400, 'Không tìm thấy document')
    }

    return request
}
