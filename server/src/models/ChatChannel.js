const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ChatChannel = sequelize.define('ChatChannel', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        set(value) {
            this.setDataValue('name', value.toLowerCase());
        }
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    type: {
        type: DataTypes.ENUM('public', 'private', 'dm'),
        defaultValue: 'public'
    },
    created_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'Users',
            key: 'id'
        }
    },
    // For SQLite we can use TEXT and JSON.parse/stringify
    members: {
        type: DataTypes.TEXT,
        allowNull: true,
        get() {
            const rawValue = this.getDataValue('members');
            return rawValue ? JSON.parse(rawValue) : [];
        },
        set(value) {
            this.setDataValue('members', JSON.stringify(value));
        }
    }
}, {
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    underscored: true
});

module.exports = ChatChannel;
