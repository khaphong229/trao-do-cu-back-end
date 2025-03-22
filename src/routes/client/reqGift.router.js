// import { Router } from 'express'
// import requireAuthentication from '@/app/middleware/common/client/require-authentication'
// import validate from '@/app/middleware/common/validate'
// import * as reqGiftRequest from '@/app/requests/client/reqGift.request'
// import * as reqGiftController from '@/app/controllers/client/reqGift.controller'
// import { asyncHandler } from '@/utils/helpers'
// import { checkPCoinBalance } from '@/app/middleware/common/pcoin.middleware'

// const reqGiftRouter = Router()

// // Thêm middleware checkPCoinBalance vào route tạo yêu cầu
// reqGiftRouter.post(
//     '/',
//     asyncHandler(requireAuthentication),
//     asyncHandler(validate(reqGiftRequest.create)),
//     asyncHandler(checkPCoinBalance), // Thêm middleware kiểm tra P-Coin
//     asyncHandler(reqGiftController.createPost)
// )

// // Các routes khác giữ nguyên...

// export default reqGiftRouter 