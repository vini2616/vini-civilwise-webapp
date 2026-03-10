import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/sequelize';
import Site from './Site';

interface DocumentAttributes {
    id: number;
    siteId: number;
    name: string;
    originalName: string;
    type: string;
    size: number;
    url: string;
    uploadedBy: string;
    uploadedAt: Date;
    category: string;
    createdAt?: Date;
    updatedAt?: Date;
}

interface DocumentCreationAttributes extends Optional<DocumentAttributes, 'id' | 'uploadedAt' | 'category'> { }

class DocumentModel extends Model<DocumentAttributes, DocumentCreationAttributes> implements DocumentAttributes {
    public id!: number;
    public siteId!: number;
    public name!: string;
    public originalName!: string;
    public type!: string;
    public size!: number;
    public url!: string;
    public uploadedBy!: string;
    public uploadedAt!: Date;
    public category!: string;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

DocumentModel.init(
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
        originalName: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        type: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        size: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        url: {
            type: DataTypes.TEXT('long'), // Use LONGTEXT for large Base64 strings
            allowNull: false,
        },
        uploadedBy: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        uploadedAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
        category: {
            type: DataTypes.STRING,
            defaultValue: 'general',
        },
    },
    {
        sequelize,
        tableName: 'documents',
    }
);

DocumentModel.belongsTo(Site, { foreignKey: 'siteId', as: 'site' });
Site.hasMany(DocumentModel, { foreignKey: 'siteId', as: 'documents' });

export default DocumentModel;
