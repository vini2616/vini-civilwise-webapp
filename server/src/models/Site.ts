import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/sequelize';
import Company from './Company';

interface SiteAttributes {
    id: number;
    name: string;
    address: string;
    companyId: number;
    status: 'active' | 'completed' | 'inactive';
    deletedAt?: Date | null;
    permanentDeleteAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface SiteCreationAttributes extends Optional<SiteAttributes, 'id' | 'status' | 'deletedAt' | 'permanentDeleteAt'> { }

class Site extends Model<SiteAttributes, SiteCreationAttributes> implements SiteAttributes {
    public id!: number;
    public name!: string;
    public address!: string;
    public companyId!: number;
    public status!: 'active' | 'completed' | 'inactive';
    public deletedAt!: Date | null;
    public permanentDeleteAt!: Date | null;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Site.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        address: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        companyId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: Company,
                key: 'id'
            }
        },
        status: {
            type: DataTypes.ENUM('active', 'completed', 'inactive'),
            defaultValue: 'active',
        },
        deletedAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        permanentDeleteAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: 'sites',
        paranoid: false, // We handle soft deletes manually or can use paranoid: true. Mongoose schema had manual fields. sticking to manual to match logic if needed, or use Sequelize paranoid? 
        // Logic shows manual `deletedAt` setting and `permanentDeleteAt`. Sequelize `paranoid: true` handles `deletedAt` automatically.
        // Let's use manual for now to match the "permanentDeleteAt" logic which is custom.
    }
);

// Associations
// Defined here or in a separate associations file. 
// Ideally, we should initialize associations in one place, but checking Company.ts, it doesn't import Site.
// Let's define the BelongsTo so queries work.
Site.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Company.hasMany(Site, { foreignKey: 'companyId', as: 'sites' });

export default Site;
