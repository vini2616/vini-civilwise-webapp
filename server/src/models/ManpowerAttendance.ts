import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/sequelize';
import Site from './Site';

interface ManpowerAttendanceAttributes {
    id: number;
    siteId: number;
    date: string; // YYYY-MM-DD
    records: any[]; // Array of { manpowerId, status, overtime }
    createdAt?: Date;
    updatedAt?: Date;
}

interface ManpowerAttendanceCreationAttributes extends Optional<ManpowerAttendanceAttributes, 'id'> { }

class ManpowerAttendance extends Model<ManpowerAttendanceAttributes, ManpowerAttendanceCreationAttributes> implements ManpowerAttendanceAttributes {
    public id!: number;
    public siteId!: number;
    public date!: string;
    public records!: any[];

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

ManpowerAttendance.init(
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
        date: {
            type: DataTypes.STRING, // YYYY-MM-DD
            allowNull: false,
        },
        records: {
            type: DataTypes.JSON,
            defaultValue: [],
        },
    },
    {
        sequelize,
        tableName: 'manpower_attendance',
        indexes: [
            {
                unique: true,
                fields: ['siteId', 'date']
            }
        ]
    }
);

ManpowerAttendance.belongsTo(Site, { foreignKey: 'siteId', as: 'site' });
Site.hasMany(ManpowerAttendance, { foreignKey: 'siteId', as: 'dateAttendance' });

export default ManpowerAttendance;
