const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ChatMessage = sequelize.define('ChatMessage', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    channel_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'ChatChannels',
            key: 'id'
        }
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'Users',
            key: 'id'
        }
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    file_url: {
        type: DataTypes.STRING,
        allowNull: true
    },
    file_name: {
        type: DataTypes.STRING,
        allowNull: true
    },
    file_type: {
        type: DataTypes.STRING,
        allowNull: true
    },
    reactions: {
        type: DataTypes.TEXT,
        allowNull: true,
        get() {
            const rawValue = this.getDataValue('reactions');
            return rawValue ? JSON.parse(rawValue) : [];
        },
        set(value) {
            this.setDataValue('reactions', JSON.stringify(value));
        }
    }
}, {
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    underscored: true
});

module.exports = ChatMessage;
