import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/sequelize';

interface CompanyAttributes {
    id: number;
    name: string;
    address?: string;
    gst?: string;
    mobile: string;
    email?: string;
    website?: string;
    accountHolderName?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    branch?: string;
    ownerId: number;
    deletedAt?: Date | null;
    permanentDeleteAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface CompanyCreationAttributes extends Optional<CompanyAttributes, 'id' | 'address' | 'gst' | 'email' | 'website' | 'accountHolderName' | 'bankName' | 'accountNumber' | 'ifscCode' | 'branch' | 'deletedAt' | 'permanentDeleteAt'> { }

class Company extends Model<CompanyAttributes, CompanyCreationAttributes> implements CompanyAttributes {
    public id!: number;
    public name!: string;
    public address!: string;
    public gst!: string;
    public mobile!: string;
    public email!: string;
    public website!: string;
    public accountHolderName!: string;
    public bankName!: string;
    public accountNumber!: string;
    public ifscCode!: string;
    public branch!: string;
    public ownerId!: number;
    public deletedAt!: Date | null;
    public permanentDeleteAt!: Date | null;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Company.init(
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
            allowNull: true,
        },
        gst: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        mobile: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        email: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        website: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        accountHolderName: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        bankName: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        accountNumber: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        ifscCode: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        branch: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        ownerId: {
            type: DataTypes.INTEGER,
            allowNull: false,
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
        tableName: 'companies',
    }
);

export default Company;
