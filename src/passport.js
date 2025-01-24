import {User} from './models'

require('dotenv').config()
const passport = require('passport') // Import thư viện passport
const GoogleStrategy = require('passport-google-oauth20').Strategy

// passport.use(
//     new GoogleStrategy(
//         {
//             clientID: process.env.GOOGLE_CLIENT_ID,
//             clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//             callbackURL: '/auth/google/callback',
//         },
//         async function (accessToken, refreshToken, profile, cb) {
//             // Thêm user vào dbs
//             console.log({accessToken, refreshToken, profile})
//             if(profile?.id){
//                 const res = await User.findO
//             }
//             return cb(null, profile)
//         }
//     )
// )
passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: '/auth/google/callback',
        },
        async function (accessToken, refreshToken, profile, cb) {
            try {
                console.log('Google profile:', {accessToken, refreshToken, profile})

                // Tìm user dựa trên googleId
                let user = await User.findOne({googleId: profile.id})

                // Nếu user chưa tồn tại, tạo mới
                if (!user) {
                    user = new User({
                        name: profile.displayName || 'Unknown', // Lấy tên từ profile Google
                        email: profile.emails?.[0]?.value || '', // Email nếu có
                        googleId: profile.id, // Lưu googleId
                        isGoogle: true, // Đánh dấu là tài khoản Google
                        avatar: profile.photos?.[0]?.value || '', // Avatar từ profile
                        status: 'active', // Mặc định trạng thái user là active
                    })
                    await user.save() // Lưu vào DB
                    // console.log('Created new Google user:', user)
                }

                // Gọi callback và truyền user vào session
                return cb(null, user)
            } catch (error) {
                console.error('Error during Google auth:', error)
                return cb(error, null) // Trả về lỗi nếu xảy ra
            }
        }
    )
)
