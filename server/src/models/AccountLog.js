const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AccountLog = sequelize.define('AccountLog', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    phone_number: {
        type: DataTypes.STRING,
        allowNull: false
    },
    branch: {
        type: DataTypes.ENUM('betfalme', 'sofa_safi'),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('open', 'pending', 'closed'),
        defaultValue: 'open'
    },
    request_count: {
        type: DataTypes.INTEGER,
        defaultValue: 1
    },
    last_request_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    indexes: [
        {
            unique: true,
            fields: ['phone_number', 'branch']
        }
    ]
});

module.exports = AccountLog;
