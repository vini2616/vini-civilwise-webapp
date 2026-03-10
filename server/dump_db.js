"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var dotenv_1 = __importDefault(require("dotenv"));
var mongoose_1 = __importDefault(require("mongoose"));
var db_1 = __importDefault(require("./src/config/db"));
var User_1 = __importDefault(require("./src/models/User"));
var Company_1 = __importDefault(require("./src/models/Company"));
var Site_1 = __importDefault(require("./src/models/Site"));
dotenv_1.default.config();
var dumpDB = function () { return __awaiter(void 0, void 0, void 0, function () {
    var users, companies, sites, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, (0, db_1.default)()];
            case 1:
                _a.sent();
                _a.label = 2;
            case 2:
                _a.trys.push([2, 6, 7, 9]);
                console.log('--- DB DUMP START ---');
                console.log("URI: ".concat(process.env.MONGO_URI));
                return [4 /*yield*/, User_1.default.find({})];
            case 3:
                users = _a.sent();
                console.log("\nTOTAL USERS: ".concat(users.length));
                users.forEach(function (u) { var _a; return console.log(" [User] ".concat(u.username, " (ID: ").concat(u._id, ") - Companies: ").concat(((_a = u.companies) === null || _a === void 0 ? void 0 : _a.length) || 0)); });
                return [4 /*yield*/, Company_1.default.find({})];
            case 4:
                companies = _a.sent();
                console.log("\nTOTAL COMPANIES: ".concat(companies.length));
                companies.forEach(function (c) { return console.log(" [Comp] ".concat(c.name, " (ID: ").concat(c._id, ") - Owner: ").concat(c.ownerId)); });
                return [4 /*yield*/, Site_1.default.find({})];
            case 5:
                sites = _a.sent();
                console.log("\nTOTAL SITES: ".concat(sites.length));
                sites.forEach(function (s) { return console.log(" [Site] ".concat(s.name, " (ID: ").concat(s._id, ") - Company: ").concat(s.companyId)); });
                console.log('--- DB DUMP END ---');
                return [3 /*break*/, 9];
            case 6:
                error_1 = _a.sent();
                console.error('Error:', error_1);
                return [3 /*break*/, 9];
            case 7: return [4 /*yield*/, mongoose_1.default.disconnect()];
            case 8:
                _a.sent();
                process.exit();
                return [7 /*endfinally*/];
            case 9: return [2 /*return*/];
        }
    });
}); };
dumpDB();
