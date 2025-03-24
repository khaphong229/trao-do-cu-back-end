import Notification from '@/models/client/notification'
import Post from '@/models/client/post'
import RequestsReceive from '@/models/client/requests_receive'
import {abort} from '@/utils/helpers'
import aqp from 'api-query-params'
import { generateTransactionQR } from './qrcode.service'
import * as pcoinService from '@/app/services/client/pcoin.service'

export async function create(requestBody, pcoinRequired = 0) {
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
        return abort(400, 'Bạn không thể gửi yêu cầu cho chính sản phẩm của mình.')
    }

    if (existingRequest) {
        return abort(400, 'Bạn đã gửi yêu cầu cho bài đăng này!')
    }

    // Kiểm tra và cập nhật số lượt yêu cầu
    if (postIsValid.display_request_count === 0) {
        // Lần đầu có request: random 3-7 + 1
        const randomRequests = Math.floor(Math.random() * 5) + 3
        await Post.findByIdAndUpdate(post_id, {
            display_request_count: randomRequests + 1,
            actual_request_count: 1
        })
    } else {
        // Có request rồi: tăng cả 2 số
        await Post.findByIdAndUpdate(post_id, {
            $inc: { 
                display_request_count: 1,
                actual_request_count: 1 
            }
        })
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
        pcoin_amount_block: pcoinRequired // Lưu số P-Coin yêu cầu
    })
    
    try {
        // Lưu yêu cầu trước để có ID cho transaction
        await newRequest.save()
        
        // Nếu có yêu cầu P-Coin, khóa P-Coin của người gửi yêu cầu
        if (pcoinRequired > 0) {
            await pcoinService.handleRequestLock(
                user_req_id,
                post_id,
                newRequest._id,
                'RequestsReceive',
                pcoinRequired
            )
        }
        
        // 5. Tạo mới thông báo (Notification) cho chủ bài đăng
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
    } catch (error) {
        // Nếu có lỗi, xóa yêu cầu đã tạo (nếu có)
        if (newRequest._id) {
            await RequestsReceive.findByIdAndDelete(newRequest._id)
        }
        throw error
    }
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
        // .select('-contact_phone -contact_address') // Loại bỏ các trường nhạy cảm
        .skip((current - 1) * limit)
        .limit(limit)
        .sort(sort)
        .populate({
            path: 'post_id',
            match: statusPotsId ? {status: statusPotsId} : {}, // Lọc thêm theo status nếu statusPotsId tồn tại
            select: '_id title description type status image_url itemCode'
        })
        .populate({
            path: 'user_req_id',
            select: '_id name avatar status isGoogle'
        })

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
        .select('-contact_phone -contact_address') // Loại bỏ các trường nhạy cảm
        .skip((current - 1) * limit)
        .limit(limit)
        .sort(sort)
        .populate({
            path: 'post_id',
            select: '_id title description type status image_url itemCode',
            populate: {
                path: 'user_id',
                select: '_id name avatar status isGoogle'
            }
        })
        .populate({
            path: 'user_req_id',
            select: '_id name avatar status isGoogle'
        })

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
        .select('-contact_phone -contact_address') // Loại bỏ các trường nhạy cảm
        .populate({
            path: 'post_id',
            select: '_id title description type status image_url itemCode category_id user_id',
            populate: [
                { path: 'category_id', select: '_id name' },
                { path: 'user_id', select: '_id name avatar status isGoogle' }
            ]
        })
        .populate({
            path: 'user_req_id',
            select: '_id name avatar status isGoogle'
        })
        .lean()

    if (!requestDoc) {
        abort(404, 'Không tìm thấy yêu cầu nhận quà tặng')
    }

    // Kiểm tra các trường quan trọng
    if (!requestDoc.post_id || !requestDoc.post_id._id) {
        abort(400, 'Bài đăng không tồn tại hoặc đã bị xóa')
    }
    
    if (!requestDoc.user_req_id || !requestDoc.user_req_id._id) {
        abort(400, 'Người gửi yêu cầu không tồn tại hoặc đã bị xóa')
    }

    // Xử lý P-Coin dựa trên trạng thái mới
    const pcoinAmount = requestDoc.pcoin_amount_block || 0
    
    // Nếu trạng thái được cập nhật thành "accepted"
    if (status === 'accepted') {
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
                name: requestDoc.post_id.category_id?.name || 'Không xác định'
            },
            receiver: requestDoc.user_req_id.name || 'Không xác định',
            phone_user_req: requestDoc.contact_phone || 'Không xác định',
            transactionType: 'gift',
            completedAt: new Date().toISOString()
        }
        
        // 4. Tạo QR code
        const qrCodeUrl = await generateTransactionQR(qrData)
        
        // 5. Cập nhật URL QR code vào Request
        await RequestsReceive.findByIdAndUpdate(_id, { 
            status: status,
            qrCode: qrCodeUrl 
        })

        // 6. Xử lý P-Coin nếu có
        if (pcoinAmount > 0) {
            // Hoàn tất giao dịch P-Coin - chuyển từ ví khóa sang chủ bài đăng
            await pcoinService.handleTransactionComplete(
                requestDoc.user_req_id._id,
                requestDoc.post_id._id,
                requestDoc._id,
                'RequestsReceive',
                pcoinAmount
            )
        }
        
        // 7. Tạo thông báo cho người gửi yêu cầu
        const newNotification = new Notification({
            user_id: requestDoc.user_req_id._id, // Sử dụng _id thay vì đối tượng
            type: 'approve_receive',
            source_model: 'RequestsReceive',
            post_id: requestDoc.post_id._id,
            source_id: _id,
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
                'RequestsReceive',
                pcoinAmount
            )
        }
        
        // Cập nhật trạng thái
        await RequestsReceive.updateOne({_id: _id}, {status: status})
    } else {
        // Nếu không phải accepted/rejected/canceled, chỉ cập nhật status
        const updateResult = await RequestsReceive.updateOne({_id: _id}, {status: status})
        if (!updateResult) {
            abort(400, 'Không tìm thấy document')
        }
    }
    
    // Trả về thông tin cập nhật
    return {
        _id,
        status,
        message: `Đã cập nhật trạng thái thành ${status}`
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


// Hàm xử lí lấy ra nhận xét của user
export const getAllDisplayRequestsByUser = async (userId) => {
    if (!userId) {
        abort(400, 'ID người dùng không được để trống')
    }

    // 1. Tìm tất cả bài đăng của user
    const userPosts = await Post.find({
        user_id: userId,
        type: 'gift',
    })

    if (!userPosts.length) {
        return {
            total: 0,
            
        }
    }

    // 2. Lấy tổng số requests
    const total = await RequestsReceive.countDocuments({
        post_id: { $in: userPosts.map(post => post._id) },
    })

    // // 3. Lấy requests có phân trang
    // const requests = await RequestsReceive.find({
    //     post_id: { $in: userPosts.map(post => post._id) },
    // })
    //     .populate({
    //         path: 'post_id',
    //         select: 'title type status'
    //     })
    //     .populate('user_req_id', 'name email')
    //     .sort({ created_at: -1 })
    //     .skip((page - 1) * limit)
    //     .limit(limit)

    return {
        total,
        
      
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

// Hàm xử lí lấy ra số lượt yêu cầu của bài viết để hiển thị trên mocup sau khi người dùng đã request
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
