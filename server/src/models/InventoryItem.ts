import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/sequelize';
import Site from './Site';

interface InventoryItemAttributes {
    id: number;
    siteId: number;
    block: string;
    floor: string;
    flatNumber: string;
    type: string;
    area: number;
    status: string;
    rate?: number;
    buyerName?: string;
    buyerMobile?: string;
    buyerAddress?: string;
    totalAmount?: number;
    paidAmount?: number;
    paymentHistory?: any[]; // JSON
    extraWork?: any[]; // JSON
    documents?: any[]; // JSON

    // Legacy
    ownerName?: string;
    ownerContact?: string;
    cost?: number;
    bookingAmount?: number;
    notes?: string;
    enteredBy?: string;
    editedBy?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

interface InventoryItemCreationAttributes extends Optional<InventoryItemAttributes, 'id' | 'type' | 'area' | 'status' | 'notes' | 'rate' | 'buyerName' | 'buyerMobile' | 'buyerAddress' | 'totalAmount' | 'paidAmount' | 'paymentHistory' | 'extraWork' | 'documents' | 'enteredBy' | 'editedBy'> { }

class InventoryItem extends Model<InventoryItemAttributes, InventoryItemCreationAttributes> implements InventoryItemAttributes {
    public id!: number;
    public siteId!: number;
    public block!: string;
    public floor!: string;
    public flatNumber!: string;
    public type!: string;
    public area!: number;
    public status!: string;
    public rate!: number;
    public buyerName!: string;
    public buyerMobile!: string;
    public buyerAddress!: string;
    public totalAmount!: number;
    public paidAmount!: number;
    public paymentHistory!: any[];
    public extraWork!: any[];
    public documents!: any[];

    // Legacy
    public ownerName!: string;
    public ownerContact!: string;
    public cost!: number;
    public bookingAmount!: number;
    public notes!: string;
    public enteredBy!: string;
    public editedBy!: string;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

InventoryItem.init(
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
        block: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        floor: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        flatNumber: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        type: {
            type: DataTypes.STRING,
            defaultValue: 'Residential',
        },
        area: {
            type: DataTypes.FLOAT,
            defaultValue: 0,
        },
        status: {
            type: DataTypes.STRING,
            defaultValue: 'Available',
        },
        rate: {
            type: DataTypes.FLOAT,
            defaultValue: 0
        },
        buyerName: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        buyerMobile: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        buyerAddress: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        totalAmount: {
            type: DataTypes.FLOAT,
            defaultValue: 0,
        },
        paidAmount: {
            type: DataTypes.FLOAT,
            defaultValue: 0,
        },
        paymentHistory: {
            type: DataTypes.JSON,
            defaultValue: [],
        },
        extraWork: {
            type: DataTypes.JSON,
            defaultValue: [],
        },
        documents: {
            type: DataTypes.JSON,
            defaultValue: [],
        },
        // Legacy/Alternative fields
        ownerName: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        ownerContact: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        cost: {
            type: DataTypes.FLOAT,
            allowNull: true,
        },
        bookingAmount: {
            type: DataTypes.FLOAT,
            allowNull: true,
        },
        notes: {
            type: DataTypes.TEXT,
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
        tableName: 'inventory_items',
    }
);

InventoryItem.belongsTo(Site, { foreignKey: 'siteId', as: 'site' });
Site.hasMany(InventoryItem, { foreignKey: 'siteId', as: 'inventoryItems' });

export default InventoryItem;
