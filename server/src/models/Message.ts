import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/sequelize';
import Site from './Site';

interface MessageAttributes {
    id: number;
    siteId: number;
    senderId: string;
    senderName: string;
    type: string;
    content: string;
    timestamp: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

interface MessageCreationAttributes extends Optional<MessageAttributes, 'id' | 'type' | 'timestamp'> { }

class Message extends Model<MessageAttributes, MessageCreationAttributes> implements MessageAttributes {
    public id!: number;
    public siteId!: number;
    public senderId!: string;
    public senderName!: string;
    public type!: string;
    public content!: string;
    public timestamp!: Date;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Message.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        siteId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: Site,
                key: 'id'
            }
        },
        senderId: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        senderName: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        type: {
            type: DataTypes.STRING,
            defaultValue: 'text',
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        timestamp: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        sequelize,
        tableName: 'messages',
    }
);

Message.belongsTo(Site, { foreignKey: 'siteId', as: 'site' });
Site.hasMany(Message, { foreignKey: 'siteId', as: 'messages' });

export default Message;
