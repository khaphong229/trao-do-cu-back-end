import * as postService from '../../services/client/post.service'

export async function createPost(req, res) {
    await postService.create(req.body, req)
    res.status(201).jsonify('Tạo mới bài đăng thành công. Bài đăng của bạn đang chờ admin duyệt.')
}

export async function createRePost(req, res) {
    await postService.createRePostSer(req.body, req)
    res.status(201).jsonify('Đăng lại bài thành công.')
}

// [GET] : /post?
export const readRoot = async (req, res) => {
    const limit = parseInt(req.query.pageSize)
    const current = parseInt(req.query.current)
    const result = await postService.filter(req.query, limit, current, req)
    res.jsonify(result)
}

// [GET] : /post-category?
export const readRootCategory = async (req, res) => {
    const limit = parseInt(req.query.pageSize)
    const current = parseInt(req.query.current)
    const result = await postService.filterCategory(req.query, limit, current, req)
    res.jsonify(result)
}

export const readRootMe = async (req, res) => {
    const limit = parseInt(req.query.pageSize)
    const current = parseInt(req.query.current)
    const result = await postService.filterMe(req.query, limit, current, req)
    res.jsonify(result)
}

// [GET] : /post/:id
export const detailPost = async (req, res) => {
    const result = await postService.details(req.params.id, req)
    res.jsonify(result)
}

export const readListPtit = async (req, res) => {
    const result = await postService.filterPtit(req.query, req.query.limit, req.query.current, req)
    res.json(result)
}

export const getPostDetail = async (req, res) => {
    const result = await postService.getPostDetail(req.params.id, req.currentUser._id)
    res.json(result)
}
