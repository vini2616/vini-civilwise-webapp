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
var inspectOwnership = function () { return __awaiter(void 0, void 0, void 0, function () {
    var user_1, companies, sites, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, (0, db_1.default)()];
            case 1:
                _a.sent();
                _a.label = 2;
            case 2:
                _a.trys.push([2, 6, 7, 9]);
                console.log('--- Inspecting User ---');
                return [4 /*yield*/, User_1.default.findOne({ username: 'vini' })];
            case 3:
                user_1 = _a.sent();
                if (!user_1) {
                    console.log('User "vini" NOT FOUND.');
                }
                else {
                    console.log("User \"vini\" found:");
                    console.log(" - ID: ".concat(user_1._id));
                    console.log(" - Role: ".concat(user_1.role));
                    console.log(" - Companies Array: ".concat(user_1.companies));
                    console.log(" - Company ID: ".concat(user_1.companyId));
                }
                console.log('\n--- Inspecting Companies (First 5) ---');
                return [4 /*yield*/, Company_1.default.find().limit(5)];
            case 4:
                companies = _a.sent();
                if (companies.length === 0) {
                    console.log('No companies found.');
                }
                else {
                    companies.forEach(function (comp) {
                        console.log("Company: ".concat(comp.name, " (_id: ").concat(comp._id, ")"));
                        console.log(" - Owner ID: ".concat(comp.ownerId));
                        if (user_1 && comp.ownerId && comp.ownerId.toString() !== user_1._id.toString()) {
                            console.log('   [MISMATCH] Owned by different ID');
                        }
                        else if (user_1 && comp.ownerId) {
                            console.log('   [MATCH] Owned by current user');
                        }
                    });
                }
                console.log('\n--- Inspecting Sites (First 5) ---');
                return [4 /*yield*/, Site_1.default.find().limit(5)];
            case 5:
                sites = _a.sent();
                if (sites.length === 0) {
                    console.log('No sites found.');
                }
                else {
                    sites.forEach(function (site) {
                        console.log("Site: ".concat(site.name, " (_id: ").concat(site._id, ")"));
                        console.log(" - Company ID: ".concat(site.companyId));
                    });
                }
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
inspectOwnership();
