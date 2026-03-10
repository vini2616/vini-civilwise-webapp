import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/sequelize';
import Site from './Site';

interface EstimationAttributes {
    id: number;
    siteId: number;
    title: string;
    description?: string;
    type: string;
    date: Date;
    items: any[];
    // Defaults
    defaultConcreteGrade?: string;
    defaultConcreteRatio?: string;
    defaultMaterial?: string;
    defaultCustomDims?: any;
    defaultMortarRatio?: string;
    defaultMortarThickness?: number;
    defaultPlasterRatio?: string;
    defaultPlasterThickness?: string;
    defaultFlooringSize?: string;
    defaultBeddingThickness?: number;
    defaultFlooringRatio?: string;
    defaultFlooringWastage?: number;
    scrapStock?: any[];
    createdAt?: Date;
    updatedAt?: Date;
}

interface EstimationCreationAttributes extends Optional<EstimationAttributes, 'id' | 'description' | 'items' | 'date' | 'defaultConcreteGrade' | 'defaultConcreteRatio' | 'defaultMaterial' | 'defaultCustomDims' | 'defaultMortarRatio' | 'defaultMortarThickness' | 'defaultPlasterRatio' | 'defaultPlasterThickness' | 'defaultFlooringSize' | 'defaultBeddingThickness' | 'defaultFlooringRatio' | 'defaultFlooringWastage' | 'scrapStock'> { }

class Estimation extends Model<EstimationAttributes, EstimationCreationAttributes> implements EstimationAttributes {
    public id!: number;
    public siteId!: number;
    public title!: string;
    public description!: string;
    public type!: string;
    public date!: Date;
    public items!: any[];

    public defaultConcreteGrade!: string;
    public defaultConcreteRatio!: string;
    public defaultMaterial!: string;
    public defaultCustomDims!: any;
    public defaultMortarRatio!: string;
    public defaultMortarThickness!: number;
    public defaultPlasterRatio!: string;
    public defaultPlasterThickness!: string;
    public defaultFlooringSize!: string;
    public defaultBeddingThickness!: number;
    public defaultFlooringRatio!: string;
    public defaultFlooringWastage!: number;
    public scrapStock!: any[];

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Estimation.init(
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
        title: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        description: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        type: {
            type: DataTypes.STRING, // steel, concrete, etc.
            allowNull: false,
        },
        date: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
        items: {
            type: DataTypes.JSON,
            defaultValue: [],
        },
        // Defaults
        defaultConcreteGrade: DataTypes.STRING,
        defaultConcreteRatio: DataTypes.STRING,
        defaultMaterial: DataTypes.STRING,
        defaultCustomDims: DataTypes.JSON,
        defaultMortarRatio: DataTypes.STRING,
        defaultMortarThickness: DataTypes.FLOAT,
        defaultPlasterRatio: DataTypes.STRING,
        defaultPlasterThickness: DataTypes.STRING,
        defaultFlooringSize: DataTypes.STRING,
        defaultBeddingThickness: DataTypes.FLOAT,
        defaultFlooringRatio: DataTypes.STRING,
        defaultFlooringWastage: DataTypes.FLOAT,
        scrapStock: {
            type: DataTypes.JSON,
            defaultValue: [],
        },
    },
    {
        sequelize,
        tableName: 'estimations',
    }
);

Estimation.belongsTo(Site, { foreignKey: 'siteId', as: 'site' });
Site.hasMany(Estimation, { foreignKey: 'siteId', as: 'estimations' });

export default Estimation;
