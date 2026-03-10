import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/sequelize';
import Site from './Site';

interface ProjectTaskAttributes {
    id: number;
    siteId: number;
    title: string;
    description?: string;
    startDate?: Date;
    endDate?: Date;
    status: string;
    assignedTo?: string;
    priority?: string;
    color?: string;
    progress?: number;
    createdAt?: Date;
    updatedAt?: Date;
}

interface ProjectTaskCreationAttributes extends Optional<ProjectTaskAttributes, 'id' | 'description' | 'startDate' | 'endDate' | 'status' | 'assignedTo' | 'priority' | 'color' | 'progress'> { }

class ProjectTask extends Model<ProjectTaskAttributes, ProjectTaskCreationAttributes> implements ProjectTaskAttributes {
    public id!: number;
    public siteId!: number;
    public title!: string;
    public description!: string;
    public startDate!: Date;
    public endDate!: Date;
    public status!: string;
    public assignedTo!: string;
    public priority!: string;
    public color!: string;
    public progress!: number;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

ProjectTask.init(
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
        title: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        startDate: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        endDate: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        status: {
            type: DataTypes.STRING,
            defaultValue: 'Pending',
        },
        assignedTo: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        priority: {
            type: DataTypes.STRING,
            defaultValue: 'Medium',
        },
        color: {
            type: DataTypes.STRING,
            defaultValue: '#3b82f6',
        },
        progress: {
            type: DataTypes.FLOAT,
            defaultValue: 0,
        },
    },
    {
        sequelize,
        tableName: 'project_tasks',
    }
);

ProjectTask.belongsTo(Site, { foreignKey: 'siteId', as: 'site' });
Site.hasMany(ProjectTask, { foreignKey: 'siteId', as: 'projectTasks' });

export default ProjectTask;
