'use strict';
module.exports = (sequelize, DataTypes) => {
  const Unread = sequelize.define('Unread', {
    sendId: DataTypes.INTEGER,
    receiveId: DataTypes.INTEGER,
    unread: DataTypes.TEXT
  }, {});
  Unread.associate = function(models) {
    // associations can be defined here
  };
  return Unread;
};