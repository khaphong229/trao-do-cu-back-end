import cron from 'node-cron'
import { cleanupUploads } from './tasks/cleanup-uploads.task'

// Chạy task dọn dẹp mỗi giờ
const hourlyCronJob = cron.schedule('0 * * * *', async () => {
    console.log('Running hourly cleanup task')
    try {
        await cleanupUploads()
        console.log('Hourly cleanup completed')
    } catch (err) {
        console.error('Hourly cleanup failed:', err)
    }
})

// Chạy task dọn dẹp khẩn cấp khi server khởi động
const initCleanup = async () => {
    console.log('Running initial cleanup task')
    try {
        await cleanupUploads()
        console.log('Initial cleanup completed')
    } catch (err) {
        console.error('Initial cleanup failed:', err)
    }
}

// Khởi tạo cron jobs
export default function initCronJobs() {
    console.log('Cron jobs initialized')
    hourlyCronJob.start()
    initCleanup()
    
    return {
        hourlyCronJob
    }
} 