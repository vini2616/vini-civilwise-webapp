import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/sequelize';
import Site from './Site';

interface SiteSettingsAttributes {
    id: number;
    siteId: number;
    parties: string[];
    suppliers: string[];
    trades: string[];
    materialNames: string[];
    materialTypes: string[];
    customCategories: string[];
    units: string[];
    billItems: string[];
    createdAt?: Date;
    updatedAt?: Date;
}

interface SiteSettingsCreationAttributes extends Optional<SiteSettingsAttributes, 'id' | 'parties' | 'suppliers' | 'trades' | 'materialNames' | 'materialTypes' | 'customCategories' | 'units' | 'billItems'> { }

class SiteSettings extends Model<SiteSettingsAttributes, SiteSettingsCreationAttributes> implements SiteSettingsAttributes {
    public id!: number;
    public siteId!: number;
    public parties!: string[];
    public suppliers!: string[];
    public trades!: string[];
    public materialNames!: string[];
    public materialTypes!: string[];
    public customCategories!: string[];
    public units!: string[];
    public billItems!: string[];

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

SiteSettings.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        siteId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: true, // One settings doc per site
            references: {
                model: Site,
                key: 'id'
            }
        },
        parties: {
            type: DataTypes.JSON,
            defaultValue: [],
        },
        suppliers: {
            type: DataTypes.JSON,
            defaultValue: [],
        },
        trades: {
            type: DataTypes.JSON,
            defaultValue: [],
        },
        materialNames: {
            type: DataTypes.JSON,
            defaultValue: [],
        },
        materialTypes: {
            type: DataTypes.JSON,
            defaultValue: [],
        },
        customCategories: {
            type: DataTypes.JSON,
            defaultValue: [],
        },
        units: {
            type: DataTypes.JSON,
            defaultValue: [],
        },
        billItems: {
            type: DataTypes.JSON,
            defaultValue: [],
        },
    },
    {
        sequelize,
        tableName: 'site_settings',
    }
);

SiteSettings.belongsTo(Site, { foreignKey: 'siteId', as: 'site' });
Site.hasOne(SiteSettings, { foreignKey: 'siteId', as: 'settings' });

export default SiteSettings;
