import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/sequelize';
import Site from './Site';

interface AttendanceAttributes {
    id: number;
    siteId: number;
    date: Date;
    workers: any[];
    notes?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

interface AttendanceCreationAttributes extends Optional<AttendanceAttributes, 'id' | 'workers' | 'notes'> { }

class Attendance extends Model<AttendanceAttributes, AttendanceCreationAttributes> implements AttendanceAttributes {
    public id!: number;
    public siteId!: number;
    public date!: Date;
    public workers!: any[];
    public notes!: string;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Attendance.init(
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
            type: DataTypes.DATE,
            allowNull: false,
        },
        workers: {
            type: DataTypes.JSON, // Array of { name, role, status, wages, overtime }
            defaultValue: [],
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: 'attendances',
    }
);

Attendance.belongsTo(Site, { foreignKey: 'siteId', as: 'site' });
Site.hasMany(Attendance, { foreignKey: 'siteId', as: 'attendances' });

export default Attendance;
