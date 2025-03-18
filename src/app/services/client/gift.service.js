import Notification from '@/models/client/notification'
import Post from '@/models/client/post'
import RequestsReceive from '@/models/client/requests_receive'
import {abort} from '@/utils/helpers'
import aqp from 'api-query-params'
import { generateTransactionQR } from './qrcode.service'
import { generateItemCode } from './item-code.service'

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
        source_model: 'RequestsReceive',
        isRead: false, // Mặc định thông báo chưa được đọc
        created_at: new Date(),
        updated_at: new Date(),
    })
    await newNotification.save()

    // 6. Trả về bản ghi yêu cầu nhận mới tạo
    return newRequest
}

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
        abort(400, 'ID không được để trống')
    }
    if (!status) {
        abort(400, 'Status không được để trống')
    }

    // Tìm bản ghi yêu cầu nhận đồ trong RequestsReceive theo _id và populate thông tin cần thiết
    const requestDoc = await RequestsReceive.findOne({_id: _id})
        .populate({
            path: 'post_id',
            populate: [
                { path: 'category_id' },
                { path: 'user_id' }
            ]
        })
        .populate('user_req_id')
        .lean()

    if (!requestDoc) {
        abort(404, 'Không tìm thấy yêu cầu nhận quà tặng')
    }

    // Nếu trạng thái được cập nhật thành "accepted"
    if (status === 'accepted') {
        // 1. Cập nhật trạng thái của bài post thành inactive
        await Post.updateOne({_id: requestDoc.post_id._id}, {status: 'inactive'})

        // 2. Tạo mã vật phẩm
        const itemCode = await generateItemCode(requestDoc.post_id.category_id._id)
        
        // 3. Cập nhật mã vật phẩm vào Post
        await Post.findByIdAndUpdate(requestDoc.post_id._id, { itemCode })
        
        // 4. Chuẩn bị dữ liệu cho QR code
        const qrData = {
            requestId: requestDoc._id.toString(),
            itemCode: itemCode,
            itemName: requestDoc.post_id.title,
            category: {
                name: requestDoc.post_id.category_id.name
            },
            owner: requestDoc.post_id.user_id.name,
            receiver: requestDoc.user_req_id.name,
            transactionType: 'gift', // Xác định đây là giao dịch trao tặng
            completedAt: new Date().toISOString()
        }
        
        // 5. Tạo QR code
        const qrCodeUrl = await generateTransactionQR(qrData)
        
        // 6. Cập nhật URL QR code vào Request
        await RequestsReceive.findByIdAndUpdate(_id, { 
            status: status,
            qrCode: qrCodeUrl 
        })

        // 7. Tạo thông báo cho người gửi yêu cầu
        const newNotification = new Notification({
            user_id: requestDoc.user_req_id._id,
            type: 'approve_receive',
            source_model: 'RequestsReceive',
            post_id: requestDoc.post_id._id,
            source_id: _id,
            isRead: false,
            created_at: new Date(),
            updated_at: new Date(),
        })
        await newNotification.save()
    } else {
        // Nếu không phải accepted, chỉ cập nhật status
        const updateResult = await RequestsReceive.updateOne({_id: _id}, {status: status})
        if (!updateResult) {
            abort(400, 'Không tìm thấy document')
        }
    }
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
