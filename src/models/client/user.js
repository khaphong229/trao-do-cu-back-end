import mongoose from 'mongoose'
import createModel from '../base'

const User = createModel(
    'User',
    'users',
    {
        // ... existing code ...
        isSurveyed: {
            type: Boolean,
            default: false,
        },
        // ... existing code ...
    },
    {
        indexes: [
            { email: 1 },
            { phone: 1 },
            { username: 1 },
            { isSurveyed: 1 }
        ]
    }
)

export default User 