import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/sequelize';
import Site from './Site';

interface ManpowerAttributes {
    id: number;
    siteId: number;
    name: string;
    type: 'Skilled' | 'Unskilled' | 'Semi-Skilled';
    trade: string;
    rate: number;
    contractor?: string;
    enteredBy?: string;
    editedBy?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

interface ManpowerCreationAttributes extends Optional<ManpowerAttributes, 'id' | 'contractor' | 'enteredBy' | 'editedBy'> { }

class Manpower extends Model<ManpowerAttributes, ManpowerCreationAttributes> implements ManpowerAttributes {
    public id!: number;
    public siteId!: number;
    public name!: string;
    public type!: 'Skilled' | 'Unskilled' | 'Semi-Skilled';
    public trade!: string;
    public rate!: number;
    public contractor!: string;
    public enteredBy!: string;
    public editedBy!: string;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Manpower.init(
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
            type: DataTypes.ENUM('Skilled', 'Unskilled', 'Semi-Skilled'),
            allowNull: false,
        },
        trade: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        rate: {
            type: DataTypes.FLOAT,
            allowNull: false,
        },
        contractor: {
            type: DataTypes.STRING,
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
        tableName: 'manpower',
    }
);

Manpower.belongsTo(Site, { foreignKey: 'siteId', as: 'site' });
Site.hasMany(Manpower, { foreignKey: 'siteId', as: 'manpower' });

export default Manpower;
