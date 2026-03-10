import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/sequelize';
import Site from './Site';
import User from './User';

interface TransactionAttributes {
    id: number;
    date: Date;
    amount: number;
    baseAmount?: number;
    gstRate?: number;
    gstAmount?: number;
    type: 'credit' | 'debit' | 'income' | 'expense';
    category: string;
    description?: string;
    note?: string;
    partyName?: string;
    billNo?: string;
    mode: 'cash' | 'online' | 'cheque';
    siteId: number;
    userId: number;
    billImage?: string; // S3 URL or path
    paymentProof?: string;
    isCashbook: boolean;
    enteredBy?: string;
    editedBy?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

interface TransactionCreationAttributes extends Optional<TransactionAttributes, 'id' | 'date' | 'baseAmount' | 'gstRate' | 'gstAmount' | 'description' | 'note' | 'partyName' | 'billNo' | 'mode' | 'billImage' | 'paymentProof' | 'isCashbook' | 'enteredBy' | 'editedBy'> { }

class Transaction extends Model<TransactionAttributes, TransactionCreationAttributes> implements TransactionAttributes {
    public id!: number;
    public date!: Date;
    public amount!: number;
    public baseAmount!: number;
    public gstRate!: number;
    public gstAmount!: number;
    public type!: 'credit' | 'debit' | 'income' | 'expense';
    public category!: string;
    public description!: string;
    public note!: string;
    public partyName!: string;
    public billNo!: string;
    public mode!: 'cash' | 'online' | 'cheque';
    public siteId!: number;
    public userId!: number;
    public billImage!: string;
    public paymentProof!: string;
    public isCashbook!: boolean;
    public enteredBy!: string;
    public editedBy!: string;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Transaction.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        date: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
            allowNull: false,
        },
        amount: {
            type: DataTypes.FLOAT, // or DECIMAL(10, 2)
            allowNull: false,
        },
        baseAmount: {
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
        type: {
            type: DataTypes.ENUM('credit', 'debit', 'income', 'expense'),
            allowNull: false,
        },
        category: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        note: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        partyName: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        billNo: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        mode: {
            type: DataTypes.ENUM('cash', 'online', 'cheque'),
            defaultValue: 'cash',
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
        billImage: {
            type: DataTypes.TEXT('long'),
            allowNull: true,
        },
        paymentProof: {
            type: DataTypes.TEXT('long'),
            allowNull: true,
        },
        isCashbook: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
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
        tableName: 'transactions',
    }
);

// Associations
Transaction.belongsTo(Site, { foreignKey: 'siteId', as: 'site' });
Site.hasMany(Transaction, { foreignKey: 'siteId', as: 'transactions' });

Transaction.belongsTo(User, { foreignKey: 'userId', as: 'creator' });
User.hasMany(Transaction, { foreignKey: 'userId', as: 'transactions' });

export default Transaction;
