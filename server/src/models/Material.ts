import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/sequelize';
import Site from './Site';

interface MaterialAttributes {
    id: number;
    siteId: number;
    name: string;
    type?: string;
    unit?: string;
    quantity: number;
    minLevel?: number;
    notes?: string;
    date?: string; // Keeping as string to match Mongoose schema, though DATE is better.
    supplier?: string;
    challanImage?: string;
    usedFor?: string;
    source?: string;
    dprId?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

interface MaterialCreationAttributes extends Optional<MaterialAttributes, 'id' | 'type' | 'unit' | 'quantity' | 'minLevel' | 'notes' | 'date' | 'supplier' | 'challanImage' | 'usedFor' | 'source' | 'dprId'> { }

class Material extends Model<MaterialAttributes, MaterialCreationAttributes> implements MaterialAttributes {
    public id!: number;
    public siteId!: number;
    public name!: string;
    public type!: string;
    public unit!: string;
    public quantity!: number;
    public minLevel!: number;
    public notes!: string;
    public date!: string;
    public supplier!: string;
    public challanImage!: string;
    public usedFor!: string;
    public source!: string;
    public dprId!: string;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Material.init(
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
            type: DataTypes.STRING,
            allowNull: true,
        },
        unit: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        quantity: {
            type: DataTypes.FLOAT,
            defaultValue: 0,
        },
        minLevel: {
            type: DataTypes.FLOAT,
            allowNull: true,
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        date: {
            type: DataTypes.STRING, // Mongoose schema had String check
            allowNull: true,
        },
        supplier: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        challanImage: {
            type: DataTypes.TEXT('long'),
            allowNull: true,
        },
        usedFor: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        source: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        dprId: {
            type: DataTypes.STRING,
            allowNull: true,
        }
    },
    {
        sequelize,
        tableName: 'materials',
    }
);

Material.belongsTo(Site, { foreignKey: 'siteId', as: 'site' });
Site.hasMany(Material, { foreignKey: 'siteId', as: 'materials' });

export default Material;
