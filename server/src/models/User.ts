import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/sequelize';
import bcrypt from 'bcryptjs';

interface UserAttributes {
    id: number;
    name: string;
    username: string;
    email: string;
    passwordHash: string;
    role: string;
    mobile?: string;
    salary?: number;
    permissions?: string[];
    permission?: string;
    modulePermissions?: any; // JSON
    sites?: any; // JSON for now, or association
    companyId?: number | null;
    companies?: any; // JSON or association
    createdAt?: Date;
    updatedAt?: Date;
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'mobile' | 'salary' | 'permissions' | 'permission' | 'modulePermissions' | 'sites' | 'companyId' | 'companies'> { }

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
    public id!: number;
    public name!: string;
    public username!: string;
    public email!: string;
    public passwordHash!: string;
    public role!: string;
    public mobile!: string;
    public salary!: number;
    public permissions!: string[];
    public permission!: string;
    public modulePermissions!: any;
    public sites!: any; // Storing as JSON array of IDs for simplicity in migration
    public companyId!: number | null;
    public companies!: any; // Storing as JSON array of IDs

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    public async matchPassword(enteredPassword: string): Promise<boolean> {
        return await bcrypt.compare(enteredPassword, this.passwordHash);
    }
}

User.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        username: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        passwordHash: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        role: {
            type: DataTypes.STRING,
            defaultValue: 'User',
        },
        mobile: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        salary: {
            type: DataTypes.FLOAT,
            allowNull: true,
        },
        permissions: {
            type: DataTypes.JSON, // Array of strings
            defaultValue: [],
        },
        permission: {
            type: DataTypes.STRING,
            defaultValue: 'view_edit',
        },
        modulePermissions: {
            type: DataTypes.JSON, // Map/Object
            defaultValue: {},
            get() {
                const rawValue = this.getDataValue('modulePermissions');
                if (typeof rawValue === 'string') {
                    try {
                        return JSON.parse(rawValue);
                    } catch (e) {
                        return {};
                    }
                }
                return rawValue || {};
            }
        },
        sites: {
            type: DataTypes.JSON,
            defaultValue: [],
            get() {
                const rawValue = this.getDataValue('sites');
                if (typeof rawValue === 'string') {
                    try {
                        return JSON.parse(rawValue);
                    } catch (e) {
                        return [];
                    }
                }
                return rawValue || [];
            }
        },
        companyId: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        companies: {
            type: DataTypes.JSON, // Array of IDs
            defaultValue: [],
            get() {
                const rawValue = this.getDataValue('companies');
                if (typeof rawValue === 'string') {
                    try {
                        return JSON.parse(rawValue);
                    } catch (e) {
                        return [];
                    }
                }
                return rawValue || [];
            }
        },
    },
    {
        sequelize,
        tableName: 'users',
        hooks: {
            beforeSave: async (user: User) => {
                if (user.changed('passwordHash')) {
                    const salt = await bcrypt.genSalt(10);
                    user.passwordHash = await bcrypt.hash(user.passwordHash, salt);
                }
            },
        },
    }
);

export default User;
