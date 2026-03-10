import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/sequelize';
import Site from './Site';
import Manpower from './Manpower';

interface ManpowerPaymentAttributes {
    id: number;
    siteId: number;
    manpowerId: number;
    amount: number;
    date: string; // YYYY-MM-DD
    note?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

interface ManpowerPaymentCreationAttributes extends Optional<ManpowerPaymentAttributes, 'id' | 'note'> { }

class ManpowerPayment extends Model<ManpowerPaymentAttributes, ManpowerPaymentCreationAttributes> implements ManpowerPaymentAttributes {
    public id!: number;
    public siteId!: number;
    public manpowerId!: number;
    public amount!: number;
    public date!: string;
    public note!: string;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

ManpowerPayment.init(
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
        manpowerId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: Manpower,
                key: 'id'
            }
        },
        amount: {
            type: DataTypes.FLOAT,
            allowNull: false,
        },
        date: {
            type: DataTypes.STRING, // YYYY-MM-DD
            allowNull: false,
        },
        note: {
            type: DataTypes.STRING,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: 'manpower_payments',
    }
);

ManpowerPayment.belongsTo(Site, { foreignKey: 'siteId', as: 'site' });
Site.hasMany(ManpowerPayment, { foreignKey: 'siteId', as: 'manpowerPayments' });

ManpowerPayment.belongsTo(Manpower, { foreignKey: 'manpowerId', as: 'manpower' });
Manpower.hasMany(ManpowerPayment, { foreignKey: 'manpowerId', as: 'payments' });

export default ManpowerPayment;
