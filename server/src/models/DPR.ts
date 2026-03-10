import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/sequelize';
import Site from './Site';
import User from './User';

interface DPRAttributes {
    id: number;
    siteId: number;
    userId: number;
    projectInfo: any;
    manpower: any[];
    workStarted: any[];
    equipment: any[];
    materials: any[];
    work: any[];
    reconciliation: any[];
    planTomorrow?: string;
    remarks: any;
    signatures: any;
    photos: string[];
    createdAt?: Date;
    updatedAt?: Date;
}

interface DPRCreationAttributes extends Optional<DPRAttributes, 'id' | 'planTomorrow' | 'manpower' | 'workStarted' | 'equipment' | 'materials' | 'work' | 'reconciliation' | 'remarks' | 'signatures' | 'photos'> { }

class DPR extends Model<DPRAttributes, DPRCreationAttributes> implements DPRAttributes {
    public id!: number;
    public siteId!: number;
    public userId!: number;
    public projectInfo!: any;
    public manpower!: any[];
    public workStarted!: any[];
    public equipment!: any[];
    public materials!: any[];
    public work!: any[];
    public reconciliation!: any[];
    public planTomorrow!: string;
    public remarks!: any;
    public signatures!: any;
    public photos!: string[];

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

DPR.init(
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
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: User,
                key: 'id'
            }
        },
        projectInfo: {
            type: DataTypes.JSON,
            allowNull: false,
            // Contains: projectName, location, dprNo, date, weather, temp
        },
        manpower: {
            type: DataTypes.JSON,
            defaultValue: [],
        },
        workStarted: {
            type: DataTypes.JSON,
            defaultValue: [],
        },
        equipment: {
            type: DataTypes.JSON,
            defaultValue: [],
        },
        materials: {
            type: DataTypes.JSON,
            defaultValue: [],
        },
        work: {
            type: DataTypes.JSON,
            defaultValue: [],
        },
        reconciliation: {
            type: DataTypes.JSON,
            defaultValue: [],
        },
        planTomorrow: {
            type: DataTypes.TEXT,
            defaultValue: '',
        },
        remarks: {
            type: DataTypes.JSON,
            defaultValue: {
                hindrances: '',
                safety: ''
            },
        },
        signatures: {
            type: DataTypes.JSON,
            defaultValue: {
                prepared: '',
                reviewed: '',
                approved: ''
            },
        },
        photos: {
            type: DataTypes.JSON, // Array of strings (URLs/Paths)
            defaultValue: [],
        },
    },
    {
        sequelize,
        tableName: 'dprs',
        indexes: [
            {
                // To allow fast lookups by site and date (which is inside projectInfo in JSON, 
                // but we can't easily index JSON fields in all SQL DBs universally without specific syntax.
                // For now, we rely on siteId index. 
                // Ideally, we'd extract `date` to a top-level column for indexing.)
                fields: ['siteId']
            }
        ]
    }
);

DPR.belongsTo(Site, { foreignKey: 'siteId', as: 'site' });
Site.hasMany(DPR, { foreignKey: 'siteId', as: 'dprs' });

DPR.belongsTo(User, { foreignKey: 'userId', as: 'creator' });
User.hasMany(DPR, { foreignKey: 'userId', as: 'dprs' });

export default DPR;
