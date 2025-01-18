import Post from '@/models/client/post'
import RequestsReceive from '@/models/client/requests_receive'
import {abort} from '@/utils/helpers'
import aqp from 'api-query-params'

export async function create(requestBody) {
    // tạo mới thì những bài ex vẫn nằm đc ở đây => done
    const {post_id, user_req_id, contact_phone, contact_social_media, contact_address, reason_receive} =
        requestBody
    // Kiểm tra bài post tồn tại và đúng trạng thái
    const postIsValid = await Post.findOne({_id: requestBody.post_id, type: 'gift'})
    if (!postIsValid) {
        return abort(404, 'Bài post không tồn tại hoặc đây là bài trao đổi.')
    }
    // Kiểm tra xem người dùng đã gửi yêu cầu cho bài post này chưa
    const existingRequest = await RequestsReceive.findOne({
        post_id,
        user_req_id,
    })
    // Kiểm tra xem người yêu cầu có trùng với người đăng bài hay không
    if (postIsValid.user_id.toString() === user_req_id.toString()) {
        return abort(400, 'Bạn không thể gửi yêu cầu cho chính bài post này')
    }

    if (existingRequest) {
        return abort(400, 'Bạn đã gửi yêu cầu cho bài đăng của mình!')
    }

    // Tạo request mới
    const newRequest = new RequestsReceive({
        post_id,
        user_req_id,
        contact_phone,
        contact_social_media,
        contact_address,
        reason_receive,
        status: 'pending',
    })
    await newRequest.save()

    return newRequest
}

export const filter = async (qs, limit, current, req) => {
    const userId = req.currentUser._id
    // Tìm các bài post của user của người dăng
    const userPosts = await Post.find({
        user_id: userId,
        type: 'gift',
    })
    // console.log('userPosts : ', userPosts)
    let {filter} = aqp(qs)
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
    // console.log({sort, current, limit, q, filter})
    // console.log(userPosts.map((post) => post._id)) => tạo ra mảng mới chỉ lưu id thôi.
    // Lấy các yêu cầu nhận liên quan đến các bài post đó
    const receiveRequests = await RequestsReceive.find({
        post_id: {$in: userPosts.map((post) => post._id)},
        ...filter,
        // post_id: '6761a5a5eaa1e41fa5afbc45',
    })
        .skip((current - 1) * limit)
        .limit(limit)
        .sort(sort)
        .populate('post_id')
        .populate('user_req_id')
    // console.log('receiveRequests : ', receiveRequests)

    // Lấy danh sách post_id từ bài viết
    const postIds = userPosts.map((post) => post._id)

    // Đảm bảo `filter` chỉ chứa bản ghi của người dùng hiện tại
    const adjustedFilter = {
        ...filter,
        post_id: {$in: postIds}, // Chỉ lấy các bản ghi liên quan đến post của người dùng
    }

    // Đếm các tài liệu liên quan trong RequestsReceive
    const total = await RequestsReceive.countDocuments(adjustedFilter)
    return {total, current, limit, receiveRequests}
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
    // Trước khi phê duyệt nên đối status của bài Post
    const {_id, status} = req.body

    const postOld = await RequestsReceive.findOne({_id: _id}).lean()
    if (!postOld) {
        return abort(400, 'Không tìm thấy bài viết này')
    } else {
        // success
        await Post.updateMany({_id: postOld.post_id._id}, {status: 'inactive'})
    }
    if (!_id) {
        return abort(400, 'ID không được để trống')
    }
    if (!status) {
        return abort(400, 'Status không được để trống')
    }

    // success
    const request = await RequestsReceive.updateOne({_id: _id}, {status: status})

    if (!request) {
        return abort(400, 'Không tìm thấy document')
    }

    return request
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
