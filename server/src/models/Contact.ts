import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/sequelize';
import Site from './Site';

interface ContactAttributes {
    id: number;
    siteId: number;
    name?: string;
    companyName?: string;
    number?: string;
    mobileNumber?: string;
    role?: string;
    type?: string;
    gstNumber?: string;
    address?: string;
    email?: string;
    contactPerson?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

interface ContactCreationAttributes extends Optional<ContactAttributes, 'id' | 'name' | 'companyName' | 'number' | 'mobileNumber' | 'role' | 'type' | 'gstNumber' | 'address' | 'email' | 'contactPerson'> { }

class Contact extends Model<ContactAttributes, ContactCreationAttributes> implements ContactAttributes {
    public id!: number;
    public siteId!: number;
    public name!: string;
    public companyName!: string;
    public number!: string;
    public mobileNumber!: string;
    public role!: string;
    public type!: string;
    public gstNumber!: string;
    public address!: string;
    public email!: string;
    public contactPerson!: string;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Contact.init(
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
            allowNull: true,
        },
        companyName: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        number: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        mobileNumber: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        role: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        type: {
            type: DataTypes.STRING, // e.g., Vendor, Contractor
            allowNull: true,
        },
        gstNumber: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        address: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        email: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        contactPerson: {
            type: DataTypes.STRING,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: 'contacts',
    }
);

Contact.belongsTo(Site, { foreignKey: 'siteId', as: 'site' });
Site.hasMany(Contact, { foreignKey: 'siteId', as: 'contacts' });

export default Contact;
