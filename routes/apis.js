const express = require('express')
const router = express.Router()

const userController = require('../controllers/api/userController.js')
const tweetController = require('../controllers/api/tweetController.js')
const followController = require('../controllers/api/followController.js')

// route: /api/users
router.post('/users', userController.signUp) // 註冊
router.get('/users/:id/edit', userController.editUser) // 帳戶設定
router.get('/users/:id/profile', userController.editUserProfile) // 編輯個人資料
router.put('/users/:id', userController.putUser) // 儲存帳戶設定 & 個人資料 共用路由

// route: /api/tweets
router.get('/tweets', tweetController.getTweets) // 推文首頁
router.get('/tweets/:tweet_id', tweetController.getTweet) // 特定推文頁
router.post('/tweets', tweetController.postTweet) // 新增推文
router.get('/tweets/:tweet_id/replies', tweetController.getReplies) // 特定推文的所有回覆
router.post('/tweets/:tweet_id/like', tweetController.likeTweet) // 喜歡一則推文
router.post('/tweets/:tweet_id/unlike', tweetController.unlikeTweet) // 喜歡一則推文

//route: /api/followships
router.get('/followships/:id', followController.getFollowships) // 取得跟隨者(follower)及正在跟隨(following)
// router.get('/followships', followController.getFollowships) // 取得跟隨者(follower)及正在跟隨(following)
router.post('/followships', followController.follow) // 跟隨一位使用者
router.delete('/followships', followController.unfollow) // 取消跟隨一位使用者

module.exports = router
