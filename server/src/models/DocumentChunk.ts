import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/sequelize';
import DocumentModel from './Document';

class DocumentChunk extends Model {
    public id!: number;
    public documentId!: number;
    public chunkIndex!: number;
    public data!: string;
}

DocumentChunk.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        documentId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: DocumentModel,
                key: 'id',
            },
        },
        chunkIndex: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        data: {
            type: DataTypes.TEXT, // Standard 64KB TEXT type is fine since we chop it!
            allowNull: false,
        },
    },
    {
        sequelize,
        tableName: 'document_chunks',
        timestamps: false
    }
);

DocumentModel.hasMany(DocumentChunk, { foreignKey: 'documentId', as: 'chunks', onDelete: 'CASCADE' });
DocumentChunk.belongsTo(DocumentModel, { foreignKey: 'documentId', as: 'document' });

export default DocumentChunk;
