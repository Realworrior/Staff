const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        set(value) {
            this.setDataValue('username', value.toLowerCase().trim());
        }
    },
    password_hash: {
        type: DataTypes.STRING,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: { isEmail: true }
    },
    role: {
        type: DataTypes.ENUM('admin', 'supervisor', 'staff'),
        defaultValue: 'staff'
    },
    branch: {
        type: DataTypes.STRING,
        defaultValue: 'betfalme'
    },
    avatar: {
        type: DataTypes.STRING,
        allowNull: true
    },
    transport_allowance: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    }
}, {
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true
});

module.exports = User;
