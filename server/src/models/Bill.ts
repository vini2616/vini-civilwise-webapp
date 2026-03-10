import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/sequelize';
import Site from './Site';
import User from './User';

interface BillAttributes {
    id: number;
    invoiceNo: string;
    date: Date;
    partyName: string;
    partyAddress?: string;
    partyGst?: string;
    partyMobile?: string;
    destination?: string;
    items: any[]; // JSON array of items
    freight?: number;
    gstRate?: number;
    gstAmount?: number;
    baseAmount?: number;
    amount: number;
    note?: string;
    type: string;
    siteId: number;
    userId: number;
    enteredBy?: string;
    editedBy?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

interface BillCreationAttributes extends Optional<BillAttributes, 'id' | 'partyAddress' | 'partyGst' | 'partyMobile' | 'destination' | 'items' | 'freight' | 'gstRate' | 'gstAmount' | 'baseAmount' | 'note' | 'type' | 'enteredBy' | 'editedBy'> { }

class Bill extends Model<BillAttributes, BillCreationAttributes> implements BillAttributes {
    public id!: number;
    public invoiceNo!: string;
    public date!: Date;
    public partyName!: string;
    public partyAddress!: string;
    public partyGst!: string;
    public partyMobile!: string;
    public destination!: string;
    public items!: any[];
    public freight!: number;
    public gstRate!: number;
    public gstAmount!: number;
    public baseAmount!: number;
    public amount!: number;
    public note!: string;
    public type!: string;
    public siteId!: number;
    public userId!: number;
    public enteredBy!: string;
    public editedBy!: string;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Bill.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        invoiceNo: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        date: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
            allowNull: false,
        },
        partyName: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        partyAddress: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        partyGst: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        partyMobile: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        destination: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        items: {
            type: DataTypes.JSON,
            defaultValue: [],
        },
        freight: {
            type: DataTypes.FLOAT,
            allowNull: true,
        },
        gstRate: {
            type: DataTypes.FLOAT,
            allowNull: true,
        },
        gstAmount: {
            type: DataTypes.FLOAT,
            allowNull: true,
        },
        baseAmount: {
            type: DataTypes.FLOAT,
            allowNull: true,
        },
        amount: {
            type: DataTypes.FLOAT,
            allowNull: false,
        },
        note: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        type: {
            type: DataTypes.STRING,
            defaultValue: 'invoice',
        },
        siteId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: Site,
                key: 'id'
            }
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: User,
                key: 'id'
            }
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
        tableName: 'bills',
    }
);

Bill.belongsTo(Site, { foreignKey: 'siteId', as: 'site' });
Site.hasMany(Bill, { foreignKey: 'siteId', as: 'bills' });

Bill.belongsTo(User, { foreignKey: 'userId', as: 'creator' });
User.hasMany(Bill, { foreignKey: 'userId', as: 'bills' });

export default Bill;
