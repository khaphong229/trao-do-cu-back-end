import Notification from '@/models/client/notification'
import Post from '@/models/client/post'
import RequestsExchange from '@/models/client/requests_exchange'
import {abort} from '@/utils/helpers'
import aqp from 'api-query-params'
import { generateTransactionQR } from './qrcode.service'
import { generateItemCode } from './item-code.service'
import User from '@/models/admin/user'
import * as pcoinService from '@/app/services/client/pcoin.service'
import { PCOIN } from '@/configs/pcoin-system'

export async function create(requestBody, pcoinRequired = 0) {
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

    // Kiểm tra và cập nhật request_count
    if (postIsValid.request_count === 0) {
        // Nếu là request đầu tiên, random số từ 3-7
        const randomRequests = Math.floor(Math.random() * 5) + 3 // Random từ 3-7
        await Post.findByIdAndUpdate(post_id, {
            request_count: randomRequests + 1 // +1 cho request hiện tại
        })
    } else {
        // Nếu đã có request trước đó, chỉ +1
        await Post.findByIdAndUpdate(post_id, {
            $inc: { request_count: 1 }
        })
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
        pcoin_amount_block: pcoinRequired, // Lưu số P-Coin đã khóa (sửa tên trường)
    })

    // Lưu yêu cầu trao đổi
    await newExchangeRequest.save()

    // 5. Tạo thông báo mới (Notification)
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

    // Nếu có yêu cầu P-Coin, khóa P-Coin của người gửi yêu cầu
    if (pcoinRequired > 0) {
        try {
            await pcoinService.handleRequestLock(
                user_req_id,
                post_id,
                newExchangeRequest._id,
                'RequestsExchange',
                pcoinRequired
            )
        } catch (error) {
            // Nếu có lỗi khi khóa P-Coin, xóa yêu cầu đã tạo
            await RequestsExchange.findByIdAndDelete(newExchangeRequest._id)
            throw error
        }
    }

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

export async function updateStatus(req) {
    const { _id, status } = req.body
    
    // Kiểm tra _id và status
    if (!_id) {
        return abort(400, 'ID không được để trống')
    }
    
    if (!status) {
        return abort(400, 'Trạng thái không được để trống')
    }
    
    // Lấy thông tin chi tiết về yêu cầu trao đổi
    const requestDoc = await RequestsExchange.findById(_id)
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
        abort(404, 'Không tìm thấy yêu cầu trao đổi')
    }
    
    // Xử lý P-Coin dựa trên trạng thái mới
    const pcoinAmount = requestDoc.pcoin_amount_block || 0
    
    // Nếu trạng thái được cập nhật thành "accepted"
    if (status === 'accepted') {
        // Nếu có P-Coin bị khóa, chuyển từ ví khóa sang ví chính của chủ bài đăng
        if (pcoinAmount > 0) {
            await pcoinService.handleTransactionComplete(
                requestDoc.user_req_id._id, // trừ ví khóa của người gửi yêu cầu
                requestDoc.post_id._id,
                requestDoc._id,
                'RequestsExchange',
                pcoinAmount
            )
        }
        
        // 1. Cập nhật trạng thái của bài post thành inactive
        await Post.updateOne({_id: requestDoc.post_id._id}, {status: 'inactive'})
        
        // 2. Lấy mã vật phẩm từ post
        const itemCode = requestDoc.post_id.itemCode
        if (!itemCode) {
            abort(400, 'Bài viết chưa được admin duyệt hoặc chưa có mã vật phẩm')
        }
        
        // 3. Chuẩn bị dữ liệu cho QR code
        const qrData = {
            requestId: requestDoc._id.toString(),
            itemCode: itemCode,
            itemName: requestDoc.post_id.title,
            category: {
                name: requestDoc.post_id.category_id.name
            },
            receiver: requestDoc.user_req_id.name,
            phone_user_req: requestDoc.contact_phone,
            transactionType: 'exchange', // Xác định đây là giao dịch trao đổi
            completedAt: new Date().toISOString()
        }
        
        // 4. Tạo QR code
        const qrCodeUrl = await generateTransactionQR(qrData)
        
        // 5. Cập nhật URL QR code vào Request
        await RequestsExchange.findByIdAndUpdate(_id, { 
            status: status,
            qrCode: qrCodeUrl 
        })
        
        // 6. Tạo thông báo cho người gửi yêu cầu
        const newNotification = new Notification({
            // Người nhận thông báo là người gửi yêu cầu (user_req_id)
            user_id: requestDoc.user_req_id,
            // Loại thông báo cho việc duyệt yêu cầu trao đổi
            type: 'approve_exchange',
            // Liên kết thông báo với bài post liên quan
            source_model: 'RequestsExchange',
            // Lưu trữ ID của yêu cầu trao đổi đã được duyệt
            post_id: requestDoc.post_id._id,
            source_id: _id,
            // Mặc định thông báo chưa được đọc
            isRead: false,
            created_at: new Date(),
            updated_at: new Date(),
        })
        await newNotification.save()
    } else if (status === 'rejected' || status === 'canceled') {
        // Nếu từ chối hoặc hủy yêu cầu, hoàn trả P-Coin nếu có
        if (pcoinAmount > 0) {
            await pcoinService.handleRequestUnlock(
                requestDoc.user_req_id._id, // trả lại P-Coin cho người gửi yêu cầu
                requestDoc.post_id._id,
                requestDoc._id,
                'RequestsExchange',
                pcoinAmount
            )
        }
        
        // Cập nhật trạng thái
        await RequestsExchange.updateOne({_id: _id}, {status: status})
    } else {
        // Nếu không phải accepted/rejected/canceled, chỉ cập nhật status
        const updateResult = await RequestsExchange.updateOne({_id: _id}, {status: status})
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

    const request = await RequestsExchange.findByIdAndDelete(_id)

    if (!request) {
        return abort(400, 'Không tìm thấy document')
    }

    return request
}

export const getAllDisplayRequestsByUser = async (userId) => {
    if (!userId) {
        abort(400, 'ID người dùng không được để trống')
    }

    // 1. Tìm tất cả bài đăng của user
    const userPosts = await Post.find({
        user_id: userId,
        type: 'exchange',
    })

    if (!userPosts.length) {
        return {
            total: 0,
            requests: []
        }
    }

    // 2. Lấy tất cả yêu cầu trao đổi cho các bài đăng này
    const requests = await RequestsExchange.find({
        post_id: { $in: userPosts.map(post => post._id) },
    })
        .populate({
            path: 'post_id',
            select: 'title type status'
        })
        .populate('user_req_id', 'name email')
        .sort({ created_at: -1 })

    // 3. Tính toán total mới
    let total = requests.length
    if (total < 5) {
        // Nếu total < 5, thêm số random từ 5-10
        const additionalRequests = Math.floor(Math.random() * 6) + 5 // Random từ 5-10
        total += additionalRequests
    }

    return {
        total,
        actual_total: requests.length, // Giữ lại số thật để tham khảo
        requests: requests
    }
}

export const getRequestCountByPost = async (postId) => {
    const post = await Post.findById(postId)
    if (!post) {
        abort(404, 'Không tìm thấy bài viết')
    }

    return {
        display_request_count: post.display_request_count,
        actual_total: post.actual_request_count
    }
}

export const getRequestersCount = async (postId) => {
    const post = await Post.findById(postId)
    if (!post) {
        abort(404, 'Không tìm thấy bài viết')
    }

    // Nếu chỉ có 1 người yêu cầu (người dùng hiện tại), fake thêm 1 người nữa
    const othersCount = post.actual_request_count <= 1 ? 1 : post.actual_request_count - 1
    
    return {
        others_count: othersCount,
        message: `Bạn và ${othersCount} người khác cũng đang yêu cầu món đồ này`
    }
}
