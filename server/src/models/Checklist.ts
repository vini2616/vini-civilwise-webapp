import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/sequelize';
import Site from './Site';

interface ChecklistAttributes {
    id: number;
    siteId: number;
    name: string;
    type: 'Template' | 'Instance';
    category?: string;
    items: any[]; // JSON array of checklist items
    status?: string;
    progress?: number;
    date?: Date;
    enteredBy?: string;
    editedBy?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

interface ChecklistCreationAttributes extends Optional<ChecklistAttributes, 'id' | 'type' | 'category' | 'items' | 'status' | 'progress' | 'date' | 'enteredBy' | 'editedBy'> { }

class Checklist extends Model<ChecklistAttributes, ChecklistCreationAttributes> implements ChecklistAttributes {
    public id!: number;
    public siteId!: number;
    public name!: string;
    public type!: 'Template' | 'Instance';
    public category!: string;
    public items!: any[];
    public status!: string;
    public progress!: number;
    public date!: Date;
    public enteredBy!: string;
    public editedBy!: string;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Checklist.init(
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
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        type: {
            type: DataTypes.ENUM('Template', 'Instance'),
            defaultValue: 'Instance',
        },
        category: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        items: {
            type: DataTypes.JSON, // Stores array of { id, text, status, remark, photos }
            defaultValue: [],
        },
        status: {
            type: DataTypes.STRING,
            defaultValue: 'In Progress',
        },
        progress: {
            type: DataTypes.FLOAT,
            defaultValue: 0,
        },
        date: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        enteredBy: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        editedBy: {
            type: DataTypes.STRING,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: 'checklists',
    }
);

Checklist.belongsTo(Site, { foreignKey: 'siteId', as: 'site' });
Site.hasMany(Checklist, { foreignKey: 'siteId', as: 'checklists' });

export default Checklist;
