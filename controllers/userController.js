const db = require('../models')
const User = db.User
const Tweet = db.Tweet
const Reply = db.Reply
const Followship = db.Followship
const Like = db.Like
const Chatmate = db.Chatmate
const ChatRecord = db.ChatRecord
const Subscribe = db.Subscribe
const Unread = db.Unread
const Sequelize = db.Sequelize
const sequelize = db.sequelize
const Op = Sequelize.Op
const imgur = require('imgur-node-api')
const IMGUR_CLIENT_ID = process.env.IMGUR_CLIENT_ID
const { QueryTypes } = require('sequelize')
const helpers = require('../_helpers')
const bcrypt = require('bcryptjs')

const userController = {
  userPage: async (req, res) => {
    const userData = { ...req.user, password: '', email: '' }
    const userId = req.user.id
    const requestId = Number(req.params.id)
    const id = helpers.checkId(req)
    try {

      // 取出跟蹤使用者的清單
      let followers = await Followship.findAll({
        where: { followingId: { [Op.eq]: id } },
        raw: true,
        nest: true
      })

      // 轉成陣列
      followers = followers.map(item => item = item['followingId'])

      let isFollowed = false
      if (!(userId === requestId)) {
        followers.includes(userId) ? isFollowed = true : isFollowed
      } else {
        isFollowed = 'self'
      }

      userData.isFollowed = isFollowed
      
      return res.json(userData)
    }
    catch (error) {
      console.log(error)
    }
  },

  // 取出使用者資訊
  getUserInfo: async (req, res) => {
    const userId = req.user.id
    const requestId = Number(req.params.id)
    const id = userId === requestId ? userId : requestId
    try {
      const userData = await User.findByPk(id, {
        attributes: { exclude: ['password', 'createdAt', 'updatedAt', 'role'] },
        include: [
          { model: User, as: 'Followings', attributes: ['id'] },
          { model: User, as: 'Followers', attributes: ['id'] }
        ]
      })
      
      if (userId !== requestId) {
        const roomId = await Chatmate.findOrCreate({
          raw: true,
          where: {
            [Op.and]: [
              { userAId: { [Op.in]: [userId, requestId] } },
              { userBId: { [Op.in]: [userId, requestId] } }
            ]
          },
          attributes: ['id']
        })
        userData.roomId = roomId
      }
  
      return res.json(userData)
    }
    catch (error) {
      console.log(error)
    }
  },

  //取出使用者發過的推文
  getUserTweets: async (req, res) => {
    const id = helpers.checkId(req)
    // 取出user所有推文
    try {
      const userTweets = await Tweet.findAll({
        where: { UserId: { [Op.eq]: id } },
        include: [
          { model: Reply, as: 'replies', attributes: ['id', 'UserId'] },
          { model: Like, as: 'likes', attributes: ['id', 'UserId'] }
        ],
        order: [['createdAt', 'DESC']]
      })
      return res.json(userTweets)
    }
    catch (error) {
      console.log(error)
    }
  },

  getRepliedTweets: async (req, res) => {
    const id = helpers.checkId(req)
    // 取出user所有推文
    try {
      const repliedTweets = await Reply.findAll({
        where: { UserId: { [Op.eq]: id } },
        include: [
          { model: Tweet, as: 'tweet',
            include: [{ model: User, as: 'user', attributes: { exclude: ['password', 'email', 'introduction', 'cover', 'createdAt', 'updatedAt'] } }]
          },
        ],
        order: [['createdAt', 'DESC']]
      })
  
      return res.json(repliedTweets)
    }
    catch (error) {
      console.log(error)
    }
  },

  getLikes: async (req, res) => {
    const id = helpers.checkId(req)
    try {
      // 取出user like的推文 並且包括推文作者
      const likedTweets = await Like.findAll({
        where: { UserId: { [Op.eq]: id } },
        include: [
          { model: Tweet, as: 'tweet', 
            include: [
              { model: User, as: 'user', attributes: { exclude: ['password', 'email', 'introduction', 'cover', 'createdAt', 'updatedAt'] }
              },
              { model: Like, as: 'likes', attributes: ['id', 'UserId'] },
              { model: Reply, as: 'replies', attributes: ['id', 'UserId'] }
            ]
        }],
        order: [['createdAt', 'DESC']]
      })

      return res.json(likedTweets)
    }
    catch (error) {
      console.log(error)
    }
  },

  getFollowings: async (req, res) => {
    const userId = Number(req.params.id)
    try {
      const followings = await Followship.findAll({
        where: { followerId: { [Op.eq]: userId } },
        include: [{ model: User, as: 'followings', attributes: { exclude: ['password', 'email', 'introduction', 'cover', 'createdAt', 'updatedAt'] } }]
      })
      return res.json(followings)
    }
    catch (error) {
      console.log(error)
    }
  },

  getFollowers: async (req, res) => {
    const userId = Number(req.params.id)
    try {
      const followers = await Followship.findAll({
        where: { followingId: { [Op.eq]: userId } },

        include: [{ model: User, as: 'followers', attributes: { exclude: ['password', 'email', 'cover', 'createdAt', 'updatedAt'] } }]

      })
      return res.json(followers)
    }
    catch (error) {
      console.log(error)
    }
  },
  
  editUserData: async (req, res) => {
    const userId = Number(req.params.id)
    let user = await User.findByPk(userId, { attributes: { exclude: ['createdAt', 'updatedAt', 'role'] } })
    const updateData = req.body
    const files = req.files

    // 確認是否編輯使用者自己的資料
    if (userId !== req.user.id) {
      return status(400).json('不能編輯他人的個人資料')
    }
    // 確認account及email是否已被註冊
    if (updateData.email && updateData.email !== user.email) {
      const isUser = await User.findOne({
        where: { email: updateData.email },
        attributes: ['email'],
      })
      if (isUser !== null) return status(400).json('Email已被使用')
    }
    if (updateData.account && updateData.account !== user.account) {
      const isUser = await User.findOne({
        where: { account: updateData.account },
        attributes: ['account'],
      })
      if (isUser !== null) return status(400).json('account已被使用')
    }

    // 確認password是否一致
    if (updateData.password && (updateData.password !== updateData.checkPassword)) {
      return status(400).json('password不一致')
    }

    if (updateData.password) {
      const salt = await bcrypt.genSalt(10)
      updateData.password = await bcrypt.hash(updateData.password, salt)
    }

    if (files &&　Object.keys(files).length) {
      if (files.cover) {
        imgur.setClientID(IMGUR_CLIENT_ID);
        imgur.upload(files['cover'][0].path, (err, img) => {
          User.update(
            { ...updateData, cover: img.data.link },
            { where: { id: { [Op.eq]: userId } } }
            )
          })
        }
      if (files.avatar) {
        imgur.setClientID(IMGUR_CLIENT_ID);
        imgur.upload(files['avatar'][0].path, (err, img) => {
          User.update(
            { ...updateData, avatar: img.data.link },
            { where: { id: { [Op.eq]: userId } } }
            )
        })
      }
      return res.status(200).json('Accept. Updated user profile and images')
    } else if (updateData) {
      await User.update(
        updateData,
        { where: { id: { [Op.eq]: userId } } }
      )
      return res.status(200).json('Accept. Updated user profile.')
    } else {
      res.status(400).json('invalid data')
    }
  },

  getChatRecords: async (req, res) => {
    const userId = req.user.id
    try {
      const chatRecords = await Chatmate.findAll({
        raw: true,
        where: { 
          [Op.or]: [
            { userAId: { [Op.eq]: userId } },
            { userBId: { [Op.eq]: userId } }
          ]
         },
        include: [
          { 
            model: ChatRecord, 
            as: 'records', 
            order: [['createdAt', 'DESC']], 
            limit: 1,
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'account', 'avatar'] }]
          }
        ]
      })

      return res.status(200).json(chatRecords)
    }
    catch (err) {
      console.log(err)
    }
  },

  subscribeUser: async (req, res) => {
    try {
      const channel = await Subscribe.findOrCreate({
        subscribing: req.params.id,
        subscriber: req.user.id
      }, { raw: true })
  
      channel.type = 'subscribe'
      channel.user = req.user
      const channelJson = JSON.stringify(channel)
  
      await Unread.create({
        sendId: req.user.id,
        receiveId: req.params.id,
        unread: channelJson
      })
  
      const roomId = 's' + channel.id
      const io = req.app.get('socketio')
      io.broadcast.to(roomId).emit('notices', 'subscribe')
      res.status(200)
    }
    catch (err) {
      console.log(err)
    }
  }
}


module.exports = userController