import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/sequelize';
import User from './User';

interface NoteAttributes {
    id: number;
    userId: number;
    title: string;
    body: string;
    createdAt?: Date;
    updatedAt?: Date;
}

interface NoteCreationAttributes extends Optional<NoteAttributes, 'id'> { }

class Note extends Model<NoteAttributes, NoteCreationAttributes> implements NoteAttributes {
    public id!: number;
    public userId!: number;
    public title!: string;
    public body!: string;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Note.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: User,
                key: 'id'
            }
        },
        title: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        body: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
    },
    {
        sequelize,
        tableName: 'notes',
    }
);

Note.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(Note, { foreignKey: 'userId', as: 'notes' });

export default Note;
