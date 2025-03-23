// import * as giftService from '@/app/services/client/gift.service'

// export const create = async (req, res) => {
//     // Lấy số P-Coin yêu cầu từ middleware
//     const pcoinRequired = req.pcoinRequired || 0
    
//     // Thêm user_req_id vào request body
//     req.body.user_req_id = req.currentUser._id
    
//     const result = await giftService.create(req.body, pcoinRequired)
//     res.jsonify(result, 'Gửi yêu cầu nhận quà thành công')
// }

// // Các hàm khác giữ nguyên... 