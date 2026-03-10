import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/sequelize';
import Site from './Site';

interface ReportAttributes {
    id: number;
    siteId: number;
    type: 'concrete' | 'steel' | 'brick';
    date: Date;
    location: string;
    image?: string;
    status: string;
    createdBy: string;
    data: any;
    createdAt?: Date;
    updatedAt?: Date;
}

interface ReportCreationAttributes extends Optional<ReportAttributes, 'id' | 'image' | 'status' | 'date' | 'data'> { }

class Report extends Model<ReportAttributes, ReportCreationAttributes> implements ReportAttributes {
    public id!: number;
    public siteId!: number;
    public type!: 'concrete' | 'steel' | 'brick';
    public date!: Date;
    public location!: string;
    public image!: string;
    public status!: string;
    public createdBy!: string;
    public data!: any;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Report.init(
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
        type: {
            type: DataTypes.ENUM('concrete', 'steel', 'brick'),
            allowNull: false,
        },
        date: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
        location: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        image: {
            type: DataTypes.TEXT('long'), // Could be base64 or URL
            allowNull: true,
        },
        status: {
            type: DataTypes.STRING,
            defaultValue: 'Scheduled',
        },
        createdBy: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        data: {
            type: DataTypes.JSON,
            defaultValue: {},
        },
    },
    {
        sequelize,
        tableName: 'reports',
    }
);

Report.belongsTo(Site, { foreignKey: 'siteId', as: 'site' });
Site.hasMany(Report, { foreignKey: 'siteId', as: 'reports' });

export default Report;
