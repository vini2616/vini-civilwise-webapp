import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/sequelize';
import Site from './Site';

interface CustomShapeAttributes {
    id: number;
    siteId: number;
    name: string;
    description?: string;
    type: string;
    segments: any[];
    deductions: any;
    createdAt?: Date;
    updatedAt?: Date;
}

interface CustomShapeCreationAttributes extends Optional<CustomShapeAttributes, 'id' | 'description' | 'type' | 'segments' | 'deductions'> { }

class CustomShape extends Model<CustomShapeAttributes, CustomShapeCreationAttributes> implements CustomShapeAttributes {
    public id!: number;
    public siteId!: number;
    public name!: string;
    public description!: string;
    public type!: string;
    public segments!: any[];
    public deductions!: any;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

CustomShape.init(
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
        description: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        type: {
            type: DataTypes.STRING,
            defaultValue: 'SEGMENT_BASED',
        },
        segments: {
            type: DataTypes.JSON,
            defaultValue: [],
        },
        deductions: {
            type: DataTypes.JSON,
            defaultValue: {},
        },
    },
    {
        sequelize,
        tableName: 'custom_shapes',
    }
);

CustomShape.belongsTo(Site, { foreignKey: 'siteId', as: 'site' });
Site.hasMany(CustomShape, { foreignKey: 'siteId', as: 'customShapes' });

export default CustomShape;
